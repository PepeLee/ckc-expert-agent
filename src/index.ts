/** 附件文件 */
export interface DrawerFile {
  /** 文件名 */
  name: string;
  /** 文件地址 */
  url: string;
  /** 文件类型（如 image/png、application/pdf） */
  type: string;
}

/** 预置数据：iframe 加载完成后通过 postMessage 传给 iframe 内容方 */
export interface DrawerPayload {
  /** 预置消息 */
  message: string;
  /** 附件文件列表 */
  files: DrawerFile[];
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
  /** 会话 ID（选填），传入时拼到路径上（/center/thd/chat/{agentCode}/{sessionId}），不传则不拼 */
  sessionId?: string;
  /** 预置消息/文件（选填），iframe 加载完成后通过 postMessage 传给 iframe */
  payload?: DrawerPayload;
  /** 初始宽度（px），默认 500 */
  width?: number;
  /** 最小宽度（px），默认 200 */
  minWidth?: number;
  /** 最大宽度（px），默认视口宽度的 90% */
  maxWidth?: number;
}

/** 抽屉显隐变化时发给 iframe 的消息（宿主侧通过 onVisibilityChange 回调感知） */
export interface DrawerVisibilityMessage {
  source: 'ckc-expert-agent';
  type: 'drawer-visibility-change';
  visible: boolean;
}

/** iframe 加载完成后收到的初始化消息（携带预置 payload） */
export interface DrawerInitMessage {
  source: 'ckc-expert-agent';
  type: 'drawer-init';
  payload: DrawerPayload;
}

/**
 * 宿主与 iframe 之间收发的业务消息（固定协议 drawer-message）：
 * 宿主用 drawer.sendMessage() 发出，iframe 用 parent.postMessage 发来同格式消息，
 * 宿主用 drawer.onMessage() 接收；宿主不要直接使用 window.postMessage / message 事件。
 */
export interface DrawerMessage {
  source: 'ckc-expert-agent';
  type: 'drawer-message';
  payload: DrawerPayload;
}

/** onMessage 回调：收到 iframe 发来的消息 */
export type DrawerMessageHandler = (payload: DrawerPayload) => void;

/** onVisibilityChange 回调：抽屉显示/隐藏变化 */
export type DrawerVisibilityHandler = (visible: boolean) => void;

export interface DrawerHandle {
  /** 抽屉内的 iframe 元素，首次打开抽屉前为 null */
  readonly iframe: HTMLIFrameElement | null;
  /** 显示抽屉（首次调用时初始化抽屉并加载 iframe） */
  open(): void;
  /** 隐藏抽屉（移出视口但不销毁，iframe 继续运行，滚动条等状态保留） */
  close(): void;
  /** 设置抽屉宽度（px，自动限制在 min/max 之间） */
  setWidth(width: number): void;
  /** 向 iframe 发送一条消息（固定协议 drawer-message；iframe 未加载完成时自动排队，加载后按序补发） */
  sendMessage(payload: DrawerPayload): void;
  /** 监听 iframe 发来的消息（仅接受本抽屉 iframe 发来的合规 drawer-message），返回取消监听函数 */
  onMessage(handler: DrawerMessageHandler): () => void;
  /** 监听抽屉显示/隐藏变化（含抽屉内关闭按钮触发的隐藏），返回取消监听函数 */
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
const DEFAULT_MIN_WIDTH = 200;
/** 32 位有符号整数最大值，保证抽屉浮在接入方页面所有内容之上 */
const Z_INDEX = 2147483647;
/** 悬浮按钮略低于抽屉，抽屉打开时盖在按钮上方 */
const LAUNCHER_Z_INDEX = 2147483646;
const LAUNCHER_SIZE = 48;
const LAUNCHER_MARGIN = 24;
/** 位移超过该阈值（px）视为拖动，否则视为点击 */
const DRAG_THRESHOLD = 5;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

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
    z-index: ${LAUNCHER_Z_INDEX};
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
    background: #1677ff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    cursor: grab;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
  }
  :host(.ckc-launcher--dragging) .btn {
    cursor: grabbing;
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
    z-index: ${Z_INDEX};
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
  .close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.06);
    color: #1f2329;
    font-size: 18px;
    line-height: 28px;
    text-align: center;
    cursor: pointer;
  }
  .close-btn:hover {
    background: rgba(0, 0, 0, 0.12);
  }
  .frame {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #ffffff;
  }
