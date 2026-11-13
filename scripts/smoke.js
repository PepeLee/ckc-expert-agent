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
    focus() {},
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
// 默认层级：抽屉 2147483647（浮在页面所有内容之上），悬浮按钮 2147483646（略低于抽屉）
assert.strictEqual(drawerHost.style.zIndex, '2147483647');
assert.strictEqual(launcherHost.style.zIndex, '2147483646');
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
// 可选 sessionId（唤起已有 agent 会话）/ directSend（是否直接发送）随消息原样传到 iframe
drawer.sendMessage({ message: '早安', files: [], sessionId: 'sess-old-00', directSend: true });

const toFrame = (t) => frameMsgs.filter((m) => m.msg.type === t);

// iframe 就绪前不发任何消息：加载成功由 iframe 发 drawer-ready 判定，不靠 load 事件
assert.strictEqual(toFrame('drawer-visibility-change').length, 0);

// 非本 iframe 来源 / 非协议来源的就绪消息：忽略，不触发补发
dispatchWindowMessage({}, { source: 'ckc-expert-agent', type: 'drawer-ready' });
dispatchWindowMessage(frame.contentWindow, { source: 'other', type: 'drawer-ready' });
assert.strictEqual(toFrame('drawer-visibility-change').length, 0);

// iframe 发来 drawer-ready（就绪消息）：先发配置（closeSessionOnClose），再发当前显隐，最后补发排队的 sendMessage
dispatchWindowMessage(frame.contentWindow, { source: 'ckc-expert-agent', type: 'drawer-ready' });
assert.deepStrictEqual(
  toFrame('drawer-config').map((m) => m.msg.payload),
  [{ closeSessionOnClose: false, newSessionOnLauncherOpen: false }],
  'drawer-ready 后发送配置消息（两个配置未传时均默认 false）',
);
assert.ok(
  frameMsgs.findIndex((m) => m.msg.type === 'drawer-config') <
    frameMsgs.findIndex((m) => m.msg.type === 'drawer-visibility-change'),
  '配置消息先于显隐消息发送',
);
// visible: true 的显隐消息带打开方式（openSource）：首开由点击悬浮图标触发
assert.deepStrictEqual(
  toFrame('drawer-visibility-change').map((m) => ({ visible: m.msg.visible, openSource: m.msg.openSource })),
  [{ visible: true, openSource: 'launcher' }],
);
assert.deepStrictEqual(
  toFrame('drawer-message').map((m) => m.msg.payload),
  [{ message: '早安', files: [], sessionId: 'sess-old-00', directSend: true }],
);
assert.strictEqual(loader.classList.contains('ckc-loader--hidden'), true, '收到 drawer-ready 后隐藏加载动画');
assert.strictEqual(loaderTimer.cleared, true, '收到 drawer-ready 后取消兜底定时器');

// iframe 加载后 sendMessage：立即直发固定协议消息
// 可选 sessionId（唤起已有 agent 会话）/ directSend（是否直接发送）随消息原样传到 iframe
const sendPayload = {
  message: '你好',
  files: [{ name: 'report.pdf', url: 'https://example.com/report.pdf', type: 'pdf' }],
  sessionId: 'sess-old-01',
  directSend: true,
};
drawer.sendMessage(sendPayload);
assert.deepStrictEqual(
  toFrame('drawer-message').map((m) => m.msg.payload),
  [
    { message: '早安', files: [], sessionId: 'sess-old-00', directSend: true },
    {
      message: '你好',
      files: [{ name: 'report.pdf', url: 'https://example.com/report.pdf', type: 'pdf' }],
      sessionId: 'sess-old-01',
      directSend: true,
    },
  ],
);
assert.ok(
  toFrame('drawer-message').every((m) => m.targetOrigin === 'http://lf18kg-dev.life.cpic.com'),
);

