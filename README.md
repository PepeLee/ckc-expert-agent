# ckc-expert-agent

可嵌入第三方页面的悬浮抽屉组件。TypeScript + Vite 构建，产物为 UMD 格式 JS，可直接放到 CDN 上通过 `<script>` 标签接入。

## 功能与交互

- 默认在页面右下角显示一个**可拖动的圆形悬浮按钮**（拖动可移动位置）
- **点击悬浮按钮**：初始化并显示右侧抽屉（首次点击时才创建 iframe 并按固定格式加载 `{域名}/center/thd/chat/{agentCode}[/{sessionId}]?token={token}`，域名由 `env` 决定）
- 抽屉显示后先展示**加载动画**（转圈 +「加载中…」），iframe 发来就绪消息（`drawer-ready`）后消失，避免 iframe 初始化慢时抽屉长时间空白；若 10 秒仍未收到就绪消息（iframe 页面未实现该消息、加载被拦截等），自动停止动画露出 iframe 内容并在控制台提示
- 抽屉固定在页面右侧，初始宽度 500px，**拖动左边框可调整宽度**（支持鼠标和触摸；弱网/云桌面下拖拽事件丢失时自动兜底收尾，不会卡在拖拽状态）
- 抽屉右上角有**关闭按钮**：点击只是把抽屉**移出视口**（`transform` 平移隐藏，不销毁 iframe），**iframe 内容继续运行、仍可 postMessage，内部滚动条/表单等状态保留**；再次点击悬浮按钮重新显示
- **宿主与 iframe 的消息收发固定为协议 + 方法**：`drawer.sendMessage()` 发给 iframe、`drawer.receiveFiles()` 接受产物文件、`drawer.receiveSessionId()` 接收 iframe 生成的 sessionId、`drawer.onVisibilityChange()` 感知显隐（见下文「消息协议」）；宿主无需（也不应）直接使用 `postMessage` / `message` 事件
- 抽屉浮在接入方页面最上方（`z-index: 2147483647`）
- 基于 Shadow DOM 渲染，不受接入方页面 CSS 影响，也不污染接入方页面

## 开发与构建

```bash
npm install
npm run dev     # 本地开发预览
npm run build   # 构建 UMD 产物到 dist/
npm test        # 构建并运行零依赖冒烟测试（scripts/smoke.js）
```

构建产物：`dist/ckc-expert-agent.umd.js`（附 sourcemap），把该文件上传到 CDN 即可。

## 本地联调

仓库内置零依赖本地服务器和 iframe 测试页，不依赖 dev/sit/pro 环境即可验证抽屉和 postMessage 双向通信：

```bash
npm run build        # 先构建 UMD 产物
npm run test:server  # 启动本地服务 http://localhost:4173
```

1. 把宿主页（如 [demo.html](demo.html)）里的 `env` 临时改为 `'local'`（指向 `http://localhost:4173`）
2. 打开 `http://localhost:4173/`，点击悬浮按钮打开抽屉
3. 抽屉 iframe 加载 `http://localhost:4173/center/thd/chat/:agentCode[/:sessionId]?token=xxx`，由服务器命中 [test/iframe.html](test/iframe.html)
4. 测试页加载后先发**就绪消息**（`drawer-ready`，宿主收到后才发 `drawer-init`），并展示 URL 参数（agentCode / sessionId / token）、记录收到的 `drawer-init` payload 和显隐消息，也能按固定协议发产物文件（`drawer-files`，payload 为 `DrawerFile[]`）给宿主页（宿主页通过 `receiveFiles` 记录，日志同步显示）；未传 `sessionId` 时测试页会生成并回传（`drawer-session`），宿主页通过 `receiveSessionId` 显示

注意：`local` 域名固化为 `http://localhost:4173`，如用 `PORT` 覆盖服务端口，需同步修改组件内 `ENV_DOMAINS`。

## 接入方式（CDN）

