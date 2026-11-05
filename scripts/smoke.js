/**
 * 零依赖冒烟测试：用最小 DOM stub 驱动真实的 UMD 产物，
 * 验证「悬浮按钮 -> 点击初始化抽屉 -> 关闭只隐藏不销毁 -> 再次点击重新显示」
 * 的核心状态机与 postMessage 行为。
 *
 * 运行：npm test（会先构建）
 */
'use strict';

const assert = require('assert');
const path = require('path');

// ---------- 最小 DOM / window stub ----------
const windowMsgs = [];
const frameMsgs = [];
let iframeCreateCount = 0;

function makeEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    style: {},
    children: [],
    _parent: null,
    classList: {
      _set: new Set(),
      add(c) {
        this._set.add(c);
      },
      remove(c) {
        this._set.delete(c);
      },
      contains(c) {
        return this._set.has(c);
      },
    },
    listeners: {},
    addEventListener(type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = this.listeners[type] || [];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    appendChild(child) {
      child._parent = this;
      child.isConnected = true;
      this.children.push(child);
      return child;
    },
    remove() {
      if (this._parent) {
        const arr = this._parent.children;
        const i = arr.indexOf(this);
        if (i >= 0) arr.splice(i, 1);
      }
      this.isConnected = false;
    },
    setPointerCapture() {},
    hasPointerCapture() {
      return false;
    },
    releasePointerCapture() {},
    getBoundingClientRect() {
      return { width: parseInt(this.style.width, 10) || 300 };
    },
    attachShadow() {
      const shadow = {
        innerHTML: '',
        _els: {},
        querySelector(sel) {
          if (!this._els[sel]) this._els[sel] = makeEl('div');
          return this._els[sel];
        },
      };
      el.shadowRoot = shadow;
      return shadow;
    },
  };
  if (tag === 'iframe') {
    iframeCreateCount += 1;
    el.contentWindow = {
      postMessage(msg, targetOrigin) {
        frameMsgs.push({ msg, targetOrigin });
      },
    };
  }
  return el;
}

const body = makeEl('body');
body.isConnected = true;

global.document = {
  createElement: makeEl,
  body,
  documentElement: body,
  visibilityState: 'visible',
  listeners: {},
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  },
  removeEventListener(type, fn) {
    const arr = this.listeners[type] || [];
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  },
};
global.window = {
  innerWidth: 1280,
  innerHeight: 800,
  location: { href: 'https://host.example.com/' },
  listeners: {},
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  },
  removeEventListener(type, fn) {
    const arr = this.listeners[type] || [];
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  },
  postMessage(msg, targetOrigin) {
    windowMsgs.push({ msg, targetOrigin });
  },
};

// ---------- 加载 UMD 产物 ----------
const { createDrawer } = require(path.join(__dirname, '..', 'dist', 'ckc-expert-agent.umd.js'));

function pointerEvent(x, y, buttons = 1) {
  return {
    pointerType: 'mouse',
    button: 0,
    buttons,
    pointerId: 1,
    clientX: x,
    clientY: y,
    preventDefault() {},
  };
}

/** 模拟 window 上的任意事件（pointermove / pointerup / blur 等；拖拽监听挂在 window 上兜底） */
function dispatchWindowEvent(type, ev) {
  (global.window.listeners[type] || []).slice().forEach((fn) => fn(ev));
}

/** 模拟 document 的事件（visibilitychange 等） */
function dispatchDocEvent(type) {
  (global.document.listeners[type] || []).slice().forEach((fn) => fn());
}

/** 模拟在悬浮按钮上按下并原地松开（= 点击） */
function clickLauncher(host) {
  host.listeners.pointerdown[0](pointerEvent(500, 700));
  dispatchWindowEvent('pointerup', pointerEvent(500, 700));
}

