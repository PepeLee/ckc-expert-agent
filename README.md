# ckc-expert-agent

可嵌入第三方页面的悬浮抽屉组件。TypeScript + Vite 构建，产物为 UMD 格式 JS，各环境部署在固定地址，通过 `<script>` 标签接入（见「接入方式」）。

## 功能与交互

- 默认在页面右下角显示一个**可拖动的圆形悬浮按钮**（拖动可移动位置）
- **点击悬浮按钮**：初始化并显示右侧抽屉（首次点击悬浮按钮或调用 `sendMessage` 时才创建 iframe 并按固定格式加载 `{域名}/center/thd/chat/{agentCode}[/{sessionId}]?token={token}`，域名由 `env` 决定）
- 抽屉显示后先展示**加载动画**（转圈 +「加载中…」），iframe 发来就绪消息（`drawer-ready`）后消失，避免 iframe 初始化慢时抽屉长时间空白；若 10 秒仍未收到就绪消息（iframe 页面未实现该消息、加载被拦截等），自动停止动画露出 iframe 内容并在控制台提示
- 抽屉固定在页面右侧，初始宽度 500px，**拖动左边框可调整宽度**（支持鼠标和触摸；弱网/云桌面下拖拽事件丢失时自动兜底收尾，不会卡在拖拽状态）
- 抽屉本身**不带关闭按钮**：iframe 页面在自己的 header 上提供**全屏**和**关闭**按钮，通过固定协议控制抽屉——全屏按钮发 `drawer-fullscreen`（抽屉宽度变为最大值，按钮变为「取消全屏」，再点恢复默认宽度），关闭按钮发 `drawer-close`（只把抽屉**移出视口**，`transform` 平移隐藏、不销毁 iframe，**iframe 内容继续运行、仍可 postMessage，内部滚动条/表单等状态保留**）；再次点击悬浮按钮重新显示，宿主也可用 `drawer.close()` 关闭
- **宿主与 iframe 的消息收发固定为协议 + 方法**：`drawer.sendMessage()` 发给 iframe（**自动打开抽屉**，未就绪自动排队、就绪后补发）、`drawer.receiveMessage()` 接收 iframe 发来的消息、`drawer.receiveSessionId()` 接收 iframe 生成的 sessionId、`drawer.onVisibilityChange()` 感知显隐（见下文「消息协议」）；宿主无需（也不应）直接使用 `postMessage` / `message` 事件
- 可选**遮盖层**（`options.mask`，默认不开启）：开启后抽屉打开时给左侧页面区域盖一层半透明遮罩（阻止操作宿主页）；点击遮盖层是否关闭抽屉由 `options.maskClosable` 控制（默认不关闭）
- 可选 `options.closeSessionOnClose`（默认 `false`）：控制**关闭抽屉时是否关闭当前 agent 会话**；收到 iframe 就绪消息后随配置消息（`drawer-config`）发给 iframe，由智能体页面按此配置执行
- 抽屉浮在接入方页面最上方（`z-index: 2147483647`）
- 基于 Shadow DOM 渲染，不受接入方页面 CSS 影响，也不污染接入方页面

## 开发与构建

```bash
npm install
npm run dev     # 本地开发预览
npm run build   # 构建 UMD 产物到 dist/
npm test        # 构建并运行零依赖冒烟测试（scripts/smoke.js）
```

构建产物：`dist/ckc-expert-agent.umd.js`（附 sourcemap），部署时上传到各环境站点的 `/center/exts/` 目录（固定脚本地址见「接入方式」）。

## 本地联调

仓库内置零依赖本地服务器和 iframe 测试页，不依赖 dev/sit/pro 环境即可验证抽屉和 postMessage 双向通信：

```bash
npm run build        # 先构建 UMD 产物
npm run test:server  # 启动本地服务 http://localhost:4173
```

