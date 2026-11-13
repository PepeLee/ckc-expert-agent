/** 附件文件 */
export interface DrawerFile {
    /** 文件名 */
    name: string;
    /** 文件地址 */
    url: string;
    /** 文件类型（具体的文件类型，如 pdf、png） */
    type: string;
}
/** 业务消息数据（宿主经 sendMessage 发送给 iframe 的消息） */
export interface DrawerPayload {
    /** 消息文本 */
    message: string;
    /** 附件文件列表 */
    files: DrawerFile[];
    /** 会话 ID（选填）：用于唤起（续接）已有的 agent 会话，随消息原样传到 iframe */
    sessionId?: string;
    /** 是否直接发送（选填）：随消息原样传到 iframe，由智能体页面决定如何处理 */
    directSend?: boolean;
}
/** receiveMessage 回调收到的消息：在 DrawerPayload 基础上可附带其它自定义字段，原样透传 */
export interface DrawerMessagePayload extends DrawerPayload {
    /** 会话 ID（选填）：iframe 发消息时可附带当前会话的 sessionId */
    sessionId?: string;
    /** 其它附带字段：iframe 侧自定义附加数据，原样透传 */
    [key: string]: any;
}
/** 运行环境（local 用于本地联调） */
export type DrawerEnv = 'dev' | 'sit' | 'pro' | 'local';
export interface DrawerOptions {
    /** 运行环境（必填）：dev / sit / pro / local，决定 iframe 站点域名 */
    env: DrawerEnv;
    /** 鉴权 token（必填），会作为 token 查询参数拼到 iframe 地址上（?token=xxx） */
    token: string;
    /** 智能体编码（必填），会作为路径段拼到 iframe 地址上（/center/thd/chat/{agentCode}） */
    agentCode: string;
    /** 会话 ID（选填），传入时拼到路径上（/center/thd/chat/{agentCode}/{sessionId}），不传则不拼；
     *  不传时 iframe 会生成 sessionId 并发回，宿主用 receiveSessionId 接收处理 */
    sessionId?: string;
    /** 初始宽度（px），默认 500 */
    width?: number;
    /** 最小宽度（px），默认 500；取消全屏（drawer-fullscreen: false）时抽屉宽度变为该值 */
    minWidth?: number;
    /** 最大宽度（px），默认视口宽度；全屏（drawer-fullscreen: true）时抽屉宽度变为该值 */
    maxWidth?: number;
    /** 是否开启拖拽调整抽屉宽度（默认开启）；设为 false 时关闭拖拽调宽（不渲染拖拽把手） */
    resizable?: boolean;
    /** 抽屉打开时是否给左侧页面区域加遮盖层（默认不开启） */
    mask?: boolean;
    /** 开启遮盖层（mask: true）后，点击遮盖层是否关闭抽屉（默认不关闭） */
    maskClosable?: boolean;
    /** 关闭抽屉时是否暂停当前 agent 会话（默认不暂停）；
     *  收到 iframe 的 drawer-ready 就绪消息后随配置消息（drawer-config）发给 iframe，由智能体页面按此配置执行 */
    closeSessionOnClose?: boolean;
    /** 从悬浮按钮打开抽屉时是否重新开启新会话（默认不重新开启）；
     *  随配置消息（drawer-config）发给 iframe，由智能体页面结合打开方式（openSource）按此配置执行 */
    newSessionOnLauncherOpen?: boolean;
    /** 是否开启关闭确认弹窗（默认不开启）：开启后，当前 agent 处于正在会话状态时关闭抽屉会弹出组件内置
     *  确认弹窗（确定=关闭 / 取消=保持显示），不在会话状态直接关闭；此时关闭方向由内置弹窗决定
     *  （onVisibilityChange 回调仍触发用于感知，但返回值不控制关闭），显示方向仍可由回调返回值控制；
     *  不开启时仍可由 onVisibilityChange 返回布尔值 / Promise<boolean> 自行控制显隐 */
    confirmOnClose?: boolean;
    /** 关闭确认弹窗的提示文案（选填，配合 confirmOnClose: true 使用）；不传时默认「当前有任务正在运行，关闭会取消任务，确认关闭吗？」 */
    confirmOnCloseText?: string;
    /** 是否生成悬浮图标入口（默认生成）；设为 false 时不生成悬浮按钮，抽屉只通过 DrawerHandle 的 open() / sendMessage() 等控制 */
    launcher?: boolean;
    /** 组件整体层级（z-index，默认 2147483647 浮在页面所有内容之上）：抽屉 / 内置确认弹窗为该值，悬浮按钮 / 遮盖层为该值 - 1；
     *  接入方自定义弹窗（如自建关闭确认框）需要盖过抽屉时，把该值调低到自家弹窗层级之下（如 1000） */
    zIndex?: number;
}
/** 抽屉打开方式：launcher=点击悬浮图标打开，handle=调用 DrawerHandle.open()（含 sendMessage 自动打开） */
export type DrawerOpenSource = 'launcher' | 'handle';
/** 抽屉显隐变化时发给 iframe 的消息（宿主侧通过 onVisibilityChange 回调感知） */
export interface DrawerVisibilityMessage {
    source: 'ckc-expert-agent';
    type: 'drawer-visibility-change';
    visible: boolean;
    /** 打开方式（仅 visible: true 时带）：launcher=点击悬浮图标打开，handle=调用 DrawerHandle.open()（含 sendMessage 自动打开） */
    openSource?: DrawerOpenSource;
}
/**
 * 宿主发给 iframe 的配置消息（type: drawer-config）：
 * 收到 iframe 的 drawer-ready 就绪消息后发出（iframe 刷新/重新初始化后再次发送），
 * 告知创建时的 DrawerOptions 配置，由 iframe 页面按配置执行。
 */
