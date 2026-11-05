(function(e,t){typeof exports==`object`&&typeof module<`u`?t(exports):typeof define==`function`&&define.amd?define([`exports`],t):(e=typeof globalThis<`u`?globalThis:e||self,t(e.CkcExpertAgent={}))})(this,function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=500,n={dev:`http://lf18kg-dev.life.cpic.com`,sit:`http://lf18kg-sit.life.cpic.com`,pro:`http://lf18kg.life.cpic.com`,local:`http://localhost:4173`},r=200,i=2147483647,a=2147483646,o=48,s=24,c=5,l=(e,t,n)=>Math.min(Math.max(e,t),n),u=null,d=(e,t,n,r)=>{let i=e.replace(/\/+$/,``),a=r?`/${encodeURIComponent(r)}`:``;return`${i}/center/thd/chat/${encodeURIComponent(n)}${a}?token=${encodeURIComponent(t)}`},f=`
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
`,p=`
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
`;function m(e){var i,a,m,h;let g=e&&e.env?n[e.env]:void 0;if(!g)throw TypeError(`[ckc-expert-agent] createDrawer: 必须通过 options.env 指定运行环境（dev / sit / pro / local）`);if(typeof e.token!=`string`||e.token===``)throw TypeError(`[ckc-expert-agent] createDrawer: 必须通过 options.token 传入鉴权 token`);if(typeof e.agentCode!=`string`||e.agentCode===``)throw TypeError(`[ckc-expert-agent] createDrawer: 必须通过 options.agentCode 传入智能体编码`);let _=Math.max(0,(i=e.minWidth)==null?r:i),v=Math.max(_,Math.min((a=e.maxWidth)==null?window.innerWidth*.9:a,window.innerWidth)),y=l((m=e.width)==null?t:m,_,v),b=`*`;try{let e=new URL(g).origin;e&&e!==`null`&&(b=e)}catch(e){}let x=document.createElement(`div`),S=x.attachShadow({mode:`open`});S.innerHTML=`
    <style>${f}</style>
    <button class="btn" type="button" aria-label="打开抽屉">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="#fff" d="M12 3C6.5 3 2 6.6 2 11c0 2.3 1.2 4.4 3.1 5.8L4.3 20a.7.7 0 0 0 1 .8l3.5-1.7c1 .3 2.1.4 3.2.4 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
      </svg>
    </button>
  `;let C=Math.max(0,window.innerWidth-o-s),w=Math.max(0,window.innerHeight-o-s),T=()=>{x.style.left=`${C}px`,x.style.top=`${w}px`};T();let E=null,D=null,O=!1,k=e=>{var t;let n={source:`ckc-expert-agent`,type:`drawer-visibility-change`,visible:e};D==null||(t=D.contentWindow)==null||t.postMessage(n,b),window.postMessage(n,`*`)},A=()=>{O&&E&&(E.classList.add(`ckc-drawer--hidden`),E.inert=!0,O=!1,k(!1))},j=()=>{var t;let n=document.createElement(`div`),r=n.attachShadow({mode:`open`});r.innerHTML=`
      <style>${p}</style>
      <div class="panel">
        <div class="resize-handle"></div>
        <button class="close-btn" type="button" aria-label="关闭抽屉">×</button>
      </div>
    `;let i=r.querySelector(`.panel`),a=r.querySelector(`.resize-handle`),o=r.querySelector(`.close-btn`),s=document.createElement(`iframe`);s.className=`frame`,s.title=`ckc-expert-agent`,s.src=d(g,e.token,e.agentCode,e.sessionId),i.appendChild(s);let c=e.payload;return c&&s.addEventListener(`load`,()=>{var e;let t={source:`ckc-expert-agent`,type:`drawer-init`,payload:c};(e=s.contentWindow)==null||e.postMessage(t,b)},{once:!0}),a.addEventListener(`pointerdown`,e=>{if(e.pointerType===`mouse`&&e.button!==0)return;e.preventDefault();let t=e.clientX,r=n.getBoundingClientRect().width;n.classList.add(`ckc-drawer--dragging`),a.setPointerCapture(e.pointerId);let i=e=>{y=l(r+(t-e.clientX),_,v),n.style.width=`${y}px`},o=e=>{n.classList.remove(`ckc-drawer--dragging`),a.hasPointerCapture(e.pointerId)&&a.releasePointerCapture(e.pointerId),a.removeEventListener(`pointermove`,i),a.removeEventListener(`pointerup`,o),a.removeEventListener(`pointercancel`,o)};a.addEventListener(`pointermove`,i),a.addEventListener(`pointerup`,o),a.addEventListener(`pointercancel`,o)}),o.addEventListener(`click`,A),n.style.width=`${y}px`,((t=document.body)==null?document.documentElement:t).appendChild(n),E=n,D=s,n},M=()=>{O||(E||j(),E.classList.remove(`ckc-drawer--hidden`),E.inert=!1,O=!0,k(!0))};x.addEventListener(`pointerdown`,e=>{if(e.pointerType===`mouse`&&e.button!==0)return;e.preventDefault();let t=e.clientX,n=e.clientY,r=C,i=w,a=!1;x.classList.add(`ckc-launcher--dragging`),x.setPointerCapture(e.pointerId);let s=e=>{let s=e.clientX-t,u=e.clientY-n;!a&&Math.hypot(s,u)<=c||(a=!0,C=l(r+s,0,window.innerWidth-o),w=l(i+u,0,window.innerHeight-o),T())},u=e=>{x.classList.remove(`ckc-launcher--dragging`),x.hasPointerCapture(e.pointerId)&&x.releasePointerCapture(e.pointerId),x.removeEventListener(`pointermove`,s),x.removeEventListener(`pointerup`,u),x.removeEventListener(`pointercancel`,u),a||M()};x.addEventListener(`pointermove`,s),x.addEventListener(`pointerup`,u),x.addEventListener(`pointercancel`,u)}),((h=document.body)==null?document.documentElement:h).appendChild(x);let N={get iframe(){return D},open:M,close:A,setWidth:e=>{y=l(e,_,v),E&&(E.style.width=`${y}px`)},destroy:()=>{O&&k(!1),x.remove(),E==null||E.remove(),E=null,D=null,u===N&&(u=null)}};return u=N,N}var h=()=>{u==null||u.open()},g=()=>{u==null||u.close()};typeof window<`u`&&(window.createCkcDrawer=m,window.openCkcDrawer=h,window.closeCkcDrawer=g),e.closeCkcDrawer=g,e.createDrawer=m,e.openCkcDrawer=h});
//# sourceMappingURL=ckc-expert-agent.umd.js.map