/**
 * 零依赖冒烟测试：用最小 DOM stub 驱动真实的 UMD 产物，
 * 验证「悬浮按钮 -> 点击初始化抽屉 -> 关闭只隐藏不销毁 -> 再次点击重新显示」
 * 的核心状态机与 postMessage 行为。
 *
 * 运行：npm test（会先构建）
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
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

// 捕获 setTimeout/clearTimeout：用于手动触发/验证加载动画兜底定时器
const fakeTimers = [];
global.setTimeout = (fn, ms) => {
  fakeTimers.push({ fn, ms, cleared: false });
  return fakeTimers.length; // 1-based id
};
global.clearTimeout = (id) => {
  const t = fakeTimers[id - 1];
  if (t) t.cleared = true;
};

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

// 收发消息统一走 DrawerHandle 固定方法（sendMessage / receiveMessage / receiveSessionId / onVisibilityChange）
const gotMessages = [];
const gotSessionIds = [];
const gotVisibility = [];
const offMessage = drawer.receiveMessage((message) => gotMessages.push(message));
drawer.receiveSessionId((sessionId) => gotSessionIds.push(sessionId));
drawer.onVisibilityChange((visible) => gotVisibility.push(visible));

// 初始：只有悬浮圆形按钮，抽屉未初始化
assert.strictEqual(drawer.iframe, null);
assert.strictEqual(drawer.isOpen, false, '未初始化时 isOpen 为 false');
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
assert.strictEqual(drawer.isOpen, true, '打开后 isOpen 为 true');
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
// iframe 带 allow="focus"（允许 iframe 内页面获取焦点）
assert.strictEqual(drawer.iframe.allow, 'focus');
const frame = drawer.iframe;

// iframe 就绪前：抽屉内显示加载动画，避免 iframe 初始化慢时长时间空白
const loader = drawerHost.shadowRoot.querySelector('.loader');
assert.strictEqual(loader.classList.contains('ckc-loader--hidden'), false);

// 加载动画兜底定时器已武装（超时未就绪也会停止动画，避免一直转圈）
const loaderTimer = fakeTimers[fakeTimers.length - 1];
assert.strictEqual(loaderTimer.ms, 10000);
assert.strictEqual(loaderTimer.cleared, false);

// sendMessage 在 iframe 就绪前调用：排队，就绪后补发
drawer.sendMessage({ message: '早安', files: [] });

const toFrame = (t) => frameMsgs.filter((m) => m.msg.type === t);

// iframe 就绪前不发任何消息：加载成功由 iframe 发 drawer-ready 判定，不靠 load 事件
assert.strictEqual(toFrame('drawer-init').length, 0);
assert.strictEqual(toFrame('drawer-visibility-change').length, 0);

// 非本 iframe 来源 / 非协议来源的就绪消息：忽略，不触发补发
dispatchWindowMessage({}, { source: 'ckc-expert-agent', type: 'drawer-ready' });
dispatchWindowMessage(frame.contentWindow, { source: 'other', type: 'drawer-ready' });
assert.strictEqual(toFrame('drawer-init').length, 0);

// iframe 发来 drawer-ready（就绪消息）：发预置 payload（drawer-init）+ 当前显隐，再补发排队的 sendMessage
dispatchWindowMessage(frame.contentWindow, { source: 'ckc-expert-agent', type: 'drawer-ready' });
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
assert.strictEqual(loader.classList.contains('ckc-loader--hidden'), true, '收到 drawer-ready 后隐藏加载动画');
assert.strictEqual(loaderTimer.cleared, true, '收到 drawer-ready 后取消兜底定时器');

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

// receiveMessage（接收消息）：只接受本抽屉 iframe 发来的 drawer-message（payload 为 {message, files, ...其它附带字段}）
const artifactMsg = {
  message: '分析完成',
  files: [{ name: 'report.pdf', url: 'https://example.com/report.pdf', type: 'pdf' }],
  score: 95, // 其它附带字段，原样透传
};
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  payload: artifactMsg,
});
assert.deepStrictEqual(gotMessages, [artifactMsg]);

// 非协议消息 / 非法 payload / 非本 iframe 来源：一律丢弃
dispatchWindowMessage(frame.contentWindow, {
  source: 'other',
  type: 'drawer-message',
  payload: artifactMsg,
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'other',
  payload: artifactMsg,
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-files', // 旧产物文件类型已废弃，不再接受
  payload: artifactMsg.files,
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  payload: artifactMsg.files, // 旧 DrawerFile[] 形态不是 {message, files}
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  payload: 'x',
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  payload: { files: [] }, // 缺 message
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  payload: { message: 123, files: [] }, // message 不是字符串
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  payload: { message: 'x', files: [{ name: 1, url: 'u', type: 't' }] }, // files 含非法条目
});
dispatchWindowMessage(
  {},
  { source: 'ckc-expert-agent', type: 'drawer-message', payload: artifactMsg },
);
assert.strictEqual(gotMessages.length, 1, '非法消息不应派发给 receiveMessage');

// 取消监听后不再收到
offMessage();
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  payload: { message: 'x', files: [] },
});
assert.strictEqual(gotMessages.length, 1);

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

// 抽屉不再有右上角关闭按钮（由 iframe 页 header 上的关闭按钮发 drawer-close 消息替代）
assert.ok(!drawerHost.shadowRoot.innerHTML.includes('close-btn'), '抽屉内不应再有关闭按钮');

// iframe 发 drawer-close（header 关闭按钮）：只隐藏，不销毁（与原关闭按钮功能一致）
dispatchWindowMessage({}, { source: 'ckc-expert-agent', type: 'drawer-close' });
dispatchWindowMessage(frame.contentWindow, { source: 'other', type: 'drawer-close' });
assert.strictEqual(
  drawerHost.classList.contains('ckc-drawer--hidden'),
  false,
  '非本 iframe 来源 / 非协议来源的关闭消息应忽略',
);
dispatchWindowMessage(frame.contentWindow, { source: 'ckc-expert-agent', type: 'drawer-close' });
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), true);
assert.strictEqual(drawer.isOpen, false, '关闭后 isOpen 为 false');
assert.strictEqual(drawerHost.inert, true);
assert.strictEqual(body.children.length, 2, '隐藏后抽屉 DOM 仍应存在');
assert.strictEqual(drawer.iframe, frame, 'iframe 未重建（内容继续运行）');

// DrawerHandle.open()：重新显示同一个抽屉
drawer.open();
assert.strictEqual(drawer.isOpen, true, 'handle.open() 后 isOpen 为 true');
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), false);
assert.strictEqual(drawerHost.inert, false);
assert.strictEqual(drawer.iframe, frame);
assert.strictEqual(iframeCreateCount, 1, '重新显示不应重建 iframe');

// DrawerHandle.close()：隐藏（不销毁）
drawer.close();
assert.strictEqual(drawer.isOpen, false, 'handle.close() 后 isOpen 为 false');
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

// iframe 发 drawer-fullscreen（header 全屏按钮）：宽度调整为最大值 / 恢复默认值
assert.strictEqual(drawerHost.style.width, '530px', '前置：当前宽度为拖拽后的 530px');
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-fullscreen',
  fullscreen: true,
});
assert.strictEqual(drawerHost.style.width, '1280px', '全屏 = 最大宽度（默认视口宽度）');
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-fullscreen',
  fullscreen: false,
});
assert.strictEqual(drawerHost.style.width, '500px', '取消全屏 = 恢复默认宽度');
// 非法 payload（fullscreen 非布尔）/ 非本 iframe 来源 / 非协议来源：一律忽略
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-fullscreen',
  fullscreen: 'yes',
});
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-fullscreen',
});
dispatchWindowMessage(
  {},
  { source: 'ckc-expert-agent', type: 'drawer-fullscreen', fullscreen: true },
);
assert.strictEqual(drawerHost.style.width, '500px', '非法全屏消息不应改变宽度');

// postMessage 失败（iframe 停在错误页/沙箱页，origin 为 'null'）：内部吞掉不抛给宿主，
// 消息排队，iframe 重新就绪后补发（复现接入方 "Failed to execute 'postMessage'" 报错场景）
const origPost = frame.contentWindow.postMessage;
frame.contentWindow.postMessage = () => {
  throw new Error("Failed to execute 'postMessage' on 'DOMWindow'");
};
assert.doesNotThrow(() => drawer.sendMessage({ message: '弱网时的消息', files: [] }));
assert.doesNotThrow(() => drawer.close());
assert.doesNotThrow(() => drawer.open());
frame.contentWindow.postMessage = origPost;
assert.strictEqual(toFrame('drawer-message').length, 2, '发送失败的消息不计入已发消息');

// iframe 重新初始化（如刷新后）再次发就绪消息：重发 drawer-init + 当前显隐，补发失败的 sendMessage
dispatchWindowMessage(frame.contentWindow, { source: 'ckc-expert-agent', type: 'drawer-ready' });
assert.strictEqual(toFrame('drawer-init').length, 2, 'iframe 重新就绪后重发 drawer-init');
assert.strictEqual(toFrame('drawer-message').length, 3, '发送失败的 sendMessage 就绪后补发');
assert.deepStrictEqual(toFrame('drawer-message').map((m) => m.msg.payload)[2], {
  message: '弱网时的消息',
  files: [],
});

// destroy：悬浮按钮和抽屉全部移除，handle 不再动作
drawer.destroy();
assert.strictEqual(body.children.length, 0);
assert.strictEqual(drawer.iframe, null);
assert.strictEqual(drawer.isOpen, false, '销毁后 isOpen 为 false');
drawer.open();
drawer.sendMessage({ message: 'x', files: [] });
assert.strictEqual(body.children.length, 0);
assert.strictEqual(toFrame('drawer-message').length, 3, '销毁后 sendMessage 不再发消息');
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  payload: artifactMsg,
});
assert.strictEqual(gotMessages.length, 1, '销毁后消息监听已解绑');
dispatchWindowMessage(frame.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-session',
  payload: 'sess-gen-02',
});
assert.strictEqual(gotSessionIds.length, 1, '销毁后 sessionId 监听已解绑');

// iframe 侧显隐 postMessage：
// [首开补发, iframe 发 drawer-close, handle 开, handle 关, 再次打开, iframe 重新加载补发当前状态, 销毁时隐藏]
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

// 加载动画兜底：超时未收到 drawer-ready（iframe 页面未实现就绪消息）也会停止动画，不至于一直转圈
const d2 = createDrawer({ env: 'dev', token: 't0', agentCode: 'a0' });
d2.open();
const timer2 = fakeTimers[fakeTimers.length - 1];
assert.strictEqual(timer2.ms, 10000);
const loader2 = body.children[1].shadowRoot.querySelector('.loader');
assert.strictEqual(loader2.classList.contains('ckc-loader--hidden'), false);
timer2.fn(); // 模拟超时
assert.strictEqual(loader2.classList.contains('ckc-loader--hidden'), true, '超时兜底停止加载动画');
d2.destroy();

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
  assert.strictEqual(body.children.length, 2, '默认不开启遮盖层（悬浮按钮 + 抽屉）');
  d.destroy();
}

// 遮盖层（options.mask）：开启后抽屉打开时盖住左侧页面区域，点击遮盖层关闭抽屉
const dm = createDrawer({ env: 'dev', token: 'tm', agentCode: 'am', mask: true });
dm.open();
assert.strictEqual(body.children.length, 3, '开启遮盖层后：悬浮按钮 + 遮盖层 + 抽屉');
const maskEl = body.children[1];
assert.strictEqual(maskEl.classList.contains('ckc-mask--hidden'), false, '打开时遮盖层显示');
maskEl.listeners.click[0](); // 点击遮盖层
assert.strictEqual(dm.isOpen, false, '点击遮盖层关闭抽屉');
assert.strictEqual(maskEl.classList.contains('ckc-mask--hidden'), true, '关闭后遮盖层隐藏');
dm.open();
assert.strictEqual(maskEl.classList.contains('ckc-mask--hidden'), false, '重新打开遮盖层恢复显示');
dm.destroy();
assert.strictEqual(body.children.length, 0, '销毁后遮盖层一并移除');

// 类名一致性：JS classList 操作的类必须在样式里有对应选择器（类名写错会让样式静默不生效）
const srcText = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.ts'), 'utf8');
const usedClasses = new Set();
for (const m of srcText.matchAll(/classList\.(?:add|remove)\('([^']+)'\)/g)) usedClasses.add(m[1]);
for (const cls of usedClasses) {
  assert.ok(srcText.includes('.' + cls), `样式缺少 .${cls} 选择器，classList 操作会静默失效`);
}

console.log('smoke: all assertions passed');