1. 把宿主页（如 [demo.html](demo.html)）里的 `env` 临时改为 `'local'`（指向 `http://localhost:4173`）
2. 打开 `http://localhost:4173/`，点击悬浮按钮打开抽屉
3. 抽屉 iframe 加载 `http://localhost:4173/center/thd/chat/:agentCode[/:sessionId]?token=xxx`，由服务器命中 [test/iframe.html](test/iframe.html)
4. 测试页加载后先发**就绪消息**（`drawer-ready`，宿主收到后才补发显隐和排队消息），并展示 URL 参数（agentCode / sessionId / token）、记录收到的显隐消息；宿主 `sendMessage` 发来的消息（`drawer-message`）测试页会回执一条消息（`drawer-message`，payload 为 `{message, files, sessionId, ...}`）给宿主页（宿主页通过 `receiveMessage` 记录，日志同步显示）；未传 `sessionId` 时测试页会生成并回传（`drawer-session`），宿主页通过 `receiveSessionId` 显示
5. 测试页 header 上有**全屏**和**关闭**按钮：全屏按钮发 `drawer-fullscreen` 让抽屉宽度变为最大值（再点变回「取消全屏」恢复默认宽度），关闭按钮发 `drawer-close` 关闭抽屉（只隐藏不销毁），可直接体验这两个控制消息的效果

注意：`local` 域名固化为 `http://localhost:4173`，如用 `PORT` 覆盖服务端口，需同步修改组件内 `ENV_DOMAINS`。

## 接入方式

> 面向接入方（宿主页面 + iframe 内容页开发者）的完整使用文档见 [docs/小蓝专家接入文档（前端）.md](docs/小蓝专家接入文档（前端）.md)，不含实现细节，可随 `ckc-expert-agent.umd.js` 一起分发。

脚本在各环境的固定地址（与 `options.env` 保持同一环境）：

| 环境 | 脚本地址 |
| --- | --- |
| dev | `http://lf18kg-dev.life.cpic.com/center/exts/ckc-expert-agent.umd.js` |
| sit | `http://lf18kg-sit.life.cpic.com/center/exts/ckc-expert-agent.umd.js` |
| prod | `http://lf18kg.life.cpic.com/center/exts/ckc-expert-agent.umd.js` |