// receiveMessage（接收消息）：只接受本抽屉 iframe 发来的 drawer-message（payload 为 {message, files, ...其它附带字段}）
const artifactMsg = {
  message: '分析完成',
  files: [{ name: 'report.pdf', url: 'https://example.com/report.pdf', type: 'pdf' }],
  sessionId: 'sess-gen-01', // 可选会话 ID，原样透传
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

// iframe 发 drawer-fullscreen（header 全屏按钮）：宽度调整为最大值 / 最小值
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
assert.strictEqual(drawerHost.style.width, '500px', '取消全屏 = 最小宽度（minWidth 默认 500）');
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

// iframe 重新初始化（如刷新后）再次发就绪消息：重新发配置，补发当前显隐和失败的 sendMessage
dispatchWindowMessage(frame.contentWindow, { source: 'ckc-expert-agent', type: 'drawer-ready' });
assert.strictEqual(toFrame('drawer-config').length, 2, '重新就绪后重新发送配置消息');
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
// 打开方式（openSource）随 visible: true 的显隐消息发送、visible: false 不带：
// [首开点悬浮图标, 关闭按钮, handle.open(), handle.close(), 再点悬浮图标, 重新就绪补发（沿用失败期间 handle.open() 的方式）, 销毁]
assert.deepStrictEqual(
  frameMsgs.filter((m) => m.msg.type === 'drawer-visibility-change').map((m) => m.msg.openSource),
  ['launcher', undefined, 'handle', undefined, 'launcher', 'handle', undefined],
);
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

// sendMessage 自动打开抽屉：未初始化时调用即初始化并显示；iframe 未就绪先排队不发（就绪后补发，主流程已覆盖）
const dsa = createDrawer({ env: 'dev', token: 't-sa', agentCode: 'a-sa' });
assert.strictEqual(dsa.iframe, null, '前置：抽屉未初始化');
const frameMsgsBefore = frameMsgs.length;
dsa.sendMessage({ message: '先发消息', files: [] });
assert.ok(dsa.iframe, 'sendMessage 自动初始化抽屉');
assert.strictEqual(dsa.isOpen, true, 'sendMessage 自动打开抽屉');
assert.strictEqual(
  frameMsgs.slice(frameMsgsBefore).filter((m) => m.msg.type === 'drawer-message').length,
  0,
  'iframe 未就绪：排队不发送',
);
// 关闭后再 sendMessage：自动重新打开
dsa.close();
assert.strictEqual(dsa.isOpen, false, 'close 后 isOpen 为 false');
dsa.sendMessage({ message: '再发消息', files: [] });
assert.strictEqual(dsa.isOpen, true, 'sendMessage 自动重新打开抽屉');
assert.strictEqual(body.children.length, 2, 'sendMessage 不会重复创建 DOM');
dsa.destroy();
assert.strictEqual(body.children.length, 0, '销毁后移除全部 DOM');
dsa.sendMessage({ message: '销毁后', files: [] });
assert.strictEqual(body.children.length, 0, '销毁后 sendMessage 不再动作（不自动打开）');

// DrawerOptions 配置（closeSessionOnClose / newSessionOnLauncherOpen）：drawer-ready 后随 drawer-config 发给 iframe
const dcfg = createDrawer({
  env: 'dev',
  token: 't-cfg',
  agentCode: 'a-cfg',
  closeSessionOnClose: true,
  newSessionOnLauncherOpen: true,
});
dcfg.open();
const cfgMsgsBefore = frameMsgs.length;
dispatchWindowMessage(dcfg.iframe.contentWindow, { source: 'ckc-expert-agent', type: 'drawer-ready' });
assert.deepStrictEqual(
  frameMsgs
    .slice(cfgMsgsBefore)
    .filter((m) => m.msg.type === 'drawer-config')
    .map((m) => m.msg.payload),
  [{ closeSessionOnClose: true, newSessionOnLauncherOpen: true }],
  'closeSessionOnClose / newSessionOnLauncherOpen 为 true 时随 drawer-config 发给 iframe',
);
assert.deepStrictEqual(
  frameMsgs
    .slice(cfgMsgsBefore)
    .filter((m) => m.msg.type === 'drawer-visibility-change')
    .map((m) => m.msg.openSource),
  ['handle'],
  'handle.open() 打开方式为 handle',
);
dcfg.destroy();

// sendMessage 自动打开抽屉也算「用 DrawerHandle 的打开」：openSource 为 'handle'
const dsm = createDrawer({ env: 'dev', token: 't-sm', agentCode: 'a-sm' });
const smBefore = frameMsgs.length;
dsm.sendMessage({ message: '自动打开', files: [] });
dispatchWindowMessage(dsm.iframe.contentWindow, { source: 'ckc-expert-agent', type: 'drawer-ready' });
assert.deepStrictEqual(
  frameMsgs
    .slice(smBefore)
    .filter((m) => m.msg.type === 'drawer-visibility-change')
    .map((m) => ({ visible: m.msg.visible, openSource: m.msg.openSource })),
  [{ visible: true, openSource: 'handle' }],
  'sendMessage 自动打开的打开方式为 handle',
);
dsm.destroy();

// launcher: false：不生成悬浮图标入口（页面上没有悬浮按钮 DOM），抽屉仍可由 DrawerHandle 控制
const dnl = createDrawer({ env: 'dev', token: 't-nl', agentCode: 'a-nl', launcher: false });
assert.strictEqual(body.children.length, 0, 'launcher: false 时创建后不生成悬浮图标 DOM');
assert.strictEqual(dnl.iframe, null);
assert.strictEqual(dnl.isOpen, false);
// 无悬浮图标时 open() 仍初始化并打开抽屉（页面上只有抽屉）
dnl.open();
assert.ok(dnl.iframe, '无悬浮图标时 open() 仍初始化抽屉');
assert.strictEqual(dnl.isOpen, true, '无悬浮图标时 open() 仍打开抽屉');
assert.strictEqual(body.children.length, 1, '打开后页面上只有抽屉（无悬浮按钮）');
dnl.close();
assert.strictEqual(body.children.length, 1, '关闭只隐藏，抽屉 DOM 仍在');
// 无悬浮图标时 sendMessage 同样自动打开抽屉
dnl.sendMessage({ message: '无入口也能发', files: [] });
assert.strictEqual(dnl.isOpen, true, 'sendMessage 自动打开抽屉（不依赖悬浮图标）');
assert.strictEqual(body.children.length, 1, 'sendMessage 不会重复创建 DOM');
dnl.destroy();
assert.strictEqual(body.children.length, 0, '销毁后全部移除');

// 遮盖层（options.mask）：开启后抽屉打开时盖住左侧页面区域；
// 点击遮盖层默认不关闭（options.maskClosable 默认 false），maskClosable: true 时点击才关闭
const dm = createDrawer({ env: 'dev', token: 'tm', agentCode: 'am', mask: true });
dm.open();
assert.strictEqual(body.children.length, 3, '开启遮盖层后：悬浮按钮 + 遮盖层 + 抽屉');
const maskEl = body.children[1];
assert.strictEqual(maskEl.classList.contains('ckc-mask--hidden'), false, '打开时遮盖层显示');
if (maskEl.listeners.click) maskEl.listeners.click[0](); // 点击遮盖层
assert.strictEqual(dm.isOpen, true, '点击遮盖层默认不关闭抽屉');
assert.ok(!maskEl.style.cursor, '默认点击不可关闭时不应显示可点击光标');
dm.close();
assert.strictEqual(maskEl.classList.contains('ckc-mask--hidden'), true, '关闭后遮盖层隐藏');
dm.open();
assert.strictEqual(maskEl.classList.contains('ckc-mask--hidden'), false, '重新打开遮盖层恢复显示');
dm.destroy();
assert.strictEqual(body.children.length, 0, '销毁后遮盖层一并移除');

// maskClosable: true：点击遮盖层关闭抽屉
const dmc = createDrawer({ env: 'dev', token: 'tm', agentCode: 'am', mask: true, maskClosable: true });
dmc.open();
const maskEl2 = body.children[1];
assert.strictEqual(maskEl2.style.cursor, 'pointer', '可点击关闭时显示可点击光标');
maskEl2.listeners.click[0](); // 点击遮盖层
assert.strictEqual(dmc.isOpen, false, 'maskClosable: true 时点击遮盖层关闭抽屉');
assert.strictEqual(maskEl2.classList.contains('ckc-mask--hidden'), true, '关闭后遮盖层隐藏');
dmc.destroy();
assert.strictEqual(body.children.length, 0, '销毁后遮盖层一并移除');

// 会话状态（iframe 发 drawer-session-state）：缓存后随 onVisibilityChange 回调第二参 sessionActive 带给宿主
const dss = createDrawer({ env: 'dev', token: 't-ss', agentCode: 'a-ss' });
const stSeen = [];
dss.onVisibilityChange((v, sessionActive) => stSeen.push([v, sessionActive]));
dss.open();
assert.deepStrictEqual(stSeen, [[true, false]], 'iframe 未上报会话状态时回调第二参默认 false');
dispatchWindowMessage(dss.iframe.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-session-state',
  sessionActive: true,
});
dss.close();
assert.deepStrictEqual(
  stSeen,
  [
    [true, false],
    [false, true],
  ],
  'iframe 上报会话状态后回调第二参带上（打开 / 关闭都带）',
);
// 非法 / 来源不符的会话状态消息一律忽略，不影响已缓存的状态
dispatchWindowMessage(dss.iframe.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-session-state',
  sessionActive: 'yes',
});
dispatchWindowMessage({}, { source: 'ckc-expert-agent', type: 'drawer-session-state', sessionActive: false });
dss.open();
assert.deepStrictEqual(stSeen[2], [true, true], '非法 / 来源不符的会话状态消息被忽略');
dss.destroy();
assert.strictEqual(body.children.length, 0, '销毁后全部移除');

