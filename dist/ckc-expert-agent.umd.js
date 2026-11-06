(function(e,t){typeof exports==`object`&&typeof module<`u`?t(exports):typeof define==`function`&&define.amd?define([`exports`],t):(e=typeof globalThis<`u`?globalThis:e||self,t(e.CkcExpertAgent={}))})(this,function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=500,n={dev:`http://lf18kg-dev.life.cpic.com`,sit:`http://lf18kg-sit.life.cpic.com`,pro:`http://lf18kg.life.cpic.com`,local:`http://localhost:4173`},r=200,i=2147483647,a=2147483646,o=48,s=24,c=5,l=1e4,u=(e,t,n)=>Math.min(Math.max(e,t),n),d=e=>!!e&&typeof e.name==`string`&&typeof e.url==`string`&&typeof e.type==`string`,f=(e,t,n,r)=>{let i=e.replace(/\/+$/,``),a=r?`/${encodeURIComponent(r)}`:``;return`${i}/center/thd/chat/${encodeURIComponent(n)}${a}?token=${encodeURIComponent(t)}`},p=`
  :host {
    all: initial;
    position: fixed;
    left: 0;
    top: 0;
    z-index: ${a};
    display: block;
    width: ${o}px;
    height: ${o}px;
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
`,m=`
  :host {
    all: initial;
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    height: 100dvh;
    z-index: ${i};
    display: block;
    width: ${t}px;
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
`;function h(e){var i,a,h,g;let _=e&&e.env?n[e.env]:void 0;if(!_)throw TypeError(`[ckc-expert-agent] createDrawer: 必须通过 options.env 指定运行环境（dev / sit / pro / local）`);if(typeof e.token!=`string`||e.token===``)throw TypeError(`[ckc-expert-agent] createDrawer: 必须通过 options.token 传入鉴权 token`);if(typeof e.agentCode!=`string`||e.agentCode===``)throw TypeError(`[ckc-expert-agent] createDrawer: 必须通过 options.agentCode 传入智能体编码`);let v=Math.max(0,(i=e.minWidth)==null?r:i),y=Math.max(v,Math.min((a=e.maxWidth)==null?window.innerWidth*.9:a,window.innerWidth)),b=u((h=e.width)==null?t:h,v,y),x=`*`;try{let e=new URL(_).origin;e&&e!==`null`&&(x=e)}catch(e){}let S=document.createElement(`div`),C=S.attachShadow({mode:`open`});C.innerHTML=`
    <style>${p}</style>
    <button class="btn" type="button" aria-label="打开抽屉">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="#fff" d="M12 3C6.5 3 2 6.6 2 11c0 2.3 1.2 4.4 3.1 5.8L4.3 20a.7.7 0 0 0 1 .8l3.5-1.7c1 .3 2.1.4 3.2.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
      </svg>
    </button>
  `;let w=Math.max(0,window.innerWidth-o-s),T=Math.max(0,window.innerHeight-o-s),E=()=>{S.style.left=`${w}px`,S.style.top=`${T}px`};E();let D=null,O=null,k=!1,A=!1,j=!1,M=null,N=null,P=[],F=new Set,I=new Set,L=new Set,R=e=>{if(!O||e.source!==O.contentWindow)return;let t=e.data;if(t&&t.source===`ckc-expert-agent`){if(t.type===`drawer-ready`)V();else if(t.type===`drawer-files`){let e=t.payload;if(!Array.isArray(e)||!e.every(d))return;for(let t of[...F])t(e)}else if(t.type===`drawer-session`){let e=t.payload;if(typeof e!=`string`||e===``)return;for(let t of[...I])t(e)}}};window.addEventListener(`message`,R);let z=e=>{let t=O==null?void 0:O.contentWindow;if(!t)return!1;try{return t.postMessage(e,x),!0}catch(e){return console.warn(`[ckc-expert-agent] 向 iframe 发消息失败（iframe 可能未真正加载）：`,e),!1}},B=()=>{var e;D==null||(e=D.shadowRoot)==null||(e=e.querySelector(`.loader`))==null||e.classList.add(`ckc-loader--hidden`)},V=()=>{if(j=!0,M!==null&&(clearTimeout(M),M=null),B(),e.payload){let t={source:`ckc-expert-agent`,type:`drawer-init`,payload:e.payload};z(t)}for(z({source:`ckc-expert-agent`,type:`drawer-visibility-change`,visible:k});P.length>0&&z(P[0]);)P.shift()},H=e=>{j&&z({source:`ckc-expert-agent`,type:`drawer-visibility-change`,visible:e});for(let t of[...L])t(e)},U=()=>{!A&&k&&D&&(D.classList.add(`ckc-drawer--hidden`),D.inert=!0,k=!1,H(!1))},W=()=>{var t;let n=document.createElement(`div`),r=n.attachShadow({mode:`open`});r.innerHTML=`
      <style>${m}</style>
      <div class="panel">
        <div class="resize-handle"></div>
        <button class="close-btn" type="button" aria-label="关闭抽屉">×</button>
        <div class="loader">
          <div class="loader-spinner"></div>
          <div class="loader-text">加载中…</div>
        </div>
      </div>
    `;let i=r.querySelector(`.panel`),a=r.querySelector(`.resize-handle`),o=r.querySelector(`.close-btn`),s=document.createElement(`iframe`);return s.className=`frame`,s.title=`ckc-expert-agent`,s.allow=`focus`,s.src=f(_,e.token,e.agentCode,e.sessionId),i.appendChild(s),a.addEventListener(`pointerdown`,e=>{if(e.pointerType===`mouse`&&e.button!==0)return;e.preventDefault(),N==null||N();let t=e.pointerId,r=e.clientX,i=n.getBoundingClientRect().width,o=!1;n.classList.add(`ckc-drawer--dragging`);let c=s.style.pointerEvents;s.style.pointerEvents=`none`;try{a.setPointerCapture(t)}catch(e){}function l(e){e.pointerId===t&&(e.buttons===0?d():(b=u(i+(r-e.clientX),v,y),n.style.width=`${b}px`))}function d(){o||(o=!0,n.classList.remove(`ckc-drawer--dragging`),s.style.pointerEvents=c,a.hasPointerCapture(t)&&a.releasePointerCapture(t),window.removeEventListener(`pointermove`,l),window.removeEventListener(`pointerup`,d),window.removeEventListener(`pointercancel`,d),window.removeEventListener(`blur`,d),document.removeEventListener(`visibilitychange`,f),N===d&&(N=null))}function f(){document.visibilityState===`hidden`&&d()}N=d,window.addEventListener(`pointermove`,l),window.addEventListener(`pointerup`,d),window.addEventListener(`pointercancel`,d),window.addEventListener(`blur`,d),document.addEventListener(`visibilitychange`,f)}),o.addEventListener(`click`,U),n.style.width=`${b}px`,((t=document.body)==null?document.documentElement:t).appendChild(n),M=setTimeout(()=>{M=null,j||(B(),console.warn(`[ckc-expert-agent] 超时未收到 iframe 的 drawer-ready 就绪消息，已停止加载动画；若 iframe 内容仍为空，请确认 iframe 页面已在初始化完成后发送 { source: 'ckc-expert-agent', type: 'drawer-ready' }`))},l),D=n,O=s,n},G=()=>{A||k||(D||W(),D.classList.remove(`ckc-drawer--hidden`),D.inert=!1,k=!0,H(!0))};return S.addEventListener(`pointerdown`,e=>{if(e.pointerType===`mouse`&&e.button!==0)return;e.preventDefault(),N==null||N();let t=e.pointerId,n=e.clientX,r=e.clientY,i=w,a=T,s=!1,l=!1;S.classList.add(`ckc-launcher--dragging`);let d=O,f=d?d.style.pointerEvents:``;d&&(d.style.pointerEvents=`none`);try{S.setPointerCapture(t)}catch(e){}function p(e){if(e.pointerId!==t)return;if(e.buttons===0){m(!1);return}let l=e.clientX-n,d=e.clientY-r;!s&&Math.hypot(l,d)<=c||(s=!0,w=u(i+l,0,window.innerWidth-o),T=u(a+d,0,window.innerHeight-o),E())}function m(e){l||(l=!0,S.classList.remove(`ckc-launcher--dragging`),d&&(d.style.pointerEvents=f),S.hasPointerCapture(t)&&S.releasePointerCapture(t),window.removeEventListener(`pointermove`,p),window.removeEventListener(`pointerup`,h),window.removeEventListener(`pointercancel`,g),window.removeEventListener(`blur`,g),document.removeEventListener(`visibilitychange`,_),N===g&&(N=null),!s&&e&&G())}function h(){m(!0)}function g(){m(!1)}function _(){document.visibilityState===`hidden`&&m(!1)}N=g,window.addEventListener(`pointermove`,p),window.addEventListener(`pointerup`,h),window.addEventListener(`pointercancel`,g),window.addEventListener(`blur`,g),document.addEventListener(`visibilitychange`,_)}),((g=document.body)==null?document.documentElement:g).appendChild(S),{get iframe(){return O},open:G,close:U,setWidth:e=>{b=u(e,v,y),D&&(D.style.width=`${b}px`)},sendMessage:e=>{if(A)return;let t={source:`ckc-expert-agent`,type:`drawer-message`,payload:e},n=()=>{P.length>=100&&P.shift(),P.push(t)};!O||!j?n():z(t)||n()},receiveFiles:e=>(F.add(e),()=>{F.delete(e)}),receiveSessionId:e=>(I.add(e),()=>{I.delete(e)}),onVisibilityChange:e=>(L.add(e),()=>{L.delete(e)}),destroy:()=>{A||(A=!0,N==null||N(),M!==null&&(clearTimeout(M),M=null),k&&(k=!1,H(!1)),window.removeEventListener(`message`,R),F.clear(),I.clear(),L.clear(),P.length=0,S.remove(),D==null||D.remove(),D=null,O=null)}}}typeof window<`u`&&(window.createCkcDrawer=h),e.createDrawer=h});
//# sourceMappingURL=ckc-expert-agent.umd.js.map