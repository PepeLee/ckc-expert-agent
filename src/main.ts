import { createDrawer } from './index';

// 本地开发/预览用的宿主页面演示：
// 默认只出现一个可拖动的悬浮按钮，点击后初始化并显示右侧抽屉（iframe）
const drawer = createDrawer({
  // 运行环境：dev / sit / pro，决定站点域名
  // iframe 最终加载 {域名}/center/thd/chat/{agentCode}[/{sessionId}]?token={token}
  env: 'dev',
  token: 'demo-token',
  agentCode: 'demo-agent',
  // sessionId: 'demo-session', // 选填；不传时 iframe 会生成 sessionId 并通过 receiveSessionId 回传
  // 预置数据（选填）：iframe 加载完成后通过 postMessage 传给 iframe
  payload: {
    message: '你好，帮我分析这份报告',
    files: [
      { name: 'report.pdf', url: 'https://example.com/report.pdf', type: 'application/pdf' },
    ],
  },
});

// 显隐通过返回的 DrawerHandle 控制
const openBtn = document.createElement('button');
openBtn.textContent = 'drawer.open()';
openBtn.addEventListener('click', () => drawer.open());
document.body.appendChild(openBtn);

const closeBtn = document.createElement('button');
closeBtn.textContent = 'drawer.close()';
closeBtn.addEventListener('click', () => drawer.close());
document.body.appendChild(closeBtn);

// 真正销毁（区别于关闭按钮的“隐藏”）
const destroyBtn = document.createElement('button');
destroyBtn.textContent = '彻底销毁';
destroyBtn.addEventListener('click', () => drawer.destroy());
document.body.appendChild(destroyBtn);

// 向 iframe 发消息（固定协议 drawer-message，iframe 未加载完自动排队补发）
const sendBtn = document.createElement('button');
sendBtn.textContent = 'drawer.sendMessage()';
sendBtn.addEventListener('click', () =>
  drawer.sendMessage({
    message: '你好',
    files: [{ name: 'report.pdf', url: 'https://example.com/report.pdf', type: 'pdf' }],
  }),
);
document.body.appendChild(sendBtn);

// 收发消息统一走 DrawerHandle 固定方法，宿主不直接使用 postMessage / message 事件
drawer.receiveMessage((message) => {
  console.log('[host] 收到消息:', message);
});
// 未传 options.sessionId 时 iframe 会生成 sessionId 并发回，在此接收处理
drawer.receiveSessionId((sessionId) => {
  console.log('[host] 收到 iframe 生成的 sessionId:', sessionId);
});
drawer.onVisibilityChange((visible) => {
  console.log('[host] 抽屉', visible ? '显示' : '隐藏');
});