```html
<script src="https://your-cdn.com/ckc-expert-agent.umd.js"></script>
<script>
  // 抽屉内容固定为 iframe；调用后页面上出现悬浮圆形按钮
  // iframe 最终地址：{域名}/center/thd/chat/{agentCode}[/{sessionId}]?token={token}
  // payload 选填，iframe 加载完成后通过 postMessage 传给 iframe
  var drawer = window.createCkcDrawer({
    env: 'dev', // 运行环境：dev / sit / pro
    token: 'xxxx',
    agentCode: 'agent-01',
    sessionId: 'sess-01', // 选填
    payload: {
      message: '你好，帮我分析这份报告',
      files: [
        { name: 'report.pdf', url: 'https://cdn.com/report.pdf', type: 'application/pdf' },
      ],
    },
  });

  // 显隐通过返回的 DrawerHandle 控制
  drawer.open();  // 显示（首次调用时初始化 iframe）
  drawer.close(); // 隐藏（不销毁，iframe 继续运行）

  // 向 iframe 发消息（固定协议 drawer-message；iframe 未加载完自动排队，加载后补发）
  drawer.sendMessage({
    message: '你好',
    files: [{ name: 'report.pdf', url: 'https://cdn.com/report.pdf', type: 'pdf' }],
  });

  // 接受产物文件 / 接收 sessionId / 显隐变化：宿主不需要自己监听 message 事件
  drawer.receiveFiles(function (files) {
    console.log('产物文件', files);
  });
  drawer.receiveSessionId(function (sessionId) {
    console.log('iframe 生成的 sessionId', sessionId); // 可持久化，下次经 options.sessionId 传入续接会话
  });
  drawer.onVisibilityChange(function (visible) {
    console.log('抽屉', visible ? '显示' : '隐藏');
  });

  // 彻底销毁（移除悬浮按钮和抽屉）
  drawer.destroy();
</script>

<!-- 页面任意位置都可以通过 handle 控制显隐 -->
<button onclick="drawer.open()">打开</button>
<button onclick="drawer.close()">关闭</button>
```

也支持通过 UMD 全局对象访问：`window.CkcExpertAgent.createDrawer()`（与 `window.createCkcDrawer` 是同一个方法）。

## window 全局方法

window 上**只挂载一个方法**：

| 方法 | 说明 |
| --- | --- |
| `window.createCkcDrawer(options)` | 创建悬浮按钮 + 抽屉，返回 `DrawerHandle` |

打开、关闭等行为不再挂全局方法，统一通过 `createCkcDrawer` 返回的 `DrawerHandle` 控制（见下方 API）。

## API

### `createDrawer(options): DrawerHandle`

iframe 实际加载地址：`{域名}/center/thd/chat/{options.agentCode}[/{options.sessionId}]?token={options.token}`（域名由 `options.env` 决定；`sessionId` 选填，不传则不拼）

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `options.env` | `'dev' \| 'sit' \| 'pro' \| 'local'` | （必填） | 运行环境，决定站点域名（见下方映射） |
| `options.token` | `string` | （必填） | 鉴权 token，作为 `token` 查询参数拼到 iframe 地址上（`?token=xxx`） |
| `options.agentCode` | `string` | （必填） | 智能体编码，作为路径段拼到 iframe 地址上（`/center/thd/chat/{agentCode}`） |
| `options.sessionId` | `string` | 不传 | 会话 ID，传入时拼到路径上（`/center/thd/chat/{agentCode}/{sessionId}`），不传则不拼；**不传时 iframe 会生成 sessionId 并发回**（`receiveSessionId` 接收） |
| `options.payload` | `{ message: string; files: {name, url, type}[] }` | 不传 | 预置消息/文件，iframe 加载完成后通过 postMessage 传给 iframe |
| `options.width` | `number` | `500` | 初始宽度（px） |
| `options.minWidth` | `number` | `200` | 最小宽度（px） |
| `options.maxWidth` | `number` | 视口宽度的 90% | 最大宽度（px） |

环境与站点域名映射（域名固化在组件内）：

| `env` | 站点域名 |
| --- | --- |
| `dev` | `http://lf18kg-dev.life.cpic.com` |
| `sit` | `http://lf18kg-sit.life.cpic.com` |
| `pro` | `http://lf18kg.life.cpic.com` |
| `local` | `http://localhost:4173`（本地联调） |

返回 `DrawerHandle`：

| 成员 | 说明 |
| --- | --- |
| `iframe` | 抽屉内的 `HTMLIFrameElement`，首次打开抽屉前为 `null` |
| `open()` | 显示抽屉（首次调用时初始化抽屉并加载 iframe） |
| `close()` | 隐藏抽屉（移出视口，不销毁；iframe 继续运行，滚动位置等状态保留） |
| `setWidth(width)` | 设置抽屉宽度（px，自动限制在 min/max 之间） |
| `sendMessage(payload)` | 向 iframe 发消息（固定协议 `drawer-message`，payload 为 `{message, files}`；iframe 就绪（`drawer-ready`）前自动排队，就绪后补发；发送失败也排队，重新就绪后补发） |
| `receiveFiles(handler)` | 接受产物文件：iframe 发来产物文件（`drawer-files`，payload 为 `DrawerFile[]`）时回调，返回取消监听函数 |
| `receiveSessionId(handler)` | 接收 sessionId：宿主未传 `options.sessionId` 时 iframe 生成并发出（`drawer-session`），宿主在此接收处理，返回取消监听函数 |
| `onVisibilityChange(handler)` | 监听抽屉显示/隐藏变化（含抽屉内关闭按钮触发的隐藏），返回取消监听函数 |
| `destroy()` | 彻底销毁：移除悬浮按钮和抽屉 DOM 并解绑事件 |