```html
<!-- 示例：dev 环境；sit / prod 换成上表中对应环境的地址 -->
<script src="http://lf18kg-dev.life.cpic.com/center/exts/ckc-expert-agent.umd.js"></script>
<script>
  // 抽屉内容固定为 iframe；调用后页面上出现悬浮圆形按钮
  // iframe 最终地址：{域名}/center/thd/chat/{agentCode}[/{sessionId}]?token={token}
  var drawer = window.createCkcDrawer({
    env: 'dev', // 运行环境：dev / sit / pro
    token: 'xxxx',
    agentCode: 'agent-01',
    sessionId: 'sess-01', // 选填
    mask: true, // 选填：是否给左侧页面区域加遮盖层
    maskClosable: true, // 选填：点击遮盖层是否关闭抽屉（默认不关闭）
    closeSessionOnClose: true, // 选填：关闭抽屉时是否关闭当前 agent 会话（默认不关闭）
  });

  // 显隐通过返回的 DrawerHandle 控制
  drawer.open();  // 显示（首次调用时初始化 iframe）
  drawer.close(); // 隐藏（不销毁，iframe 继续运行）

  // 向 iframe 发消息（固定协议 drawer-message）：自动打开抽屉；
  // iframe 未就绪自动排队，就绪后按序补发
  drawer.sendMessage({
    message: '你好，帮我分析这份报告',
    files: [{ name: 'report.pdf', url: 'https://cdn.com/report.pdf', type: 'pdf' }],
    sessionId: 'sess-01', // 选填：唤起（续接）已有的 agent 会话
    directSend: true, // 选填：是否直接发送
  });

  // 接收 iframe 发来的消息 / sessionId / 显隐变化：宿主不需要自己监听 message 事件
  drawer.receiveMessage(function (message) {
    // message: { message, files, sessionId?, ...其它附带字段 }
    console.log('收到消息', message);
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
| `options.width` | `number` | `500` | 初始宽度（px） |
| `options.minWidth` | `number` | `500` | 最小宽度（px） |
| `options.maxWidth` | `number` | 视口宽度 | 最大宽度（px） |
| `options.mask` | `boolean` | `false` | 抽屉打开时是否给左侧页面区域加遮盖层（半透明遮罩，阻止操作宿主页） |
| `options.maskClosable` | `boolean` | `false` | 开启遮盖层（`mask: true`）后，点击遮盖层是否关闭抽屉 |
| `options.closeSessionOnClose` | `boolean` | `false` | 关闭抽屉时是否关闭当前 agent 会话；收到 iframe 就绪消息（`drawer-ready`）后随配置消息（`drawer-config`）发给 iframe，由智能体页面按此配置执行 |

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
| `isOpen` | 当前抽屉是否处于打开状态（未初始化、已关闭、已销毁时为 `false`） |
| `open()` | 显示抽屉（首次调用时初始化抽屉并加载 iframe） |
| `close()` | 隐藏抽屉（移出视口，不销毁；iframe 继续运行，滚动位置等状态保留） |
| `setWidth(width)` | 设置抽屉宽度（px，自动限制在 min/max 之间） |
| `sendMessage(payload)` | 向 iframe 发消息（固定协议 `drawer-message`，payload 为 `{message, files, sessionId?, directSend?}`——后两个可选：`sessionId` 用于唤起已有的 agent 会话、`directSend` 表示是否直接发送，均随消息原样传到 iframe）；**调用时自动打开抽屉**（未初始化则初始化 iframe）；iframe 就绪（`drawer-ready`）前自动排队，就绪后补发；发送失败也排队，重新就绪后补发 |
| `receiveMessage(handler)` | 接收消息：iframe 发来业务消息（`drawer-message`，payload 为 `{message, files, sessionId?, ...其它附带字段}`）时回调，返回取消监听函数 |
| `receiveSessionId(handler)` | 接收 sessionId：宿主未传 `options.sessionId` 时 iframe 生成并发出（`drawer-session`），宿主在此接收处理，返回取消监听函数 |
| `onVisibilityChange(handler)` | 监听抽屉显示/隐藏变化（含 iframe 内发 `drawer-close` 触发的隐藏），返回取消监听函数 |
| `destroy()` | 彻底销毁：移除悬浮按钮和抽屉 DOM 并解绑事件 |

## 消息协议（固定）

宿主与 iframe 的通信**固定为以下协议**。宿主**不需要也不应**直接使用 `window.postMessage` 或 `window.addEventListener('message')` 收发消息，统一走 `DrawerHandle` 的 `sendMessage` / `receiveMessage` / `receiveSessionId` / `onVisibilityChange` 方法——组件内部会校验消息来源（只接受本抽屉 `iframe.contentWindow` 发来的合规消息），其他消息一律丢弃。

**宿主 → iframe**（组件内部 `iframe.contentWindow.postMessage(msg, iframe 页面 origin)`）：

**1. 显隐消息**：抽屉**显示/隐藏**时（含 iframe 内发 `drawer-close` 触发的隐藏）：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-visibility-change',
  visible: true // true=显示，false=隐藏
}
```

**2. 业务消息（双向）**：宿主调用 `drawer.sendMessage(payload)` 时发给 iframe，payload 为 `{message, files, sessionId?, directSend?}`（`sessionId` 选填，用于唤起已有的 agent 会话；`directSend` 选填，是否直接发送；二者随消息原样传到 iframe，由 iframe 侧处理）；iframe 发同类型消息给宿主时由 `drawer.receiveMessage(handler)` 接收，payload 为 `{message, files, sessionId?, ...其它附带字段}`（`sessionId` 为可选会话 ID，其它附带字段原样透传；`message` 不是字符串或 `files` 不是 `DrawerFile[]` 的消息一律丢弃）：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-message',
  // 宿主 → iframe：{message, files, sessionId?, directSend?}（后两个可选）；
  // iframe → 宿主：{message, files, sessionId?, ...其它附带字段}
  payload: { message: '...', files: [{ name, url, type }] }
}
```

**3. 配置消息**（`drawer-config`）：宿主收到就绪消息（`drawer-ready`）后发出（iframe 刷新/重新初始化后再次发送），把创建时的 `DrawerOptions` 配置告知 iframe：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-config',
  payload: { closeSessionOnClose: false } // 关闭抽屉时是否关闭当前 agent 会话（options.closeSessionOnClose，默认 false）
}
```

