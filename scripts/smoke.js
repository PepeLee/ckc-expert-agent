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
};
global.window = {
  innerWidth: 1280,
  innerHeight: 800,
  location: { href: 'https://host.example.com/' },
  postMessage(msg, targetOrigin) {
    windowMsgs.push({ msg, targetOrigin });
  },
};

// ---------- 加载 UMD 产物 ----------
const { createDrawer } = require(path.join(__dirname, '..', 'dist', 'ckc-expert-agent.umd.js'));

function pointerEvent(x, y) {
  return {
    pointerType: 'mouse',
    button: 0,
    pointerId: 1,
    clientX: x,
    clientY: y,
    preventDefault() {},
  };
}

/** 模拟在悬浮按钮上按下并原地松开（= 点击） */
function clickLauncher(host) {
  host.listeners.pointerdown[0](pointerEvent(500, 700));
  host.listeners.pointerup[0](pointerEvent(500, 700));
}

/** 模拟在悬浮按钮上按下并水平拖动 dx 后松开（= 拖动） */
function dragLauncher(host, dx) {
  host.listeners.pointerdown[0](pointerEvent(500, 700));
  host.listeners.pointermove[0](pointerEvent(500 + dx, 700));
  host.listeners.pointerup[0](pointerEvent(500 + dx, 700));
}

// ---------- 断言 ----------

// window 挂载
assert.strictEqual(typeof global.window.createCkcDrawer, 'function');
assert.strictEqual(typeof global.window.openCkcDrawer, 'function');
assert.strictEqual(typeof global.window.closeCkcDrawer, 'function');

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

// 初始：只有悬浮圆形按钮，抽屉未初始化
assert.strictEqual(drawer.iframe, null);
assert.strictEqual(body.children.length, 1);

// 拖动悬浮按钮：只移动位置，不打开抽屉（初始 left=1208，拖 120 后被夹到 1232）
const launcherHost = body.children[0];
dragLauncher(launcherHost, 120);
assert.strictEqual(launcherHost.style.left, '1232px');
assert.strictEqual(body.children.length, 1);
assert.strictEqual(drawer.iframe, null);

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

// 预置 payload：iframe 加载完成后通过 postMessage 传给 iframe
frame.listeners.load[0]();
const initMsg = frameMsgs.find((m) => m.msg.type === 'drawer-init');
assert.deepStrictEqual(initMsg.msg.payload, {
  message: '你好',
  files: [{ name: 'a.png', url: 'https://cdn/a.png', type: 'image/png' }],
});
assert.strictEqual(initMsg.targetOrigin, 'http://lf18kg-dev.life.cpic.com');

// 点击抽屉右上角关闭按钮：只隐藏，不销毁
const closeBtn = drawerHost.shadowRoot.querySelector('.close-btn');
assert.ok(closeBtn.listeners.click && closeBtn.listeners.click.length === 1);
closeBtn.listeners.click[0]();
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), true);
assert.strictEqual(drawerHost.inert, true);
assert.strictEqual(body.children.length, 2, '隐藏后抽屉 DOM 仍应存在');
assert.strictEqual(drawer.iframe, frame, 'iframe 未重建（内容继续运行）');

// 全局方法 window.openCkcDrawer()：重新显示同一个抽屉
global.window.openCkcDrawer();
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), false);
assert.strictEqual(drawerHost.inert, false);
assert.strictEqual(drawer.iframe, frame);
assert.strictEqual(iframeCreateCount, 1, '重新显示不应重建 iframe');

// 全局方法 window.closeCkcDrawer()：隐藏（不销毁）
global.window.closeCkcDrawer();
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), true);
assert.strictEqual(drawerHost.inert, true);
assert.strictEqual(body.children.length, 2);

// 再次点击悬浮按钮：重新显示
clickLauncher(launcherHost);
assert.strictEqual(drawerHost.classList.contains('ckc-drawer--hidden'), false);

// setWidth
drawer.setWidth(500);
assert.strictEqual(drawerHost.style.width, '500px');

// destroy：悬浮按钮和抽屉全部移除
drawer.destroy();
assert.strictEqual(body.children.length, 0);
assert.strictEqual(drawer.iframe, null);

// 销毁后全局方法不再动作（也不应报错）
global.window.openCkcDrawer();
global.window.closeCkcDrawer();
assert.strictEqual(body.children.length, 0);

// postMessage：显隐变化 [显示, 隐藏, 全局显示, 全局隐藏, 显示, 销毁时隐藏]
const expectedSeq = [true, false, true, false, true, false];
const visibilitySeq = (msgs) =>
  msgs.filter((m) => m.msg.type === 'drawer-visibility-change').map((m) => m.msg.visible);
assert.deepStrictEqual(visibilitySeq(windowMsgs), expectedSeq);
assert.deepStrictEqual(visibilitySeq(frameMsgs), expectedSeq);
assert.ok(
  windowMsgs.every(
    (m) =>
      m.msg.source === 'ckc-expert-agent' &&
      m.msg.type === 'drawer-visibility-change' &&
      m.targetOrigin === '*',
  ),
);
assert.ok(frameMsgs.every((m) => m.targetOrigin === 'http://lf18kg-dev.life.cpic.com'));

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