/** 模拟在悬浮按钮上按下并水平拖动 dx 后松开（= 拖动） */
function dragLauncher(host, dx) {
  host.listeners.pointerdown[0](pointerEvent(500, 700));
  dispatchWindowEvent('pointermove', pointerEvent(500 + dx, 700));
  dispatchWindowEvent('pointerup', pointerEvent(500 + dx, 700));
}

/** 模拟 window 的 message 事件（如 iframe 调用 parent.postMessage 发来的） */
function dispatchWindowMessage(source, data) {
  (global.window.listeners.message || []).slice().forEach((fn) => fn({ source, data }));
}

// ---------- 断言 ----------

// window 只挂载 createCkcDrawer，显隐走 DrawerHandle
assert.strictEqual(typeof global.window.createCkcDrawer, 'function');
assert.strictEqual(global.window.openCkcDrawer, undefined);
assert.strictEqual(global.window.closeCkcDrawer, undefined);

// 缺 env / 非法 env / 缺 token / 缺 agentCode 抛错
assert.throws(() => createDrawer(), /options\.env/);
assert.throws(() => createDrawer({}), /options\.env/);
assert.throws(() => createDrawer({ env: 'test', token: 't', agentCode: 'a' }), /options\.env/);
assert.throws(() => createDrawer({ env: 'dev' }), /options\.token/);
assert.throws(() => createDrawer({ env: 'dev', token: '' }), /options\.token/);
assert.throws(() => createDrawer({ env: 'dev', token: 't' }), /options\.agentCode/);
assert.throws(() => createDrawer({ env: 'dev', token: 't', agentCode: '' }), /options\.agentCode/);

const drawer = createDrawer({
  env: 'dev',
  token: 'abc123',
  agentCode: 'agent-01',
  sessionId: 'sess-01',
  payload: {
    message: '你好',
    files: [{ name: 'a.png', url: 'https://cdn/a.png', type: 'image/png' }],
  },
});

// 收发消息统一走 DrawerHandle 固定方法（sendMessage / receiveFiles / receiveSessionId / onVisibilityChange）
const gotFiles = [];
const gotSessionIds = [];
const gotVisibility = [];
const offFiles = drawer.receiveFiles((files) => gotFiles.push(files));
drawer.receiveSessionId((sessionId) => gotSessionIds.push(sessionId));
drawer.onVisibilityChange((visible) => gotVisibility.push(visible));

// 初始：只有悬浮圆形按钮，抽屉未初始化
assert.strictEqual(drawer.iframe, null);
assert.strictEqual(body.children.length, 1);

// 拖动悬浮按钮：只移动位置，不打开抽屉（初始 left=1208，拖 120 后被夹到 1232）
const launcherHost = body.children[0];
dragLauncher(launcherHost, 120);
assert.strictEqual(launcherHost.style.left, '1232px');
assert.strictEqual(body.children.length, 1);
assert.strictEqual(drawer.iframe, null);

// 悬浮按钮拖拽同样有事件丢失兜底：pointerup 丢失时 buttons=0 的 move 自动收尾，且不误触发打开
launcherHost.listeners.pointerdown[0](pointerEvent(500, 700));
dispatchWindowEvent('pointermove', pointerEvent(560, 700, 0));
assert.strictEqual(launcherHost.classList.contains('ckc-launcher--dragging'), false);
assert.strictEqual(launcherHost.style.left, '1232px', '收尾的 move 不应移动按钮');
assert.strictEqual(body.children.length, 1, '事件丢失收尾不应触发打开抽屉');

