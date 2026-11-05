/**
 * 本地联调服务器（零依赖）：
 *   /                      → demo.html（宿主演示页）
 *   /center/thd/chat/*     → test/iframe.html（匹配组件生成的 iframe 地址）
 *   /dist/*                → 构建产物
 *
 * 运行：npm run test:server（默认端口 4173，可用 PORT 环境变量覆盖）
 * 注意：组件内 local 环境域名固化为 http://localhost:4173，改端口需同步改 ENV_DOMAINS。
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function send(res, code, content, type) {
  res.writeHead(code, { 'Content-Type': type });
  res.end(content);
}

function sendFile(res, file) {
  send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);
  console.log(`${req.method} ${pathname}${url.search}`);

  // 宿主演示页
  if (pathname === '/' || pathname === '/demo.html') {
    return sendFile(res, path.join(ROOT, 'demo.html'));
  }

  // 抽屉 iframe 测试页：匹配 {域名}/center/thd/chat/{agentCode}[/{sessionId}] 的任意路径
  if (pathname === '/center/thd/chat' || pathname.startsWith('/center/thd/chat/')) {
    return sendFile(res, path.join(ROOT, 'test', 'iframe.html'));
  }

  // 构建产物
  if (pathname.startsWith('/dist/')) {
    const file = path.normalize(path.join(ROOT, pathname));
    if (file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      return sendFile(res, file);
    }
  }

  send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
});

server.listen(PORT, () => {
  console.log('');
  console.log(`本地联调服务已启动：`);
  console.log(`  宿主演示页   http://localhost:${PORT}/          （把 env 改为 'local' 后使用）`);
  console.log(`  iframe 测试页 http://localhost:${PORT}/center/thd/chat/demo-agent?token=demo-token`);
  console.log('');
});