// 拖拽调宽开关（options.resizable）：默认开启（渲染拖拽把手，拖拽调宽的行为主流程已覆盖）；
// resizable: false 关闭——不渲染拖拽把手、拖不动；setWidth 等方法不受开关影响
// （DOM stub 的 querySelector 对任意选择器都返回桩元素，这里用 innerHTML 断言元素是否渲染，与 close-btn 用例一致）
const drs = createDrawer({ env: 'dev', token: 't-rs', agentCode: 'a-rs' });
drs.open();
const drsHost = body.children[1];
assert.ok(
  drsHost.shadowRoot.innerHTML.includes('<div class="resize-handle">'),
  '默认开启拖拽调宽：渲染拖拽把手',
);
drs.destroy();
const drsOff = createDrawer({ env: 'dev', token: 't-ro', agentCode: 'a-ro', resizable: false });
drsOff.open();
const drsOffHost = body.children[1];
assert.ok(
  !drsOffHost.shadowRoot.innerHTML.includes('<div class="resize-handle">'),
  'resizable: false 关闭拖拽调宽：不渲染拖拽把手',
);
drsOff.setWidth(600);
assert.strictEqual(drsOffHost.style.width, '600px', '关闭拖拽调宽时 setWidth 仍可用');
drsOff.destroy();
assert.strictEqual(body.children.length, 0, '销毁后全部移除');