// 点击悬浮按钮：初始化并显示抽屉
clickLauncher(launcherHost);
assert.ok(drawer.iframe, '打开后 iframe 应存在');
assert.strictEqual(iframeCreateCount, 1, 'iframe 只应创建一次');
assert.strictEqual(body.children.length, 2);
const drawerHost = body.children[1];
// 隐藏不使用 display:none（保留布局盒子，滚动状态才留得住）
assert.strictEqual(drawerHost.style.display, undefined);
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), false);
assert.strictEqual(drawerHost.inert, false);
// 默认宽度 500px
assert.strictEqual(drawerHost.style.width, '500px');
// 最终 iframe 地址：{域名}/center/thd/chat/{agentCode}/{sessionId}?token={token}
assert.strictEqual(
  drawer.iframe.src,
  'http://lf18kg-dev.life.cpic.com/center/thd/chat/agent-01/sess-01?token=abc123',
);
const frame = drawer.iframe;

// sendMessage 在 iframe 加载完成前调用：排队，加载后补发
drawer.sendMessage({ message: '早安', files: [] });

const toFrame = (t) => frameMsgs.filter((m) => m.msg.type === t);

// iframe 加载完成前不发任何消息：发给 about:blank/未加载文档会因 origin 不匹配抛错
assert.strictEqual(toFrame('drawer-init').length, 0);
assert.strictEqual(toFrame('drawer-visibility-change').length, 0);

// iframe 加载完成：发预置 payload（drawer-init）+ 当前显隐，再补发排队的 sendMessage
frame.listeners.load[0]();
const initMsg = frameMsgs.find((m) => m.msg.type === 'drawer-init');
assert.deepStrictEqual(initMsg.msg.payload, {
  message: '你好',
  files: [{ name: 'a.png', url: 'https://cdn/a.png', type: 'image/png' }],
});
assert.strictEqual(initMsg.targetOrigin, 'http://lf18kg-dev.life.cpic.com');
assert.deepStrictEqual(
  toFrame('drawer-visibility-change').map((m) => m.msg.visible),
  [true],
);
assert.deepStrictEqual(
  toFrame('drawer-message').map((m) => m.msg.payload),
  [{ message: '早安', files: [] }],
);

// iframe 加载后 sendMessage：立即直发固定协议消息
const sendPayload = {
  message: '你好',
  files: [{ name: 'report.pdf', url: 'https://example.com/report.pdf', type: 'pdf' }],
};
drawer.sendMessage(sendPayload);
assert.deepStrictEqual(
  toFrame('drawer-message').map((m) => m.msg.payload),
  [{ message: '早安', files: [] }, sendPayload],
);
assert.ok(
  toFrame('drawer-message').every((m) => m.targetOrigin === 'http://lf18kg-dev.life.cpic.com'),
);

// receiveFiles（接受产物文件）：只接受本抽屉 iframe 发来的 drawer-files（payload 为 DrawerFile[]）
const artifactFiles = [{ name: 'report.pdf', url: 'https://example.com/report.pdf', type: 'pdf' }];
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-files',
  payload: artifactFiles,
});
assert.deepStrictEqual(gotFiles, [artifactFiles]);

// 非协议消息 / drawer-message 类型 / 非本 iframe 来源 / 非法 payload：一律丢弃
dispatchWindowMessage(frame.contentWindow, {
  source: 'other',
  type: 'drawer-files',
  payload: artifactFiles,
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'other',
  payload: artifactFiles,
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-message', // receiveFiles 不再接受 drawer-message 类型
  payload: artifactFiles,
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-files',
  payload: { message: 'x', files: [] },
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-files',
  payload: [{ name: 1, url: 'u', type: 't' }],
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-files',
  payload: 'x',
});
dispatchWindowMessage(
  {},
  { source: 'ckc-expert-agent', type: 'drawer-files', payload: artifactFiles },
);
assert.strictEqual(gotFiles.length, 1, '非法消息不应派发给 receiveFiles');

// 取消监听后不再收到
offFiles();
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-files',
  payload: [{ name: 'other.pdf', url: 'https://example.com/o.pdf', type: 'pdf' }],
});
assert.strictEqual(gotFiles.length, 1);

// receiveSessionId（接收 sessionId）：只接受本抽屉 iframe 发来的 drawer-session（payload 为 sessionId 字符串）
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-session',
  payload: 'sess-gen-01',
});
assert.deepStrictEqual(gotSessionIds, ['sess-gen-01']);