export interface DrawerConfigMessage {
    source: 'ckc-expert-agent';
    type: 'drawer-config';
    /** 配置项 */
    payload: {
        /** 关闭抽屉时是否暂停当前 agent 会话 */
        closeSessionOnClose: boolean;
        /** 从悬浮按钮打开抽屉时是否重新开启新会话 */
        newSessionOnLauncherOpen: boolean;
    };
}
/**
 * 宿主发给 iframe 的宽度状态消息（type: drawer-width-state）：
 * 拖拽调整抽屉宽度结束时发出（iframe 刷新/重新初始化后重新就绪时补发当前状态），
 * 告知当前抽屉宽度是否处于最大值 / 最小值，供 iframe 页面控制「全屏 / 取消全屏」按钮状态
 * （如：宽度为最大值时按钮显示「取消全屏」，否则显示「全屏」）。
 */
export interface DrawerWidthStateMessage {
    source: 'ckc-expert-agent';
    type: 'drawer-width-state';
    /** 当前抽屉宽度是否为最大值（options.maxWidth） */
    atMax: boolean;
    /** 当前抽屉宽度是否为最小值（options.minWidth） */
    atMin: boolean;
}
/**
 * 业务消息（固定协议 drawer-message，双向）：
 * 宿主经 drawer.sendMessage() 发给 iframe（payload 为 DrawerPayload：{message, files, sessionId?, directSend?}）；
 * iframe 也可发给宿主（payload 为 DrawerMessagePayload：{message, files, sessionId?, ...其它附带字段}），由 drawer.receiveMessage() 接收。
 */
export interface DrawerMessage {
    source: 'ckc-expert-agent';
    type: 'drawer-message';
    payload: DrawerPayload;
}
/** receiveMessage 回调：接收 iframe 发来的业务消息（{message, files, ...其它附带字段}） */
export type DrawerMessageHandler = (message: DrawerMessagePayload) => void;
/**
 * iframe 发给宿主的 sessionId 消息（type: drawer-session）：
 * 宿主未在 DrawerOptions 传 sessionId 时，iframe 生成 sessionId 并发出。
 */
export interface DrawerSessionMessage {
    source: 'ckc-expert-agent';
    type: 'drawer-session';
    /** iframe 生成的 sessionId */
    payload: string;
}
/**
 * iframe 发给宿主的就绪消息（type: drawer-ready，不带 payload）：
 * iframe 页面初始化完成后发出，宿主收到后才认定加载成功（不以 load 事件判断），补发当前显隐和排队消息；
 * iframe 刷新/重新初始化后应再次发送，宿主会重新补发当前显隐和排队消息。
 */
export interface DrawerReadyMessage {
    source: 'ckc-expert-agent';
    type: 'drawer-ready';
}
/**
 * iframe 发给宿主的全屏消息（type: drawer-fullscreen）：
 * fullscreen: true 时抽屉宽度调整为最大值（options.maxWidth），false 时调整为最小值（options.minWidth）。
 * 由组件内部消费（调整抽屉宽度），不派发给宿主回调。
 */
export interface DrawerFullscreenMessage {
    source: 'ckc-expert-agent';
    type: 'drawer-fullscreen';
    fullscreen: boolean;
}
/**
 * iframe 发给宿主的关闭消息（type: drawer-close）：
 * 与抽屉上原来的关闭按钮行为一致——只隐藏抽屉（移出视口），不销毁，iframe 继续运行。
 * 由组件内部消费，不派发给宿主回调。
 */
export interface DrawerCloseMessage {
    source: 'ckc-expert-agent';
    type: 'drawer-close';
}
/**
 * iframe 发给宿主的会话状态消息（type: drawer-session-state）：
 * sessionActive 表示当前 iframe 的 agent 是否处于正在会话状态（true=正在会话中）。
 * iframe 初始化完成后上报当前状态，状态变化时再次上报；
 * 组件内部缓存该状态，随 onVisibilityChange 回调的第二参 sessionActive 带给宿主，不单独派发回调。
 */