// 全屏消息宽度语义：全屏 = maxWidth，取消全屏 = minWidth（不是初始宽度 options.width）
const dfs = createDrawer({ env: 'dev', token: 't-fs', agentCode: 'a-fs', width: 800, minWidth: 500, maxWidth: 1000 });
dfs.open();
const dfsHost = body.children[1];
assert.strictEqual(dfsHost.style.width, '800px', '前置：初始宽度 800px（与 minWidth 不同）');
dispatchWindowMessage(dfs.iframe.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-fullscreen',
  fullscreen: true,
});
assert.strictEqual(dfsHost.style.width, '1000px', '全屏 = 设为最大宽度（maxWidth 1000）');
dispatchWindowMessage(dfs.iframe.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-fullscreen',
  fullscreen: false,
});
assert.strictEqual(dfsHost.style.width, '500px', '取消全屏 = 设为最小宽度（minWidth 500，而非初始宽度 800）');
dfs.destroy();
assert.strictEqual(body.children.length, 0, '销毁后全部移除');

// 拖拽调宽结束时同步宽度状态（drawer-width-state）：atMax / atMin 告知 iframe 当前宽度是否为
// 最大值 / 最小值，供 iframe 控制「全屏 / 取消全屏」按钮状态；iframe 重新就绪时也补发当前状态
const dws = createDrawer({ env: 'dev', token: 't-ws', agentCode: 'a-ws', width: 600, minWidth: 500, maxWidth: 1000 });
dws.open();
const dwsHost = body.children[1];
const dwsHandle = dwsHost.shadowRoot.querySelector('.resize-handle');
let wsSeen = frameMsgs.length;
const wsStates = () =>
  frameMsgs
    .slice(wsSeen)
    .filter((m) => m.msg.type === 'drawer-width-state')
    .map((m) => ({ atMax: m.msg.atMax, atMin: m.msg.atMin }));

// iframe 就绪补发当前状态：初始 600px（非极值）→ atMax / atMin 均为 false
dispatchWindowMessage(dws.iframe.contentWindow, { source: 'ckc-expert-agent', type: 'drawer-ready' });
assert.deepStrictEqual(wsStates(), [{ atMax: false, atMin: false }], 'iframe 就绪补发宽度状态（非极值）');

// 拖到最大宽度以外：被夹到 maxWidth → atMax: true
wsSeen = frameMsgs.length;
dwsHandle.listeners.pointerdown[0](pointerEvent(1000, 400));
dispatchWindowEvent('pointermove', pointerEvent(100, 400));
dispatchWindowEvent('pointerup', pointerEvent(100, 400));
assert.strictEqual(dwsHost.style.width, '1000px');
assert.deepStrictEqual(wsStates(), [{ atMax: true, atMin: false }], '拖拽结束在最大宽度：atMax: true');

