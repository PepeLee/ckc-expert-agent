import { createDrawer } from './index';

// 本地开发/预览用的宿主页面演示：
// 默认只出现一个可拖动的悬浮按钮，点击后初始化并显示右侧抽屉（iframe）
const drawer = createDrawer({
  // 运行环境：dev / sit / pro，决定站点域名
  // iframe 最终加载 {域名}/center/thd/chat/{agentCode}[/{sessionId}]?token={token}
  env: 'dev',
  token: 'demo-token',
  agentCode: 'demo-agent',
  sessionId: 'demo-session', // 选填，传入时拼到路径上
  // 预置数据（选填）：iframe 加载完成后通过 postMessage 传给 iframe
  payload: {
    message: '你好，帮我分析这份报告',
    files: [
      { name: 'report.pdf', url: 'https://example.com/report.pdf', type: 'application/pdf' },
    ],
  },
});

// 全局方法控制显隐：不依赖 createDrawer 返回的 handle，页面任意位置可调用
const openBtn = document.createElement('button');
openBtn.textContent = 'window.openCkcDrawer()';
openBtn.addEventListener('click', () => window.openCkcDrawer());
document.body.appendChild(openBtn);

const closeBtn = document.createElement('button');
closeBtn.textContent = 'window.closeCkcDrawer()';
closeBtn.addEventListener('click', () => window.closeCkcDrawer());
document.body.appendChild(closeBtn);

// 真正销毁（区别于关闭按钮的“隐藏”）
const destroyBtn = document.createElement('button');
destroyBtn.textContent = '彻底销毁';
destroyBtn.addEventListener('click', () => drawer.destroy());
document.body.appendChild(destroyBtn);

// 接收组件发出的显隐 postMessage
window.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.source === 'ckc-expert-agent') {
    console.log('[host] 收到 postMessage:', e.data);
  }
});
