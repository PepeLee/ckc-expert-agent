# ckc-expert-agent

可嵌入第三方页面的悬浮抽屉组件。TypeScript + Vite 构建，产物为 UMD 格式 JS，可直接放到 CDN 上通过 `<script>` 标签接入。

## 功能与交互

- 默认在页面右下角显示一个**可拖动的圆形悬浮按钮**（拖动可移动位置）
- **点击悬浮按钮**：初始化并显示右侧抽屉（首次点击时才创建 iframe 并按固定格式加载 `{域名}/center/thd/chat/{agentCode}[/{sessionId}]?token={token}`，域名由 `env` 决定）
- 抽屉固定在页面右侧，初始宽度 500px，**拖动左边框可调整宽度**（支持鼠标和触摸）
- 抽屉右上角有**关闭按钮**：点击只是把抽屉**移出视口**（`transform` 平移隐藏，不销毁 iframe），**iframe 内容继续运行、仍可 postMessage，内部滚动条/表单等状态保留**；再次点击悬浮按钮重新显示
- **显隐变化会发出 postMessage**（见下文约定），iframe 内容方和宿主页面都能收到
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
4. 测试页会展示 URL 参数（agentCode / sessionId / token）、记录收到的 `drawer-init` payload 和显隐消息，也能向宿主页发 postMessage（宿主页的消息日志同步显示）

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
| `options.sessionId` | `string` | 不传 | 会话 ID，传入时拼到路径上（`/center/thd/chat/{agentCode}/{sessionId}`），不传则不拼 |
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
| `destroy()` | 彻底销毁：移除悬浮按钮和抽屉 DOM 并解绑事件 |

## postMessage 约定

**1. 初始化消息**：传了 `options.payload` 时，iframe 加载完成后组件会发给 iframe 内容方：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-init',
  payload: { message: '...', files: [{ name, url, type }] }
}
```

**2. 显隐消息**：抽屉**显示/隐藏**时，组件会发出如下消息（iframe 内容方和宿主页面都会收到）：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-visibility-change',
  visible: true // true=显示，false=隐藏
}
```

- **发给 iframe 内容**：`iframe.contentWindow.postMessage(msg, iframe 页面的 origin)`
- **发给宿主页面**：`window.postMessage(msg, '*')`

由于关闭抽屉只是隐藏、iframe 不会被销毁，iframe 内容在隐藏期间照常运行，随时可以自己 `postMessage` 出来（发给宿主页面或其他窗口）。