// 拖到最小宽度以外：被夹到 minWidth → atMin: true
wsSeen = frameMsgs.length;
dwsHandle.listeners.pointerdown[0](pointerEvent(1000, 400));
dispatchWindowEvent('pointermove', pointerEvent(1600, 400));
dispatchWindowEvent('pointerup', pointerEvent(1600, 400));
assert.strictEqual(dwsHost.style.width, '500px');
assert.deepStrictEqual(wsStates(), [{ atMax: false, atMin: true }], '拖拽结束在最小宽度：atMin: true');

// 拖到中间宽度：atMax / atMin 均为 false
wsSeen = frameMsgs.length;
dwsHandle.listeners.pointerdown[0](pointerEvent(1000, 400));
dispatchWindowEvent('pointermove', pointerEvent(800, 400));
dispatchWindowEvent('pointerup', pointerEvent(800, 400));
assert.strictEqual(dwsHost.style.width, '700px');
assert.deepStrictEqual(wsStates(), [{ atMax: false, atMin: false }], '拖拽结束在中间宽度：均为 false');

// 兜底收尾（pointerup 丢失时 buttons=0 自检）同样同步宽度状态
wsSeen = frameMsgs.length;
dwsHandle.listeners.pointerdown[0](pointerEvent(1000, 400));
dispatchWindowEvent('pointermove', pointerEvent(400, 400));
dispatchWindowEvent('pointermove', pointerEvent(380, 400, 0));
assert.deepStrictEqual(wsStates(), [{ atMax: true, atMin: false }], '事件丢失兜底收尾也同步宽度状态');

// iframe 刷新重新就绪：补发当前宽度状态（拖拽调宽后的状态不丢）
wsSeen = frameMsgs.length;
dispatchWindowMessage(dws.iframe.contentWindow, { source: 'ckc-expert-agent', type: 'drawer-ready' });
assert.deepStrictEqual(wsStates(), [{ atMax: true, atMin: false }], 'iframe 重新就绪补发当前宽度状态');

// 拖拽中销毁：不发宽度状态（实例已销毁）
wsSeen = frameMsgs.length;
dwsHandle.listeners.pointerdown[0](pointerEvent(1000, 400));
dispatchWindowEvent('pointermove', pointerEvent(900, 400));
dws.destroy();
assert.deepStrictEqual(wsStates(), [], '拖拽中销毁不发宽度状态');
assert.strictEqual(body.children.length, 0, '销毁后全部移除');

// zIndex 配置（options.zIndex）：组件层级整体平移（抽屉 / 内置确认弹窗 = zIndex，悬浮按钮 / 遮盖层 = zIndex - 1），
// 默认 2147483647 浮在页面所有内容之上；接入方自定义弹窗需盖过抽屉时可调低（如 1000）
const dzk = createDrawer({ env: 'dev', token: 't-zk', agentCode: 'a-zk', zIndex: 1000, mask: true, confirmOnClose: true, launcher: false });
dzk.open();
const dzkMask = body.children[0]; // 遮盖层先于抽屉挂载（launcher: false）
const dzkHost = body.children[1];
assert.strictEqual(dzkHost.style.zIndex, '1000', 'zIndex: 1000 → 抽屉层级 1000');
assert.strictEqual(dzkMask.style.zIndex, '999', 'zIndex: 1000 → 遮盖层层级 999（低一层）');
// 内置确认弹窗与抽屉同层（弹窗宿主后挂 DOM，天然盖在抽屉上方）
dispatchWindowMessage(dzk.iframe.contentWindow, {
  source: 'ckc-expert-agent',
  type: 'drawer-session-state',
  sessionActive: true,
});
dzk.close();
const dzkDlg = body.children[body.children.length - 1];
assert.strictEqual(
  dzkDlg.shadowRoot.querySelector('.confirm-overlay').style.zIndex,
  '1000',
  'zIndex: 1000 → 内置确认弹窗层级 1000（与抽屉同层）',
);
dzk.destroy();
assert.strictEqual(body.children.length, 0, '销毁后全部移除（含在途确认弹窗）');