export interface DrawerSessionStateMessage {
    source: 'ckc-expert-agent';
    type: 'drawer-session-state';
    sessionActive: boolean;
}
/** receiveSessionId 回调：接收 iframe 生成的 sessionId */
export type DrawerSessionHandler = (sessionId: string) => void;
/**
 * onVisibilityChange 回调：抽屉显示/隐藏变化（在显隐生效前触发，visible 为本次请求的显隐；
 * sessionActive 为当前 iframe 的 agent 是否处于正在会话状态，由 iframe 上报，未上报时为 false）。
 * 默认不返回值：抽屉照常直接显示/隐藏；
 * 返回布尔值或 Promise<boolean> 可自行控制本次显隐（返回值即最终状态：true=显示 / false=隐藏），
 * 多个回调时按注册顺序以第一个明确的布尔值为准；抛错 / Promise 被拒绝按默认显隐处理。
 * 开启 options.confirmOnClose 后关闭方向由组件内置确认弹窗决定（回调返回值不控制关闭），显示方向仍可控制。
 */
export type DrawerVisibilityHandler = (visible: boolean, sessionActive: boolean) => void | boolean | Promise<boolean | void>;
export interface DrawerHandle {
    /** 抽屉内的 iframe 元素，首次打开抽屉前为 null */
    readonly iframe: HTMLIFrameElement | null;
    /** 当前抽屉是否处于打开状态（未初始化、已关闭、已销毁时为 false） */
    readonly isOpen: boolean;
    /** 显示抽屉（首次显示时初始化抽屉并加载 iframe；onVisibilityChange 回调可返回布尔值 / Promise<boolean> 自行控制是否显示） */
    open(): void;
    /** 隐藏抽屉（移出视口但不销毁，iframe 继续运行，滚动条等状态保留）；
     *  开启 options.confirmOnClose 且当前处于会话状态时先弹内置确认弹窗，确认后才隐藏 */
    close(): void;
    /** 设置抽屉宽度（px，自动限制在 min/max 之间） */
    setWidth(width: number): void;
    /** 向 iframe 发送一条消息（自动打开抽屉；固定协议 drawer-message；
     *  payload 可附带可选 sessionId（唤起已有的 agent 会话）、directSend（是否直接发送），随消息原样传到 iframe；
     *  iframe 就绪前自动排队，就绪后按序补发） */
    sendMessage(payload: DrawerPayload): void;
    /** 接收消息：iframe 发来业务消息（drawer-message，payload 为 {message, files, ...其它附带字段}）时回调，返回取消监听函数 */
    receiveMessage(handler: DrawerMessageHandler): () => void;
    /** 接收 sessionId：宿主未传 options.sessionId 时 iframe 生成并发出（drawer-session），宿主在此接收处理，返回取消监听函数 */
    receiveSessionId(handler: DrawerSessionHandler): () => void;
    /** 监听抽屉显示/隐藏变化（含 iframe 内发 drawer-close 触发的隐藏），返回取消监听函数；
     *  回调在显隐生效前触发（visible 为请求的显隐，第二参 sessionActive 为当前 iframe 的 agent
     *  是否处于正在会话状态），不返回值时按默认直接显示/隐藏，
     *  返回布尔值或 Promise<boolean> 可自行控制最终显隐（true=显示 / false=隐藏）；
     *  开启 options.confirmOnClose 后关闭方向由组件内置确认弹窗决定（回调返回值不控制关闭） */
    onVisibilityChange(handler: DrawerVisibilityHandler): () => void;
    /** 彻底销毁：移除悬浮按钮和抽屉 DOM 并解绑事件 */
    destroy(): void;
}
/**
 * 在当前页面创建一个可拖动的悬浮圆形按钮。
 * 点击按钮初始化并显示右侧抽屉（内容为加载固定格式地址的 iframe）；
 * 抽屉本身不常驻关闭按钮（iframe 未就绪时右上角显示内置关闭图标兜底，就绪后自动隐藏），
 * iframe 页面通过固定协议控制抽屉：
 * 发 drawer-fullscreen 调整抽屉宽度（最大值/最小值），发 drawer-close 关闭抽屉
 * （关闭只是隐藏，iframe 不会被销毁、继续运行），也可由宿主通过 handle.close() 关闭；
 * 再次点击悬浮按钮可重新显示抽屉。
 * 抽屉以 Shadow DOM 渲染，不受接入方页面 CSS 影响，也不会污染接入方页面。
 */
export declare function createDrawer(options: DrawerOptions): DrawerHandle;
declare global {
    interface Window {
        /** 创建页面上的悬浮按钮 + 右侧抽屉，返回 DrawerHandle 控制显隐 */
        createCkcDrawer: typeof createDrawer;
    }
}

// UMD 全局命名空间：script 标签引入后 window.CkcExpertAgent 上的导出
export as namespace CkcExpertAgent;