`;

/**
 * 在当前页面创建一个可拖动的悬浮圆形按钮。
 * 点击按钮初始化并显示右侧抽屉（内容为加载固定格式地址的 iframe）；
 * 点击抽屉右上角关闭按钮只是隐藏抽屉，iframe 不会被销毁、继续运行；
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

  const minWidth = Math.max(0, options.minWidth ?? DEFAULT_MIN_WIDTH);
  const maxWidth = Math.max(
    minWidth,
    Math.min(options.maxWidth ?? window.innerWidth * 0.9, window.innerWidth),
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

  // ---------- 悬浮圆形按钮 ----------
  const launcherHost = document.createElement('div');
  const launcherShadow = launcherHost.attachShadow({ mode: 'open' });
  launcherShadow.innerHTML = `
    <style>${LAUNCHER_STYLES}</style>
    <button class="btn" type="button" aria-label="打开抽屉">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="#fff" d="M12 3C6.5 3 2 6.6 2 11c0 2.3 1.2 4.4 3.1 5.8L4.3 20a.7.7 0 0 0 1 .8l3.5-1.7c1 .3 2.1.4 3.2.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
      </svg>
    </button>
  `;

  let btnX = Math.max(0, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_MARGIN);
  let btnY = Math.max(0, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_MARGIN);
  const applyBtnPos = (): void => {
    launcherHost.style.left = `${btnX}px`;
    launcherHost.style.top = `${btnY}px`;
  };
  applyBtnPos();

  // ---------- 抽屉（首次点击按钮时初始化） ----------
  let drawerHost: HTMLDivElement | null = null;
  let frame: HTMLIFrameElement | null = null;
  let visible = false;
  let destroyed = false;
  /** iframe 首次加载完成：此前 sendMessage 排队，此后直发 */
  let frameLoaded = false;
  /** iframe 加载完成前排队的 drawer-message */
  const pendingMessages: DrawerMessage[] = [];
  const messageHandlers = new Set<DrawerMessageHandler>();
  const visibilityHandlers = new Set<DrawerVisibilityHandler>();

  // 宿主 ↔ iframe 消息固定为 drawer-init / drawer-visibility-change / drawer-message 三种，
  // 宿主统一用 sendMessage / onMessage / onVisibilityChange 收发，不直接使用 postMessage / message 事件。
  // 这里只接受本抽屉 iframe 发来的合规 drawer-message，其余一律丢弃。
  const onWindowMessage = (e: MessageEvent): void => {
    if (!frame || e.source !== frame.contentWindow) return;
    const data = e.data as Partial<DrawerMessage> | null;
    if (!data || data.source !== 'ckc-expert-agent' || data.type !== 'drawer-message') return;
    const payload = data.payload;
    if (!payload || typeof payload.message !== 'string' || !Array.isArray(payload.files)) return;
    for (const handler of [...messageHandlers]) handler(payload);
  };
  window.addEventListener('message', onWindowMessage);

  const notify = (v: boolean): void => {
    const msg: DrawerVisibilityMessage = {
      source: 'ckc-expert-agent',
      type: 'drawer-visibility-change',
      visible: v,
    };
    frame?.contentWindow?.postMessage(msg, frameTargetOrigin);
    for (const handler of [...visibilityHandlers]) handler(v);
  };

  const close = (): void => {
    if (destroyed || !visible || !drawerHost) return;
    // 只隐藏不销毁：平移出视口（保留布局盒子），iframe 内容继续运行、滚动状态保留
    drawerHost.classList.add('ckc-drawer--hidden');
    drawerHost.inert = true;
    visible = false;
    notify(false);
  };

  const initDrawer = (): HTMLDivElement => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${DRAWER_STYLES}</style>
      <div class="panel">
        <div class="resize-handle"></div>
        <button class="close-btn" type="button" aria-label="关闭抽屉">×</button>
      </div>
    `;

    const panel = shadow.querySelector('.panel') as HTMLDivElement;
    const resizeHandle = shadow.querySelector('.resize-handle') as HTMLDivElement;
    const closeBtn = shadow.querySelector('.close-btn') as HTMLButtonElement;

    const iframe = document.createElement('iframe');
    iframe.className = 'frame';
    iframe.title = 'ckc-expert-agent';
    iframe.src = buildFrameSrc(domain, options.token, options.agentCode, options.sessionId);
    panel.appendChild(iframe);

    // iframe 加载完成后：先发预置 payload（drawer-init），再补发加载前排队的 sendMessage 消息
    const payload = options.payload;
    let initSent = false;
    iframe.addEventListener('load', () => {
      if (initSent) return;
      initSent = true;
      frameLoaded = true;
      if (payload) {
        const msg: DrawerInitMessage = {
          source: 'ckc-expert-agent',
          type: 'drawer-init',
          payload,
        };
        iframe.contentWindow?.postMessage(msg, frameTargetOrigin);
      }
      for (const pending of pendingMessages.splice(0)) {
        iframe.contentWindow?.postMessage(pending, frameTargetOrigin);
      }
    });

    // 拖动左边框调整宽度：向左拖变宽，向右拖变窄
    resizeHandle.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = host.getBoundingClientRect().width;
      host.classList.add('ckc-drawer--dragging');
      resizeHandle.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent): void => {
        width = clamp(startWidth + (startX - ev.clientX), minWidth, maxWidth);
        host.style.width = `${width}px`;
      };
      const onUp = (ev: PointerEvent): void => {
        host.classList.remove('ckc-drawer--dragging');
        if (resizeHandle.hasPointerCapture(ev.pointerId)) {
          resizeHandle.releasePointerCapture(ev.pointerId);
        }
        resizeHandle.removeEventListener('pointermove', onMove);
        resizeHandle.removeEventListener('pointerup', onUp);
        resizeHandle.removeEventListener('pointercancel', onUp);
      };

      resizeHandle.addEventListener('pointermove', onMove);
      resizeHandle.addEventListener('pointerup', onUp);
      resizeHandle.addEventListener('pointercancel', onUp);
    });

    closeBtn.addEventListener('click', close);

    host.style.width = `${width}px`;
    (document.body ?? document.documentElement).appendChild(host);

    drawerHost = host;
    frame = iframe;
    return host;
  };

  const open = (): void => {
    if (destroyed || visible) return;
    if (!drawerHost) {
      initDrawer();
    }
    (drawerHost as HTMLDivElement).classList.remove('ckc-drawer--hidden');
    (drawerHost as HTMLDivElement).inert = false;
    visible = true;
    notify(true);
  };

  // 悬浮按钮：拖动可移动位置，单击打开抽屉
  launcherHost.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = btnX;
    const origY = btnY;
    let moved = false;
    launcherHost.classList.add('ckc-launcher--dragging');
    launcherHost.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent): void => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
      moved = true;
      btnX = clamp(origX + dx, 0, window.innerWidth - LAUNCHER_SIZE);
      btnY = clamp(origY + dy, 0, window.innerHeight - LAUNCHER_SIZE);
      applyBtnPos();
    };
    const onUp = (ev: PointerEvent): void => {
      launcherHost.classList.remove('ckc-launcher--dragging');
      if (launcherHost.hasPointerCapture(ev.pointerId)) {
        launcherHost.releasePointerCapture(ev.pointerId);
      }
      launcherHost.removeEventListener('pointermove', onMove);
      launcherHost.removeEventListener('pointerup', onUp);
      launcherHost.removeEventListener('pointercancel', onUp);
      if (!moved) open();
    };

    launcherHost.addEventListener('pointermove', onMove);
    launcherHost.addEventListener('pointerup', onUp);
    launcherHost.addEventListener('pointercancel', onUp);
  });

  (document.body ?? document.documentElement).appendChild(launcherHost);

  const sendMessage = (payload: DrawerPayload): void => {
    if (destroyed) return;
    const msg: DrawerMessage = {
      source: 'ckc-expert-agent',
      type: 'drawer-message',
      payload,
    };
    // iframe 尚未加载完成时排队，加载后按序补发
    if (!frame || !frameLoaded) {
      pendingMessages.push(msg);
      return;
    }
    frame.contentWindow?.postMessage(msg, frameTargetOrigin);
  };

  return {
    get iframe(): HTMLIFrameElement | null {
      return frame;
    },
    open,
    close,
    setWidth: (w: number): void => {
      width = clamp(w, minWidth, maxWidth);
      if (drawerHost) drawerHost.style.width = `${width}px`;
    },
    sendMessage,
    onMessage: (handler: DrawerMessageHandler): (() => void) => {
      messageHandlers.add(handler);
      return () => {
        messageHandlers.delete(handler);
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
      if (visible) {
        visible = false;
        notify(false);
      }
      window.removeEventListener('message', onWindowMessage);
      messageHandlers.clear();
      visibilityHandlers.clear();
      pendingMessages.length = 0;
      launcherHost.remove();
      drawerHost?.remove();
      drawerHost = null;
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
