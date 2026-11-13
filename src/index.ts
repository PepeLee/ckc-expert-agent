import { LAUNCHER_ICON_SVG } from './icon';

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
export type DrawerVisibilityHandler = (
  visible: boolean,
  sessionActive: boolean,
) => void | boolean | Promise<boolean | void>;

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

const DEFAULT_WIDTH = 500;
/** 各环境对应的站点域名 */
const ENV_DOMAINS: Record<DrawerEnv, string> = {
  dev: 'http://lf18kg-dev.life.cpic.com',
  sit: 'http://lf18kg-sit.life.cpic.com',
  pro: 'http://lf18kg.life.cpic.com',
  local: 'http://localhost:4173',
};
const DEFAULT_MIN_WIDTH = 500;
/** 默认组件层级（32 位有符号整数最大值），保证抽屉浮在接入方页面所有内容之上；可用 options.zIndex 调整 */
const Z_INDEX = 2147483647;
const LAUNCHER_SIZE = 48;
const LAUNCHER_MARGIN = 24;
/** 位移超过该阈值（px）视为拖动，否则视为点击 */
const DRAG_THRESHOLD = 5;
/** 未收到 iframe 的 drawer-ready 就绪消息时，加载动画的最长显示时间（ms）；超时停止动画，避免一直转圈挡住 iframe 内容 */
const LOADER_FALLBACK_MS = 10000;
/** 关闭确认弹窗的默认提示文案（options.confirmOnCloseText 未传时使用） */
const DEFAULT_CONFIRM_TEXT = '当前有任务正在运行，关闭会取消任务，确认关闭吗？';
/** 关闭确认弹窗（options.confirmOnClose）的样式：全屏遮罩 + 居中卡片，浮在页面最上方 */
const CONFIRM_STYLES = `
  .confirm-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
  .confirm-backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.35); }
  .confirm-card { position: relative; box-sizing: border-box; background: #fff; border-radius: 8px; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2); padding: 20px 24px; max-width: 360px; width: calc(100vw - 48px); }
  .confirm-message { font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 16px; }
  .confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .confirm-btn { min-width: 64px; height: 32px; padding: 0 16px; border-radius: 4px; border: 1px solid #d9d9d9; background: #fff; color: #333; font-size: 13px; cursor: pointer; }
  .confirm-btn--cancel:hover { border-color: #4096ff; color: #4096ff; }
  .confirm-btn--ok { background: #1677ff; border-color: #1677ff; color: #fff; }
  .confirm-btn--ok:hover { background: #4096ff; border-color: #4096ff; }
`;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** 校验产物文件条目（DrawerFile） */
const isDrawerFile = (f: unknown): f is DrawerFile =>
  !!f &&
  typeof (f as DrawerFile).name === 'string' &&
  typeof (f as DrawerFile).url === 'string' &&
  typeof (f as DrawerFile).type === 'string';

/** 生成 iframe 地址：{域名}/center/thd/chat/{agentCode}[/{sessionId}]?token={token} */
const buildFrameSrc = (
  domain: string,
  token: string,
  agentCode: string,
  sessionId?: string,
): string => {
  const base = domain.replace(/\/+$/, '');
  const sessionSeg = sessionId ? `/${encodeURIComponent(sessionId)}` : '';
  return `${base}/center/thd/chat/${encodeURIComponent(agentCode)}${sessionSeg}?token=${encodeURIComponent(token)}`;
};

const LAUNCHER_STYLES = `
  :host {
    all: initial;
    position: fixed;
    left: 0;
    top: 0;
    display: block;
    width: ${LAUNCHER_SIZE}px;
    height: ${LAUNCHER_SIZE}px;
  }
  .btn {
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    cursor: grab;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
  }
  .btn svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  :host(.ckc-launcher--dragging) .btn {
    cursor: grabbing;
  }
`;

/** 遮盖层（options.mask 开启时）：抽屉打开时盖住左侧页面区域；点击遮盖层是否关闭抽屉由 options.maskClosable 控制 */
const MASK_STYLES = `
  :host {
    all: initial;
    position: fixed;
    inset: 0;
    display: block;
  }
  :host(.ckc-mask--hidden) {
    display: none;
  }
  .mask {
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.45);
  }
`;