// 非法 payload / 其他来源 / 非 drawer-session 类型：一律丢弃
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-session',
  payload: '',
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-session',
  payload: 123,
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-files',
  payload: 'sess-gen-01',
});
dispatchWindowMessage(
  {},
  { source: 'ckc-expert-agent', type: 'drawer-session', payload: 'sess-gen-01' },
);
assert.strictEqual(gotSessionIds.length, 1, '非法消息不应派发给 receiveSessionId');

// 点击抽屉右上角关闭按钮：只隐藏，不销毁
const closeBtn = drawerHost.shadowRoot.querySelector('.close-btn');
assert.ok(closeBtn.listeners.click && closeBtn.listeners.click.length === 1);
closeBtn.listeners.click[0]();
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), true);
assert.strictEqual(drawerHost.inert, true);
assert.strictEqual(body.children.length, 2, '隐藏后抽屉 DOM 仍应存在');
assert.strictEqual(drawer.iframe, frame, 'iframe 未重建（内容继续运行）');

// DrawerHandle.open()：重新显示同一个抽屉
drawer.open();
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), false);
assert.strictEqual(drawerHost.inert, false);
assert.strictEqual(drawer.iframe, frame);
assert.strictEqual(iframeCreateCount, 1, '重新显示不应重建 iframe');

// DrawerHandle.close()：隐藏（不销毁）
drawer.close();
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), true);
assert.strictEqual(drawerHost.inert, true);
assert.strictEqual(body.children.length, 2);

// 再次点击悬浮按钮：重新显示
clickLauncher(launcherHost);
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), false);

// setWidth
drawer.setWidth(500);
assert.strictEqual(drawerHost.style.width, '500px');

// 拖动左边框调整宽度：向左拖变宽；拖拽期间 iframe 置 pointer-events:none，move/up 不会被 iframe 吞掉
const resizeHandle = drawerHost.shadowRoot.querySelector('.resize-handle');
resizeHandle.listeners.pointerdown[0](pointerEvent(1000, 400));
assert.strictEqual(frame.style.pointerEvents, 'none');
dispatchWindowEvent('pointermove', pointerEvent(980, 400));
assert.strictEqual(drawerHost.style.width, '520px');
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--dragging'), true);

// pointerup 丢失（弱网/云桌面）：下一次 move 的 buttons 为 0 自动收尾，不卡在拖拽状态
dispatchWindowEvent('pointermove', pointerEvent(960, 400, 0));
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--dragging'), false);
assert.strictEqual(drawerHost.style.width, '520px');
assert.ok(!frame.style.pointerEvents, '收尾后恢复 iframe 指针事件');
dispatchWindowEvent('pointermove', pointerEvent(900, 400));
assert.strictEqual(drawerHost.style.width, '520px', '收尾后不再响应 move');

// 正常拖拽：宽度按起点绝对值计算（丢 move 不累积误差），pointerup 收尾
resizeHandle.listeners.pointerdown[0](pointerEvent(1000, 400));
dispatchWindowEvent('pointermove', pointerEvent(990, 400));
dispatchWindowEvent('pointerup', pointerEvent(990, 400));
assert.strictEqual(drawerHost.style.width, '530px');
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--dragging'), false);

// 拖拽中窗口失焦（云桌面切窗口）：强制收尾
resizeHandle.listeners.pointerdown[0](pointerEvent(1000, 400));
dispatchWindowEvent('blur', {});
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--dragging'), false);

// 拖拽中页面隐藏（visibilitychange）：强制收尾
resizeHandle.listeners.pointerdown[0](pointerEvent(1000, 400));
global.document.visibilityState = 'hidden';
dispatchDocEvent('visibilitychange');
global.document.visibilityState = 'visible';
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--dragging'), false);