// zIndex 校验与收拢：非有限数字抛错；小数取整，超出 [0, 2147483647] 自动收拢
assert.throws(() => createDrawer({ env: 'dev', token: 't', agentCode: 'a', zIndex: '1000' }), /options\.zIndex/);
assert.throws(() => createDrawer({ env: 'dev', token: 't', agentCode: 'a', zIndex: NaN }), /options\.zIndex/);
assert.throws(() => createDrawer({ env: 'dev', token: 't', agentCode: 'a', zIndex: Infinity }), /options\.zIndex/);
const dzc = createDrawer({ env: 'dev', token: 't-zc', agentCode: 'a-zc', zIndex: 99999999999, launcher: false });
dzc.open();
assert.strictEqual(body.children[0].style.zIndex, '2147483647', 'zIndex 超上限：收拢到 2147483647');
dzc.destroy();
const dzn = createDrawer({ env: 'dev', token: 't-zn', agentCode: 'a-zn', zIndex: -5.5, launcher: false });
dzn.open();
assert.strictEqual(body.children[0].style.zIndex, '0', 'zIndex 为负：收拢到 0');
dzn.destroy();
const dzf = createDrawer({ env: 'dev', token: 't-zf', agentCode: 'a-zf', zIndex: 1000.9, launcher: false });
dzf.open();
assert.strictEqual(body.children[0].style.zIndex, '1000', 'zIndex 小数：取整为 1000');
dzf.destroy();
assert.strictEqual(body.children.length, 0, '销毁后全部移除');