由 iframe 页面按配置执行（抽屉关闭时是否结束当前 agent 会话）。

**iframe → 宿主**：iframe 内容方调用 `parent.postMessage(msg, '*')`，固定消息除第 2 条 `drawer-message`（业务消息，双向）外还有四种（其中 `drawer-fullscreen` / `drawer-close` 是**控制消息**，由组件内部消费、直接调整抽屉宽度/显隐，不派发给宿主回调）。

**4. 就绪消息**（`drawer-ready`）：iframe 页面**初始化完成后必须发出**（不带 payload），宿主以此判定 iframe 加载成功（**不以 `load` 事件判断**）：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-ready'
}
```

宿主收到后发送当前显隐状态，并补发排队的 `drawer-message`；iframe 刷新/重新初始化后应**再次发送**，宿主会重新补发上述消息。

**5. sessionId 消息**（`drawer-session`）：宿主在 `DrawerOptions` **未传 `sessionId`** 时，iframe 会生成一个 sessionId 并发出，payload 为该 sessionId 字符串：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-session',
  payload: 'sess-xxxxx' // iframe 生成的 sessionId
}
```

宿主通过 `drawer.receiveSessionId(handler)` 接收处理（如持久化下来，下次调用 `createCkcDrawer` 时通过 `options.sessionId` 传入续接同一会话）。

**6. 全屏消息**（`drawer-fullscreen`）：iframe 页面（如 header 上的全屏按钮）请求调整抽屉宽度时发出：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-fullscreen',
  fullscreen: true // true=全屏（抽屉宽度变为最大值 maxWidth），false=取消全屏（恢复默认宽度 options.width，未传则 500）
}
```

组件内部消费该消息直接调整抽屉宽度，不派发给宿主回调；`fullscreen` 非布尔值时忽略。

**7. 关闭消息**（`drawer-close`）：iframe 页面（如 header 上的关闭按钮）请求关闭抽屉时发出（不带 payload）：

```js
{
  source: 'ckc-expert-agent',
  type: 'drawer-close'
}
```

组件内部消费该消息，行为与 `drawer.close()` 一致：只隐藏抽屉（移出视口，不销毁），iframe 继续运行；宿主的 `onVisibilityChange` 会收到 `false`。

组件只接受本抽屉 `iframe.contentWindow` 发来的合规消息，其他消息一律丢弃；抽屉显隐变化由 `drawer.onVisibilityChange(handler)` 通知宿主（iframe 侧收到的仍是上面的显隐 postMessage）。

由于关闭抽屉只是隐藏、iframe 不会被销毁，iframe 内容在隐藏期间照常运行，随时可以按上述协议 `postMessage` 出来，宿主的 `receiveMessage` / `receiveSessionId` 照常收到。

**投递保证**：iframe 加载是否成功由 iframe 主动发 `drawer-ready` 就绪消息判定（组件**不以 `load` 事件判断**，`about:blank` / 浏览器错误页触发的 `load` 不会误判为成功）；收到就绪消息前，发往 iframe 的消息（`drawer-visibility-change` / `drawer-message`）只排队不发送，就绪后按序补发（配置消息 → 当前显隐 → 排队消息）；配置消息（`drawer-config`）不排队，每次收到就绪消息时按当前配置直接发一份。若 `postMessage` 失败（如 iframe 停在 `about:blank` / 浏览器错误页，origin 为 `'null'`），组件内部捕获该异常（不抛给宿主，只 `console.warn`），消息保留待 iframe 重新就绪后补发。若消息始终到不了 iframe，请检查：① **iframe 页面是否已实现就绪消息（`drawer-ready`）**；② 站点是否允许被内嵌（响应头 `X-Frame-Options` / `Content-Security-Policy: frame-ancestors`）；③ 宿主所在网络（如云桌面）能否访问对应环境域名；④ 浏览器控制台是否有 iframe 加载被拒绝的报错。