// postMessage 失败（iframe 停在错误页/沙箱页，origin 为 'null'）：内部吞掉不抛给宿主，
// 消息排队，iframe 重新加载后补发（复现接入方 "Failed to execute 'postMessage'" 报错场景）
const origPost = frame.contentWindow.postMessage;
frame.contentWindow.postMessage = () => {
  throw new Error("Failed to execute 'postMessage' on 'DOMWindow'");
};
assert.doesNotThrow(() => drawer.sendMessage({ message: '弱网时的消息', files: [] }));
assert.doesNotThrow(() => drawer.close());
assert.doesNotThrow(() => drawer.open());
frame.contentWindow.postMessage = origPost;
assert.strictEqual(toFrame('drawer-message').length, 2, '发送失败的消息不计入已发消息');

// iframe 重新加载（刷新/恢复，每个新文档）：重发 drawer-init + 当前显隐，补发失败的 sendMessage
frame.listeners.load[0]();
assert.strictEqual(toFrame('drawer-init').length, 2, 'iframe 重新加载后重发 drawer-init');
assert.strictEqual(toFrame('drawer-message').length, 3, '发送失败的 sendMessage 重新加载后补发');
assert.deepStrictEqual(toFrame('drawer-message').map((m) => m.msg.payload)[2], {
  message: '弱网时的消息',
  files: [],
});

// destroy：悬浮按钮和抽屉全部移除，handle 不再动作
drawer.destroy();
assert.strictEqual(body.children.length, 0);
assert.strictEqual(drawer.iframe, null);
drawer.open();
drawer.sendMessage({ message: 'x', files: [] });
assert.strictEqual(body.children.length, 0);
assert.strictEqual(toFrame('drawer-message').length, 3, '销毁后 sendMessage 不再发消息');
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-files',
  payload: artifactFiles,
});
assert.strictEqual(gotFiles.length, 1, '销毁后消息监听已解绑');
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-session',
  payload: 'sess-gen-02',
});
assert.strictEqual(gotSessionIds.length, 1, '销毁后 sessionId 监听已解绑');

// iframe 侧显隐 postMessage：
// [首开补发, 关闭按钮, handle 开, handle 关, 再次打开, iframe 重新加载补发当前状态, 销毁时隐藏]
const visibilitySeq = (msgs) =>
  msgs.filter((m) => m.msg.type === 'drawer-visibility-change').map((m) => m.msg.visible);
assert.deepStrictEqual(visibilitySeq(frameMsgs), [true, false, true, false, true, true, false]);
assert.ok(frameMsgs.every((m) => m.targetOrigin === 'http://lf18kg-dev.life.cpic.com'));

// 宿主侧显隐走 onVisibilityChange 回调：只在真实变化时触发（重新加载补发不重复回调），
// 不再向 window 广播原始 postMessage
assert.deepStrictEqual(gotVisibility, [
  true, // 首开
  false, // 关闭按钮
  true, // handle.open()
  false, // handle.close()
  true, // 再次点击悬浮按钮
  false, // postMessage 失败期间 close()
  true, // postMessage 失败期间 open()
  false, // destroy
]);
assert.strictEqual(windowMsgs.length, 0, '宿主不再收到原始 postMessage 广播');

// 环境 → 域名映射；不传 sessionId 时不拼该路径段；agentCode 含特殊字符时做路径编码
const envCases = [
  ['dev', 'http://lf18kg-dev.life.cpic.com'],
  ['sit', 'http://lf18kg-sit.life.cpic.com'],
  ['pro', 'http://lf18kg.life.cpic.com'],
  ['local', 'http://localhost:4173'],
];
for (const [env, domain] of envCases) {
  const d = createDrawer({ env, token: 't0', agentCode: 'a c0' });
  d.open();
  assert.strictEqual(d.iframe.src, `${domain}/center/thd/chat/a%20c0?token=t0`);
  d.destroy();
}

console.log('smoke: all assertions passed');