// 类名一致性：JS classList 操作的类必须在样式里有对应选择器（类名写错会让样式静默不生效）
const srcText = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.ts'), 'utf8');
const usedClasses = new Set();
for (const m of srcText.matchAll(/classList\.(?:add|remove)\('([^']+)'\)/g)) usedClasses.add(m[1]);
for (const cls of usedClasses) {
  assert.ok(srcText.includes('.' + cls), `样式缺少 .${cls} 选择器，classList 操作会静默失效`);
}

// ===== onVisibilityChange 回调自行控制显隐：返回布尔值或 Promise<boolean>（true=显示 / false=隐藏） =====
(async () => {
  // 等回调返回的 Promise 结算（组件在结算后才应用显隐）
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  // 回调返回 Promise<boolean> 接管显隐：返回值即最终状态；不返回（或返回非布尔）按默认直接显隐
  const asked = [];
  let next = false;
  const dvc = createDrawer({ env: 'dev', token: 't-vc', agentCode: 'a-vc' });
  dvc.onVisibilityChange((v) => {
    asked.push(v);
    return Promise.resolve(next); // 由 next 决定最终显隐
  });
  next = false;
  dvc.open();
  assert.strictEqual(dvc.isOpen, false, '回调返回 Promise<false>：请求显示仍保持隐藏（结算后生效）');
  assert.strictEqual(dvc.iframe, null, '未显示时不初始化抽屉');
  assert.strictEqual(body.children.length, 1, '未显示时不创建抽屉 DOM（只有悬浮按钮）');
  await flush();
  assert.strictEqual(dvc.isOpen, false, 'Promise 结算后仍隐藏');
  next = true;
  dvc.open();
  assert.strictEqual(dvc.isOpen, false, '异步决定结算前不生效');
  await flush();
  assert.strictEqual(dvc.isOpen, true, '回调返回 Promise<true>：显示生效');
  assert.ok(dvc.iframe, '显示时初始化抽屉');
  assert.strictEqual(body.children.length, 2);
  next = true;
  dvc.close();
  await flush();
  assert.strictEqual(dvc.isOpen, true, '请求隐藏但回调返回 Promise<true>：保持显示（取消隐藏）');
  next = false;
  dvc.close();
  await flush();
  assert.strictEqual(dvc.isOpen, false, '请求隐藏且回调返回 Promise<false>：隐藏生效');
  assert.deepStrictEqual(asked, [true, true, false, false], '回调收到每次请求的显隐值');
  dvc.destroy();
  assert.strictEqual(body.children.length, 0);

  // 回调不返回值：按默认直接显示/隐藏（同步立即生效，与原行为一致）
  const seen = [];
  const dd = createDrawer({ env: 'dev', token: 't-dv', agentCode: 'a-dv' });
  dd.onVisibilityChange((v) => {
    seen.push(v);
  });
  dd.open();
  assert.strictEqual(dd.isOpen, true, '回调不返回值：按默认直接显示（同步生效）');
  dd.close();
  assert.strictEqual(dd.isOpen, false, '回调不返回值：按默认直接隐藏（同步生效）');
  assert.deepStrictEqual(seen, [true, false]);
  dd.destroy();

  // 同步返回布尔值同样接管显隐
  const dsy = createDrawer({ env: 'dev', token: 't-sy', agentCode: 'a-sy' });
  dsy.onVisibilityChange(() => false); // 始终「隐藏」：显示请求被取消
  dsy.open();
  assert.strictEqual(dsy.isOpen, false, '同步返回 false 同样接管显隐（请求显示被取消）');
  assert.strictEqual(body.children.length, 1, '未显示时不创建抽屉 DOM');
  dsy.destroy();

  // 回调抛错 / Promise 被拒绝：按默认显隐处理
  const de = createDrawer({ env: 'dev', token: 't-er', agentCode: 'a-er' });
  de.onVisibilityChange(() => {
    throw new Error('handler boom');
  });
  de.open();
  assert.strictEqual(de.isOpen, true, '回调抛错按默认显隐处理');
  de.destroy();
  const dre = createDrawer({ env: 'dev', token: 't-re', agentCode: 'a-re' });
  dre.onVisibilityChange(() => Promise.reject(new Error('reject boom')));
  dre.open();
  await flush();
  assert.strictEqual(dre.isOpen, true, 'Promise 被拒绝按默认显隐处理');
  dre.destroy();

  // 多个回调：按注册顺序以第一个明确的布尔值为准
  const dmv = createDrawer({ env: 'dev', token: 't-mv', agentCode: 'a-mv' });
  dmv.onVisibilityChange(() => Promise.resolve(false));
  dmv.onVisibilityChange(() => true); // 后注册的布尔值不生效
  dmv.open();
  await flush();
  assert.strictEqual(dmv.isOpen, false, '多个回调按注册顺序取第一个明确布尔值');
  dmv.destroy();

  // 同向在途请求不重复触发回调；destroy 后在途决定不再生效
  const dfl = createDrawer({ env: 'dev', token: 't-fl', agentCode: 'a-fl' });
  let flCalls = 0;
  let resolveFl;
  dfl.onVisibilityChange(() => {
    flCalls += 1;
    return new Promise((resolve) => {
      resolveFl = resolve;
    });
  });
  dfl.open();
  dfl.open(); // 同向请求已在途：不重复触发回调
  assert.strictEqual(flCalls, 1, '同向在途请求不重复触发回调');
  dfl.destroy();
  resolveFl(true);
  await flush();
  assert.strictEqual(dfl.isOpen, false, '销毁后在途决定不再生效');
  assert.strictEqual(body.children.length, 0, '销毁后全部移除');

  // 按会话状态决策（demo 示例逻辑）：会话中取消隐藏，不在会话状态按默认直接隐藏
  const dsg = createDrawer({ env: 'dev', token: 't-sg', agentCode: 'a-sg' });
  dsg.onVisibilityChange((v, sessionActive) => {
    if (v || !sessionActive) return; // 显示 / 不在会话状态：不返回值按默认
    return Promise.resolve(true); // 会话中请求隐藏：取消隐藏（等价 demo 确认框选「取消」）
  });
  dsg.open();
  dispatchWindowMessage(dsg.iframe.contentWindow, {
    source: 'ckc-expert-agent',
    type: 'drawer-session-state',
    sessionActive: true,
  });
  dsg.close();
  await flush();
  assert.strictEqual(dsg.isOpen, true, '会话状态请求隐藏被取消：保持显示');
  dispatchWindowMessage(dsg.iframe.contentWindow, {
    source: 'ckc-expert-agent',
    type: 'drawer-session-state',
    sessionActive: false,
  });
  dsg.close();
  await flush();
  assert.strictEqual(dsg.isOpen, false, '不在会话状态：按默认直接隐藏');
  dsg.destroy();

  // ===== 内置关闭确认弹窗（options.confirmOnClose） =====
  // 开启后：会话中关闭弹组件内置确认弹窗（确定→隐藏 / 取消→保持显示），非会话直接关闭；
  // 关闭方向由弹窗决定（回调返回值忽略），显示方向仍受回调返回值控制
  const dcc = createDrawer({ env: 'dev', token: 't-cc', agentCode: 'a-cc', confirmOnClose: true });
  const ccSeen = [];
  dcc.onVisibilityChange((v) => {
    ccSeen.push(v);
    return true; // 关闭方向应被忽略（否则非会话直接关闭会被取消）
  });
  dcc.open();
  assert.strictEqual(dcc.isOpen, true, '开启确认弹窗时显示方向正常（回调返回 true=显示）');
  dcc.close(); // 非会话状态：直接关闭
  assert.strictEqual(dcc.isOpen, false, '非会话状态：直接关闭（回调返回 true 被忽略）');
  assert.strictEqual(body.children.length, 2, '非会话关闭不弹确认框（悬浮按钮 + 抽屉，抽屉隐藏但 DOM 保留）');
  assert.deepStrictEqual(ccSeen, [true, false], '关闭方向忽略返回值但回调仍触发（仅感知）');
  await flush();

  // 会话中关闭：弹内置确认弹窗，未决定前保持显示
  dispatchWindowMessage(dcc.iframe.contentWindow, {
    source: 'ckc-expert-agent',
    type: 'drawer-session-state',
    sessionActive: true,
  });
  dcc.open();
  dcc.close();
  assert.strictEqual(dcc.isOpen, true, '确认弹窗在途：未决定前保持显示');
  const dlg1 = body.children[body.children.length - 1];
  assert.ok(dlg1.shadowRoot.innerHTML.includes('confirm-btn--ok'), '会话中关闭弹出内置确认弹窗');
  assert.strictEqual(
    dlg1.shadowRoot.querySelector('.confirm-message').textContent,
    '当前有任务正在运行，关闭会取消任务，确认关闭吗？',
    '弹窗默认文案',
  );
  assert.strictEqual(body.children.length, 3, '弹窗独立宿主挂在 body 上（悬浮按钮 + 抽屉 + 弹窗）');

  // 点「取消」：保持显示，弹窗收起
  dlg1.shadowRoot.querySelector('.confirm-btn--cancel').listeners.click[0]();
  await flush();
  assert.strictEqual(dcc.isOpen, true, '点「取消」保持显示');
  assert.strictEqual(body.children.length, 2, '取消后弹窗收起');

  // 点「确定」：隐藏生效
  dcc.close();
  const dlg2 = body.children[body.children.length - 1];
  dlg2.shadowRoot.querySelector('.confirm-btn--ok').listeners.click[0]();
  await flush();
  assert.strictEqual(dcc.isOpen, false, '点「确定」隐藏生效');
  assert.strictEqual(body.children.length, 2, '确定后弹窗收起');

  // Esc=取消、Enter=确定
  dcc.open();
  dcc.close();
  dispatchWindowEvent('keydown', { key: 'Escape', preventDefault() {} });
  await flush();
  assert.strictEqual(dcc.isOpen, true, 'Esc 取消：保持显示');
  dcc.close();
  dispatchWindowEvent('keydown', { key: 'Enter', preventDefault() {} });
  await flush();
  assert.strictEqual(dcc.isOpen, false, 'Enter 确定：隐藏生效');
  assert.strictEqual(body.children.length, 2, '键盘操作后弹窗收起');

  // 弹窗在途时反向请求接管：弹窗收起，结果显示
  dcc.open();
  dcc.close();
  assert.strictEqual(body.children.length, 3, '再次关闭：弹窗在途');
  dcc.open();
  await flush();
  assert.strictEqual(dcc.isOpen, true, '弹窗在途时显示请求接管：结果显示');
  assert.strictEqual(body.children.length, 2, '接管时弹窗收起');

  // destroy 收起在途弹窗并清场
  dcc.close();
  assert.strictEqual(body.children.length, 3, '销毁前弹窗在途');
  dcc.destroy();
  assert.strictEqual(body.children.length, 0, '销毁时收起弹窗并全部移除');
  await flush();

  // 显示方向仍受回调返回值控制（开启确认弹窗不影响显示方向）
  const dco = createDrawer({ env: 'dev', token: 't-co', agentCode: 'a-co', confirmOnClose: true });
  dco.onVisibilityChange(() => false);
  dco.open();
  assert.strictEqual(dco.isOpen, false, '开启确认弹窗时显示方向仍受回调返回值控制');
  dco.destroy();
  assert.strictEqual(body.children.length, 0, '销毁后全部移除');

  // 自定义弹窗文案（options.confirmOnCloseText）：不传时用默认文案（上方用例已覆盖）
  const dct = createDrawer({
    env: 'dev',
    token: 't-ct',
    agentCode: 'a-ct',
    confirmOnClose: true,
    confirmOnCloseText: '自定义关闭文案 <b>x</b>',
  });
  dct.open();
  dispatchWindowMessage(dct.iframe.contentWindow, {
    source: 'ckc-expert-agent',
    type: 'drawer-session-state',
    sessionActive: true,
  });
  dct.close();
  const dlgText = body.children[body.children.length - 1];
  assert.strictEqual(
    dlgText.shadowRoot.querySelector('.confirm-message').textContent,
    '自定义关闭文案 <b>x</b>',
    '弹窗文案取自 options.confirmOnCloseText（原样文本，不解析 HTML）',
  );
  dlgText.shadowRoot.querySelector('.confirm-btn--cancel').listeners.click[0]();
  await flush();
  dct.destroy();
  assert.strictEqual(body.children.length, 0, '销毁后全部移除');

  console.log('smoke: all assertions passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