## 消息协议（固定）

宿主与 iframe 的通信**固定为以下协议**。宿主**不需要也不应**直接使用 `window.postMessage` 或 `window.addEventListener('message')` 收发消息，统一走 `DrawerHandle` 的 `sendMessage` / `receiveFiles` / `receiveSessionId` / `onVisibilityChange` 方法——组件内部会校验消息来源（只接受本抽屉 `iframe.contentWindow` 发来的合规消息），其他消息一律丢弃。

**宿主 → iframe**（组件内部 `iframe.contentWindow.postMessage(msg, iframe 页面 origin)`）：

**1. 初始化消息**：传了 `options.payload` 时，iframe 发出 **就绪消息**（见下文第 4 条 `drawer-ready`）后发出（iframe 刷新后再次就绪会重新收到）：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-init',
  payload: { message: '...', files: [{ name, url, type }] }
}
```

**2. 显隐消息**：抽屉**显示/隐藏**时（含抽屉内关闭按钮触发的隐藏）：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-visibility-change',
  visible: true // true=显示，false=隐藏
}
```

**3. 业务消息**：宿主调用 `drawer.sendMessage(payload)` 时：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  payload: { message: '...', files: [{ name, url, type }] }
}
```

**iframe → 宿主**：iframe 内容方调用 `parent.postMessage(msg, '*')`，有三种固定消息。

**4. 就绪消息**（`drawer-ready`）：iframe 页面**初始化完成后必须发出**（不带 payload），宿主以此判定 iframe 加载成功（**不以 `load` 事件判断**）：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-ready'
}
```

宿主收到后发送 `drawer-init`、当前显隐状态，并补发排队的 `drawer-message`；iframe 刷新/重新初始化后应**再次发送**，宿主会重新补发上述消息。

**5. 产物文件消息**（`drawer-files`）：payload 直接是 `DrawerFile[]`：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-files',
  payload: [{ name: 'report.pdf', url: 'https://...', type: 'pdf' }] // DrawerFile[]
}
```

宿主通过 `drawer.receiveFiles(handler)` 接受产物文件。

**6. sessionId 消息**（`drawer-session`）：宿主在 `DrawerOptions` **未传 `sessionId`** 时，iframe 会生成一个 sessionId 并发出，payload 为该 sessionId 字符串：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-session',
  payload: 'sess-xxxxx' // iframe 生成的 sessionId
}
```

宿主通过 `drawer.receiveSessionId(handler)` 接收处理（如持久化下来，下次调用 `createCkcDrawer` 时通过 `options.sessionId` 传入续接同一会话）。

组件只接受本抽屉 `iframe.contentWindow` 发来的合规消息，其他消息一律丢弃；抽屉显隐变化由 `drawer.onVisibilityChange(handler)` 通知宿主（iframe 侧收到的仍是上面的显隐 postMessage）。

由于关闭抽屉只是隐藏、iframe 不会被销毁，iframe 内容在隐藏期间照常运行，随时可以按上述协议 `postMessage` 出来，宿主的 `receiveFiles` / `receiveSessionId` 照常收到。

**投递保证**：iframe 加载是否成功由 iframe 主动发 `drawer-ready` 就绪消息判定（组件**不以 `load` 事件判断**，`about:blank` / 浏览器错误页触发的 `load` 不会误判为成功）；收到就绪消息前，发往 iframe 的消息（`drawer-init` / `drawer-visibility-change` / `drawer-message`）只排队不发送，就绪后按序补发（`drawer-init` → 当前显隐 → 排队消息）。若 `postMessage` 失败（如 iframe 停在 `about:blank` / 浏览器错误页，origin 为 `'null'`），组件内部捕获该异常（不抛给宿主，只 `console.warn`），消息保留待 iframe 重新就绪后补发。若接入方环境始终收不到 `drawer-init`，请检查：① **iframe 页面是否已实现就绪消息（`drawer-ready`）**；② 站点是否允许被内嵌（响应头 `X-Frame-Options` / `Content-Security-Policy: frame-ancestors`）；③ 宿主所在网络（如云桌面）能否访问对应环境域名；④ 浏览器控制台是否有 iframe 加载被拒绝的报错。