const DRAWER_STYLES = `
  :host {
    all: initial;
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    height: 100dvh;
    display: block;
    width: ${DEFAULT_WIDTH}px;
    box-sizing: border-box;
    background: #ffffff;
    color: #1f2329;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    box-shadow: -2px 0 16px rgba(0, 0, 0, 0.16);
    transition: transform 0.2s ease;
  }
  /* 隐藏 = 平移出视口：不拆布局盒子，iframe 不重载，
     内部滚动条、表单、JS 状态全部保留，rAF 也不会暂停 */
  :host(.ckc-drawer--hidden) {
    transform: translateX(100%);
    pointer-events: none;
  }
  .panel {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 6px;
    cursor: ew-resize;
    touch-action: none;
    background-color: transparent;
    z-index: 1;
  }
  .resize-handle:hover,
  :host(.ckc-drawer--dragging) .resize-handle {
    background-color: rgba(64, 158, 255, 0.4);
  }
  :host(.ckc-drawer--dragging) {
    user-select: none;
    cursor: ew-resize;
  }
  .frame {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #ffffff;
  }
  /* iframe 就绪（drawer-ready）前的加载动画，避免 iframe 初始化慢时抽屉长时间空白 */
  .loader {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #ffffff;
    color: #8c8c8c;
    font-family: system-ui, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 14px;
    pointer-events: none;
  }
  .ckc-loader--hidden {
    display: none;
  }
  .loader-spinner {
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    border: 3px solid #e8e8e8;
    border-top-color: #1677ff;
    border-radius: 50%;
    animation: ckc-loader-spin 0.8s linear infinite;
  }
  @keyframes ckc-loader-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

/**
 * 在当前页面创建一个可拖动的悬浮圆形按钮。
 * 点击按钮初始化并显示右侧抽屉（内容为加载固定格式地址的 iframe）；
 * 抽屉本身不带关闭按钮，iframe 页面通过固定协议控制抽屉：
 * 发 drawer-fullscreen 调整抽屉宽度（最大值/最小值），发 drawer-close 关闭抽屉
 * （关闭只是隐藏，iframe 不会被销毁、继续运行），也可由宿主通过 handle.close() 关闭；
 * 再次点击悬浮按钮可重新显示抽屉。
 * 抽屉以 Shadow DOM 渲染，不受接入方页面 CSS 影响，也不会污染接入方页面。
 */
export function createDrawer(options: DrawerOptions): DrawerHandle {
  const domain = options && options.env ? ENV_DOMAINS[options.env] : undefined;
  if (!domain) {
    throw new TypeError(
      '[ckc-expert-agent] createDrawer: 必须通过 options.env 指定运行环境（dev / sit / pro / local）',
    );
  }
  if (typeof options.token !== 'string' || options.token === '') {
    throw new TypeError(
      '[ckc-expert-agent] createDrawer: 必须通过 options.token 传入鉴权 token',
    );
  }
  if (typeof options.agentCode !== 'string' || options.agentCode === '') {
    throw new TypeError(
      '[ckc-expert-agent] createDrawer: 必须通过 options.agentCode 传入智能体编码',
    );
  }
  if (
    options.zIndex !== undefined &&
    (typeof options.zIndex !== 'number' || !Number.isFinite(options.zIndex))
  ) {
    throw new TypeError('[ckc-expert-agent] createDrawer: options.zIndex 必须是有限数字');
  }
  /** 组件整体层级：抽屉 / 内置确认弹窗 = zIndex，悬浮按钮 / 遮盖层 = zIndex - 1；小数取整，范围收拢到 [0, 2147483647] */
  const zIndex = clamp(Math.trunc(options.zIndex ?? Z_INDEX), 0, Z_INDEX);

  const minWidth = Math.max(0, options.minWidth ?? DEFAULT_MIN_WIDTH);
  const maxWidth = Math.max(
    minWidth,
    Math.min(options.maxWidth ?? window.innerWidth, window.innerWidth),
  );
  let width = clamp(options.width ?? DEFAULT_WIDTH, minWidth, maxWidth);

  // iframe 内容方接收 postMessage 的目标 origin，推导失败时退回 '*'
  let frameTargetOrigin = '*';
  try {
    const origin = new URL(domain).origin;
    if (origin && origin !== 'null') frameTargetOrigin = origin;
  } catch {
    // 保持 '*'
  }

  // ---------- 悬浮圆形按钮（options.launcher === false 时不生成，抽屉只由 DrawerHandle 控制） ----------
  let launcherHost: HTMLDivElement | null = null;
  let btnX = Math.max(0, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_MARGIN);
  let btnY = Math.max(0, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_MARGIN);
  const applyBtnPos = (): void => {
    if (!launcherHost) return;
    launcherHost.style.left = `${btnX}px`;
    launcherHost.style.top = `${btnY}px`;
  };
  if (options.launcher !== false) {
    launcherHost = document.createElement('div');
    launcherHost.style.zIndex = String(zIndex - 1); // 略低于抽屉，抽屉打开时盖在按钮上方
    const launcherShadow = launcherHost.attachShadow({ mode: 'open' });
    launcherShadow.innerHTML = `
    <style>${LAUNCHER_STYLES}</style>
    <button class="btn" type="button" aria-label="打开抽屉">
      ${LAUNCHER_ICON_SVG}
    </button>
  `;
    applyBtnPos();
  }

  // ---------- 抽屉（首次点击按钮时初始化） ----------
  let drawerHost: HTMLDivElement | null = null;
  /** 遮盖层（options.mask 开启时创建）：抽屉打开时盖住左侧页面区域 */
  let maskHost: HTMLDivElement | null = null;
  let frame: HTMLIFrameElement | null = null;
  let visible = false;
  /** 本次打开的方式（visible: true 的显隐消息带上；重新就绪补发当前状态时沿用） */
  let openSource: DrawerOpenSource = 'handle';
  let destroyed = false;
  /** iframe 就绪：已收到 iframe 的 drawer-ready 就绪消息（不以 load 事件判断加载成功）；此前 sendMessage/显隐排队，此后直发 */
  let frameReady = false;
  /** 当前 iframe 的 agent 是否处于正在会话状态（由 iframe 发 drawer-session-state 上报，未上报时为 false） */
  let sessionActive = false;
  /** 加载动画兜底定时器：超时未收到 drawer-ready 时停止动画 */
  let loaderFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  /** 当前进行中的拖拽收尾函数（左边框调宽 / 悬浮按钮拖动），新拖拽或销毁前强制收尾，防事件丢失卡死 */
  let activeDragEnd: (() => void) | null = null;
  /** iframe 就绪前排队、或发送失败待 iframe 重新就绪后补发的 drawer-message */
  const pendingMessages: DrawerMessage[] = [];
  const messageHandlers = new Set<DrawerMessageHandler>();
  const sessionHandlers = new Set<DrawerSessionHandler>();
  const visibilityHandlers = new Set<DrawerVisibilityHandler>();

  /** 设置抽屉宽度（px，自动限制在 min/max 之间），drawer-fullscreen 与 handle.setWidth 共用 */
  const applyWidth = (w: number): void => {
    width = clamp(w, minWidth, maxWidth);
    if (drawerHost) drawerHost.style.width = `${width}px`;
  };

  // 宿主 ↔ iframe 消息固定为 drawer-visibility-change / drawer-config / drawer-width-state /
  // drawer-message（双向）/ drawer-ready / drawer-session / drawer-session-state / drawer-fullscreen / drawer-close 九种，
  // 宿主统一用 sendMessage / receiveMessage / receiveSessionId / onVisibilityChange 收发，不直接使用 postMessage / message 事件。
  // 这里只接受本抽屉 iframe 发来的合规消息，其余一律丢弃。
  const onWindowMessage = (e: MessageEvent): void => {
    if (!frame || e.source !== frame.contentWindow) return;
    const data = e.data as {
      source?: string;
      type?: string;
      payload?: unknown;
      fullscreen?: unknown;
      sessionActive?: unknown;
    } | null;
    if (!data || data.source !== 'ckc-expert-agent') return;
    if (data.type === 'drawer-ready') {
      // iframe 页面初始化完成（刷新/重新初始化后会再次发）：补发当前显隐和排队消息
      onFrameReady();
    } else if (data.type === 'drawer-message') {
      // iframe 发来的业务消息：{message, files, ...其它附带字段}，校验后原样派发给 receiveMessage
      const msg = data.payload as Partial<DrawerPayload> | null;
      if (
        !msg ||
        typeof msg.message !== 'string' ||
        !Array.isArray(msg.files) ||
        !msg.files.every(isDrawerFile)
      ) {
        return;
      }
      for (const handler of [...messageHandlers]) handler(msg as DrawerMessagePayload);
    } else if (data.type === 'drawer-session') {
      const sessionId = data.payload;
      if (typeof sessionId !== 'string' || sessionId === '') return;
      for (const handler of [...sessionHandlers]) handler(sessionId);
    } else if (data.type === 'drawer-session-state') {
      // iframe 上报 agent 会话状态（是否正在会话）：只缓存，随 onVisibilityChange 回调第二参带给宿主
      const active = data.sessionActive;
      if (typeof active !== 'boolean') return;
      sessionActive = active;
    } else if (data.type === 'drawer-fullscreen') {
      // iframe 内全屏按钮：true 调到最大宽度，false 调到最小宽度（组件内部消费，不派发给宿主回调）
      const fullscreen = data.fullscreen;
      if (typeof fullscreen !== 'boolean') return;
      applyWidth(fullscreen ? maxWidth : minWidth);
    } else if (data.type === 'drawer-close') {
      // iframe 内关闭按钮：与原抽屉关闭按钮一致，只隐藏不销毁
      close();
    }
  };
  window.addEventListener('message', onWindowMessage);

  /**
   * 向 iframe 文档发协议消息，失败不抛错。
   * iframe 可能停在 about:blank / 浏览器错误页（origin 为 'null'，如被 X-Frame-Options / CSP 拦截、
   * 网络不通、iframe 尚未导航完成），此时 postMessage 会抛
   * "The target origin provided ... does not match the recipient window's origin ('null')" 异常；
   * 这里统一捕获，消息保留待 iframe 重新就绪（再发 drawer-ready）后补发，绝不把异常抛给宿主。
   */
  const postToFrame = (
    msg: DrawerVisibilityMessage | DrawerConfigMessage | DrawerWidthStateMessage | DrawerMessage,
  ): boolean => {
    const target = frame?.contentWindow;
    if (!target) return false;
    try {
      target.postMessage(msg, frameTargetOrigin);
      return true;
    } catch (err) {
      console.warn('[ckc-expert-agent] 向 iframe 发消息失败（iframe 可能未真正加载）：', err);
      return false;
    }
  };

  /** 隐藏加载动画（iframe 就绪或超时兜底时调用） */
  const hideLoader = (): void => {
    drawerHost?.shadowRoot?.querySelector('.loader')?.classList.add('ckc-loader--hidden');
  };

  /**
   * iframe 发来 drawer-ready（就绪消息）后补发一轮：
   * 1) 配置消息（drawer-config，含 closeSessionOnClose / newSessionOnLauncherOpen）；2) 当前显隐状态；3) 排队/发送失败的 sendMessage 消息。
   * iframe 刷新/重新初始化后会再次发就绪消息，这里同样重新补发，保证新文档拿到当前状态。
   */
  const onFrameReady = (): void => {
    frameReady = true;
    // iframe 已就绪：隐藏加载动画（就绪前显示，避免抽屉长时间空白）
    if (loaderFallbackTimer !== null) {
      clearTimeout(loaderFallbackTimer);
      loaderFallbackTimer = null;
    }
    hideLoader();
    // 先发配置（关闭抽屉是否关会话 / 悬浮按钮打开是否新开会话），再发当前显隐和宽度状态，最后补发排队消息
    postToFrame({
      source: 'ckc-expert-agent',
      type: 'drawer-config',
      payload: {
        closeSessionOnClose: options.closeSessionOnClose === true,
        newSessionOnLauncherOpen: options.newSessionOnLauncherOpen === true,
      },
    });
    postToFrame(visibilityMessage(visible));
    postToFrame(widthStateMessage()); // 当前宽度状态（iframe 刷新重新就绪后全屏按钮状态才同步得上）
    while (pendingMessages.length > 0) {
      if (!postToFrame(pendingMessages[0])) break;
      pendingMessages.shift();
    }
  };

  /** 构造显隐消息：visible: true 时带打开方式（openSource），visible: false 不带 */
  const visibilityMessage = (v: boolean): DrawerVisibilityMessage => {
    const msg: DrawerVisibilityMessage = {
      source: 'ckc-expert-agent',
      type: 'drawer-visibility-change',
      visible: v,
    };
    if (v) msg.openSource = openSource;
    return msg;
  };

  /** 构造宽度状态消息：当前抽屉宽度是否处于最大值 / 最小值（供 iframe 控制「全屏 / 取消全屏」按钮状态） */
  const widthStateMessage = (): DrawerWidthStateMessage => ({
    source: 'ckc-expert-agent',
    type: 'drawer-width-state',
    atMax: width === maxWidth,
    atMin: width === minWidth,
  });

  /** 同步宽度状态给 iframe（拖拽调宽结束时调用）；iframe 未就绪不发，由 onFrameReady 补发 */
  const notifyWidthState = (): void => {
    if (frameReady) postToFrame(widthStateMessage());
  };

  /** 触发 onVisibilityChange 回调（返回值供显隐控制用）；单个回调抛错 / 拒绝不影响其它回调与后续流程 */
  const fireVisibilityHandlers = (v: boolean): unknown[] => {
    const results: unknown[] = [];
    for (const handler of [...visibilityHandlers]) {
      try {
        const r: unknown = handler(v, sessionActive);
        if (r && typeof (r as PromiseLike<unknown>).then === 'function') {
          // 拒绝按默认显隐处理（转为中立值）：notify（destroy）路径丢弃返回值也不会产生未处理的 Promise 拒绝
          results.push(
            (r as PromiseLike<unknown>).then(
              (val: unknown) => val,
              (err: unknown) => {
                console.warn('[ckc-expert-agent] onVisibilityChange 回调的 Promise 被拒绝，按默认显隐处理', err);
                return undefined;
              },
            ),
          );
        } else {
          results.push(r);
        }
      } catch (err) {
        console.warn('[ckc-expert-agent] onVisibilityChange 回调执行出错，按默认显隐处理', err);
      }
    }
    return results;
  };

  /** 直接通知显隐（不接受回调控制）：仅 destroy 清场时使用 */
  const notify = (v: boolean): void => {
    // iframe 就绪前不发（发给 about:blank 会因 origin 不匹配抛错），就绪时由 onFrameReady 补发当前状态
    if (frameReady) postToFrame(visibilityMessage(v));
    fireVisibilityHandlers(v);
  };

  /** 在途显隐请求的目标值（null=无在途请求）：同向请求不重复触发回调 */
  let pendingVisibility: boolean | null = null;
  /** 显隐请求令牌：回调返回 Promise 时的异步决定只对最新一次请求生效 */
  let visibilityToken = 0;
  /** 在途关闭确认弹窗的收起函数（options.confirmOnClose 开启且会话中关闭时弹出）：新的显隐请求 / destroy 时强制收起 */
  let dismissConfirm: (() => void) | null = null;

  /**
   * 弹出组件内置的关闭确认弹窗，返回 Promise<boolean>（true=用户确认关闭，false=取消/保持显示）。
   * 交互：点「确定」/ Enter = 确认关闭，点「取消」/ Esc / 点遮罩 = 取消；
   * 同时只存在一个弹窗，被收起时按取消处理（显隐请求的令牌机制保证作废结果不生效）。
   */
  const askCloseConfirm = (): Promise<boolean> => {
    dismissConfirm?.(); // 已有在途弹窗先收起（按取消），本次弹窗接管
    return new Promise<boolean>((resolve) => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>${CONFIRM_STYLES}</style>
        <div class="confirm-overlay">
          <div class="confirm-backdrop"></div>
          <div class="confirm-card" role="alertdialog" aria-modal="true" aria-label="关闭确认">
            <div class="confirm-message"></div>
            <div class="confirm-actions">
              <button type="button" class="confirm-btn confirm-btn--cancel">取消</button>
              <button type="button" class="confirm-btn confirm-btn--ok">确定</button>
            </div>
          </div>
        </div>
      `;
      (shadow.querySelector('.confirm-message') as HTMLDivElement).textContent =
        options.confirmOnCloseText || DEFAULT_CONFIRM_TEXT;
      // 与抽屉同层（options.zIndex）；弹窗宿主后挂 DOM，天然盖在抽屉上方
      (shadow.querySelector('.confirm-overlay') as HTMLDivElement).style.zIndex = String(zIndex);
      const okBtn = shadow.querySelector('.confirm-btn--ok') as HTMLButtonElement;
      const cancelBtn = shadow.querySelector('.confirm-btn--cancel') as HTMLButtonElement;
      const backdrop = shadow.querySelector('.confirm-backdrop') as HTMLDivElement;
      let settled = false;
      const finish = (confirmed: boolean): void => {
        if (settled) return;
        settled = true;
        dismissConfirm = null;
        window.removeEventListener('keydown', onKeyDown);
        host.remove();
        resolve(confirmed);
      };
      const onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        }
      };
      okBtn.addEventListener('click', () => finish(true));
      cancelBtn.addEventListener('click', () => finish(false));
      backdrop.addEventListener('click', () => finish(false));
      window.addEventListener('keydown', onKeyDown);
      dismissConfirm = () => finish(false);
      document.body.appendChild(host);
      okBtn.focus();
    });
  };

  /** 应用最终显隐（v=最终显隐）：只改 DOM / 状态并通知 iframe；onVisibilityChange 回调已在请求阶段触发过 */
  const applyVisibility = (v: boolean, src: DrawerOpenSource): void => {
    if (destroyed || v === visible) return;
    if (v) {
      if (!drawerHost) initDrawer();
      (drawerHost as HTMLDivElement).classList.remove('ckc-drawer--hidden');
      (drawerHost as HTMLDivElement).inert = false;
      maskHost?.classList.remove('ckc-mask--hidden');
      openSource = src;
      visible = true;
    } else {
      if (!drawerHost) return;
      // 只隐藏不销毁：平移出视口（保留布局盒子），iframe 内容继续运行、滚动状态保留
      drawerHost.classList.add('ckc-drawer--hidden');
      drawerHost.inert = true;
      maskHost?.classList.add('ckc-mask--hidden');
      visible = false;
    }
    if (frameReady) postToFrame(visibilityMessage(v));
  };

  /**
   * 请求显隐（v=请求的显隐）：先触发 onVisibilityChange 回调（参数为请求值）再生效——
   * 回调可返回布尔值或 Promise<boolean> 自行控制本次显隐（返回值即最终状态：true=显示 / false=隐藏），
   * 不返回（或返回非布尔）则按默认直接显示/隐藏；多个回调按注册顺序以第一个明确的布尔值为准。
   * 回调返回 Promise 时显隐在其结算后生效，期间更新的显隐请求 / destroy 会取消本次生效。
   * 开启 options.confirmOnClose 后关闭方向由内置确认弹窗决定（会话中弹窗确认，非会话直接关闭），
   * 回调仍触发用于感知但返回值不控制关闭；显示方向不受影响。
   */
  const requestVisibility = (v: boolean, src: DrawerOpenSource): void => {
    if (destroyed) return;
    if (pendingVisibility === v) return; // 同向请求已在途，不重复触发回调
    if (pendingVisibility === null && v === visible) return; // 已是目标状态，不触发回调
    const token = ++visibilityToken;
    pendingVisibility = v;
    dismissConfirm?.(); // 新请求接管：收起在途的关闭确认弹窗（按取消处理，其结果作废）
    let results: unknown[];
    if (v === false && options.confirmOnClose === true) {
      // 开启关闭确认弹窗：回调仅感知（返回值忽略）；会话中弹内置确认弹窗决定（确定=隐藏 / 取消=保持显示），非会话直接关闭
      fireVisibilityHandlers(v);
      results = sessionActive ? [askCloseConfirm().then((confirmed) => !confirmed)] : [];
    } else {
      results = fireVisibilityHandlers(v);
    }
    const settle = async (): Promise<void> => {
      let decision: boolean | undefined;
      for (const r of results) {
        let val: unknown = r;
        if (val && typeof (val as PromiseLike<unknown>).then === 'function') {
          try {
            val = await (val as PromiseLike<unknown>);
          } catch (err) {
            console.warn('[ckc-expert-agent] onVisibilityChange 回调的 Promise 被拒绝，按默认显隐处理', err);
            val = undefined;
          }
        }
        if (typeof val === 'boolean') {
          decision = val;
          break;
        }
      }
      if (destroyed || token !== visibilityToken) return;
      pendingVisibility = null;
      applyVisibility(decision === undefined ? v : decision, src);
    };
    void settle();
  };

  const close = (): void => {
    requestVisibility(false, openSource);
  };

  const initDrawer = (): HTMLDivElement => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${DRAWER_STYLES}</style>
      <div class="panel">
        ${options.resizable !== false ? '<div class="resize-handle"></div>' : ''}
        <div class="loader">
          <div class="loader-spinner"></div>
          <div class="loader-text">加载中…</div>
        </div>
      </div>
    `;

    const panel = shadow.querySelector('.panel') as HTMLDivElement;
    const resizeHandle = shadow.querySelector('.resize-handle') as HTMLDivElement;

    const iframe = document.createElement('iframe');
    iframe.className = 'frame';
    iframe.title = 'ckc-expert-agent';
    // Permissions Policy：允许 iframe 内页面获取焦点（allow="focus"）
    iframe.allow = 'focus';
    iframe.src = buildFrameSrc(domain, options.token, options.agentCode, options.sessionId);
    panel.appendChild(iframe);

    // iframe 加载成功与否不以 load 事件判断（about:blank/浏览器错误页也会触发 load）：
    // 由 iframe 页面初始化完成后发 drawer-ready 就绪消息，宿主收到后在 onFrameReady 里统一补发。

    // 拖动左边框调整宽度（options.resizable，默认开启）：向左拖变宽，向右拖变窄。
    // 设为 false 关闭拖拽调宽：不渲染拖拽把手（见模板），这里也不挂拖拽监听（resizeHandle 为 null）。
    // 弱网/云桌面下拖拽事件可能丢失，做多层兜底避免拖拽卡死或异常：
    // 1) 拖拽期间 iframe 置为 pointer-events: none，move/up 不会被跨文档 iframe 吞掉；
    // 2) move/up 监听挂在 window 上（配合指针捕获），指针移出把手仍能继续；
    // 3) pointerup 丢失时按 buttons===0 自检收尾，窗口失焦、页面隐藏也强制收尾；
    // 4) 新拖拽开始/销毁时若上次未收尾，先强制结束。
    resizeHandle?.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      activeDragEnd?.();
      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startWidth = host.getBoundingClientRect().width;
      let ended = false;
      host.classList.add('ckc-drawer--dragging');
      // 拖拽期间 iframe 收不到指针事件，保证 move/up 都到达宿主
      const prevPointerEvents = iframe.style.pointerEvents;
      iframe.style.pointerEvents = 'none';
      try {
        resizeHandle.setPointerCapture(pointerId);
      } catch {
        // 个别环境不支持指针捕获，靠 window 监听兜底
      }

      function onMove(ev: PointerEvent): void {
        if (ev.pointerId !== pointerId) return;
        // pointerup 丢失时 buttons 为 0：主动收尾，避免卡在拖拽状态继续乱调宽度
        if (ev.buttons === 0) {
          endDrag();
          return;
        }
        width = clamp(startWidth + (startX - ev.clientX), minWidth, maxWidth);
        host.style.width = `${width}px`;
      }
      function endDrag(): void {
        if (ended) return;
        ended = true;
        host.classList.remove('ckc-drawer--dragging');
        iframe.style.pointerEvents = prevPointerEvents;
        if (resizeHandle.hasPointerCapture(pointerId)) {
          resizeHandle.releasePointerCapture(pointerId);
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
        window.removeEventListener('blur', endDrag);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        if (activeDragEnd === endDrag) activeDragEnd = null;
        // 拖拽调宽结束：把当前宽度是否为最大值 / 最小值同步给 iframe，供其控制「全屏 / 取消全屏」按钮状态
        if (!destroyed) notifyWidthState();
      }
      function onVisibilityChange(): void {
        if (document.visibilityState === 'hidden') endDrag();
      }

      activeDragEnd = endDrag;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      window.addEventListener('blur', endDrag);
      document.addEventListener('visibilitychange', onVisibilityChange);
    });

    // 遮盖层（options.mask，默认不开启）：抽屉打开时盖住左侧页面区域；
    // 点击遮盖层是否关闭抽屉由 options.maskClosable 控制（默认不关闭）
    if (options.mask === true && !maskHost) {
      const mHost = document.createElement('div');
      mHost.style.zIndex = String(zIndex - 1); // 与悬浮按钮同层，略低于抽屉
      const mShadow = mHost.attachShadow({ mode: 'open' });
      mShadow.innerHTML = `
        <style>${MASK_STYLES}</style>
        <div class="mask"></div>
      `;
      if (options.maskClosable === true) {
        mHost.addEventListener('click', close);
        mHost.style.cursor = 'pointer'; // cursor 可继承到 .mask，提示可点击
      }
      (document.body ?? document.documentElement).appendChild(mHost);
      maskHost = mHost;
    }

    host.style.width = `${width}px`;
    host.style.zIndex = String(zIndex); // 抽屉浮在页面内容上方（默认 2147483647，可用 options.zIndex 调整）
    (document.body ?? document.documentElement).appendChild(host);

    // 加载动画兜底：超时未收到 drawer-ready（iframe 页面未实现就绪消息、加载被拦截或网络异常）时，
    // 停止动画露出 iframe 内容，避免一直转圈挡住整个抽屉
    loaderFallbackTimer = setTimeout(() => {
      loaderFallbackTimer = null;
      if (frameReady) return;
      hideLoader();
      console.warn(
        '[ckc-expert-agent] 超时未收到 iframe 的 drawer-ready 就绪消息，已停止加载动画；' +
          "若 iframe 内容仍为空，请确认 iframe 页面已在初始化完成后发送 { source: 'ckc-expert-agent', type: 'drawer-ready' }",
      );
    }, LOADER_FALLBACK_MS);

    drawerHost = host;
    frame = iframe;
    return host;
  };

  /** 显示抽屉（src=打开方式：launcher=点击悬浮图标，handle=DrawerHandle.open() / sendMessage 自动打开） */
  const open = (src: DrawerOpenSource): void => {
    requestVisibility(true, src);
  };

  // 悬浮按钮：拖动可移动位置，单击打开抽屉（拖拽事件丢失兜底同左边框；options.launcher === false 时不生成、不注册）
  launcherHost?.addEventListener('pointerdown', (e: PointerEvent) => {
    const host = launcherHost as HTMLDivElement;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    activeDragEnd?.();
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = btnX;
    const origY = btnY;
    let moved = false;
    let ended = false;
    host.classList.add('ckc-launcher--dragging');
    // 拖动期间 iframe 置为 pointer-events: none，move/up 不会被 iframe 吞掉
    const draggedFrame = frame;
    const prevPointerEvents = draggedFrame ? draggedFrame.style.pointerEvents : '';
    if (draggedFrame) draggedFrame.style.pointerEvents = 'none';
    try {
      host.setPointerCapture(pointerId);
    } catch {
      // 个别环境不支持指针捕获，靠 window 监听兜底
    }

    function onMove(ev: PointerEvent): void {
      if (ev.pointerId !== pointerId) return;
      if (ev.buttons === 0) {
        endDrag(false);
        return;
      }
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
      moved = true;
      btnX = clamp(origX + dx, 0, window.innerWidth - LAUNCHER_SIZE);
      btnY = clamp(origY + dy, 0, window.innerHeight - LAUNCHER_SIZE);
      applyBtnPos();
    }
    function endDrag(isPointerUp: boolean): void {
      if (ended) return;
      ended = true;
      host.classList.remove('ckc-launcher--dragging');
      if (draggedFrame) draggedFrame.style.pointerEvents = prevPointerEvents;
      if (host.hasPointerCapture(pointerId)) {
        host.releasePointerCapture(pointerId);
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (activeDragEnd === onCancel) activeDragEnd = null;
      // 仅在真正原地松开（pointerup）时视为单击打开抽屉
      if (!moved && isPointerUp) open('launcher');
    }
    function onPointerUp(): void {
      endDrag(true);
    }
    function onCancel(): void {
      endDrag(false);
    }
    function onVisibilityChange(): void {
      if (document.visibilityState === 'hidden') endDrag(false);
    }

    activeDragEnd = onCancel;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onCancel);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  if (launcherHost) (document.body ?? document.documentElement).appendChild(launcherHost);

  const sendMessage = (payload: DrawerPayload): void => {
    if (destroyed) return;
    // 发消息时自动打开抽屉（未初始化则先初始化 iframe；打开方式记为 handle）
    open('handle');
    const msg: DrawerMessage = {
      source: 'ckc-expert-agent',
      type: 'drawer-message',
      payload,
    };
    // iframe 未就绪或发送失败时排队，iframe 就绪（drawer-ready）后按序补发（上限 100 条，超出丢最旧）
    const enqueue = (): void => {
      if (pendingMessages.length >= 100) pendingMessages.shift();
      pendingMessages.push(msg);
    };
    if (!frame || !frameReady) {
      enqueue();
      return;
    }
    if (!postToFrame(msg)) enqueue();
  };

  return {
    get iframe(): HTMLIFrameElement | null {
      return frame;
    },
    get isOpen(): boolean {
      return visible && !destroyed;
    },
    open: (): void => open('handle'),
    close,
    setWidth: (w: number): void => {
      applyWidth(w);
    },
    sendMessage,
    receiveMessage: (handler: DrawerMessageHandler): (() => void) => {
      messageHandlers.add(handler);
      return () => {
        messageHandlers.delete(handler);
      };
    },
    receiveSessionId: (handler: DrawerSessionHandler): (() => void) => {
      sessionHandlers.add(handler);
      return () => {
        sessionHandlers.delete(handler);
      };
    },
    onVisibilityChange: (handler: DrawerVisibilityHandler): (() => void) => {
      visibilityHandlers.add(handler);
      return () => {
        visibilityHandlers.delete(handler);
      };
    },
    destroy: (): void => {
      if (destroyed) return;
      destroyed = true;
      activeDragEnd?.();
      dismissConfirm?.(); // 收起在途的关闭确认弹窗（按取消处理）
      if (loaderFallbackTimer !== null) {
        clearTimeout(loaderFallbackTimer);
        loaderFallbackTimer = null;
      }
      if (visible) {
        visible = false;
        notify(false);
      }
      window.removeEventListener('message', onWindowMessage);
      messageHandlers.clear();
      sessionHandlers.clear();
      visibilityHandlers.clear();
      pendingMessages.length = 0;
      launcherHost?.remove();
      drawerHost?.remove();
      drawerHost = null;
      maskHost?.remove();
      maskHost = null;
      frame = null;
    },
  };
}

declare global {
  interface Window {
    /** 创建页面上的悬浮按钮 + 右侧抽屉，返回 DrawerHandle 控制显隐 */
    createCkcDrawer: typeof createDrawer;
  }
}

// 挂到 window 上，供 CDN script 标签接入方直接调用
if (typeof window !== 'undefined') {
  window.createCkcDrawer = createDrawer;
}
