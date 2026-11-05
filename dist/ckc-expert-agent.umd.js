(function(e,t){typeof exports==`object`&&typeof module<`u`?t(exports):typeof define==`function`&&define.amd?define([`exports`],t):(e=typeof globalThis<`u`?globalThis:e||self,t(e.CkcExpertAgent={}))})(this,function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=500,n={dev:`http://lf18kg-dev.life.cpic.com`,sit:`http://lf18kg-sit.life.cpic.com`,pro:`http://lf18kg.life.cpic.com`,local:`http://localhost:4173`},r=200,i=2147483647,a=2147483646,o=48,s=24,c=5,l=(e,t,n)=>Math.min(Math.max(e,t),n),u=e=>!!e&&typeof e.name==`string`&&typeof e.url==`string`&&typeof e.type==`string`,d=(e,t,n,r)=>{let i=e.replace(/\/+$/,``),a=r?`/${encodeURIComponent(r)}`:``;return`${i}/center/thd/chat/${encodeURIComponent(n)}${a}?token=${encodeURIComponent(t)}`},f=`
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
  `;let C=Math.max(0,window.innerWidth-o-s),w=Math.max(0,window.innerHeight-o-s),T=()=>{x.style.left=`${C}px`,x.style.top=`${w}px`};T();let E=null,D=null,O=!1,k=!1,A=!1,j=null,M=[],N=new Set,P=new Set,F=new Set,I=e=>{if(!D||e.source!==D.contentWindow)return;let t=e.data;if(t&&t.source===`ckc-expert-agent`){if(t.type===`drawer-files`){let e=t.payload;if(!Array.isArray(e)||!e.every(u))return;for(let t of[...N])t(e)}else if(t.type===`drawer-session`){let e=t.payload;if(typeof e!=`string`||e===``)return;for(let t of[...P])t(e)}}};window.addEventListener(`message`,I);let L=e=>{let t=D==null?void 0:D.contentWindow;if(!t)return!1;try{return t.postMessage(e,b),!0}catch(e){return console.warn(`[ckc-expert-agent] 向 iframe 发消息失败（iframe 可能未真正加载）：`,e),!1}},R=e=>{A&&L({source:`ckc-expert-agent`,type:`drawer-visibility-change`,visible:e});for(let t of[...F])t(e)},z=()=>{!k&&O&&E&&(E.classList.add(`ckc-drawer--hidden`),E.inert=!0,O=!1,R(!1))},B=()=>{var t;let n=document.createElement(`div`),r=n.attachShadow({mode:`open`});r.innerHTML=`
      <style>${p}</style>
      <div class="panel">
        <div class="resize-handle"></div>
        <button class="close-btn" type="button" aria-label="关闭抽屉">×</button>
      </div>
    `;let i=r.querySelector(`.panel`),a=r.querySelector(`.resize-handle`),o=r.querySelector(`.close-btn`),s=document.createElement(`iframe`);s.className=`frame`,s.title=`ckc-expert-agent`,s.src=d(g,e.token,e.agentCode,e.sessionId),i.appendChild(s);let c=e.payload;return s.addEventListener(`load`,()=>{for(A=!0,c&&L({source:`ckc-expert-agent`,type:`drawer-init`,payload:c}),L({source:`ckc-expert-agent`,type:`drawer-visibility-change`,visible:O});M.length>0&&L(M[0]);)M.shift()}),a.addEventListener(`pointerdown`,e=>{if(e.pointerType===`mouse`&&e.button!==0)return;e.preventDefault(),j==null||j();let t=e.pointerId,r=e.clientX,i=n.getBoundingClientRect().width,o=!1;n.classList.add(`ckc-drawer--dragging`);let c=s.style.pointerEvents;s.style.pointerEvents=`none`;try{a.setPointerCapture(t)}catch(e){}function u(e){e.pointerId===t&&(e.buttons===0?d():(y=l(i+(r-e.clientX),_,v),n.style.width=`${y}px`))}function d(){o||(o=!0,n.classList.remove(`ckc-drawer--dragging`),s.style.pointerEvents=c,a.hasPointerCapture(t)&&a.releasePointerCapture(t),window.removeEventListener(`pointermove`,u),window.removeEventListener(`pointerup`,d),window.removeEventListener(`pointercancel`,d),window.removeEventListener(`blur`,d),document.removeEventListener(`visibilitychange`,f),j===d&&(j=null))}function f(){document.visibilityState===`hidden`&&d()}j=d,window.addEventListener(`pointermove`,u),window.addEventListener(`pointerup`,d),window.addEventListener(`pointercancel`,d),window.addEventListener(`blur`,d),document.addEventListener(`visibilitychange`,f)}),o.addEventListener(`click`,z),n.style.width=`${y}px`,((t=document.body)==null?document.documentElement:t).appendChild(n),E=n,D=s,n},V=()=>{k||O||(E||B(),E.classList.remove(`ckc-drawer--hidden`),E.inert=!1,O=!0,R(!0))};return x.addEventListener(`pointerdown`,e=>{if(e.pointerType===`mouse`&&e.button!==0)return;e.preventDefault(),j==null||j();let t=e.pointerId,n=e.clientX,r=e.clientY,i=C,a=w,s=!1,u=!1;x.classList.add(`ckc-launcher--dragging`);let d=D,f=d?d.style.pointerEvents:``;d&&(d.style.pointerEvents=`none`);try{x.setPointerCapture(t)}catch(e){}function p(e){if(e.pointerId!==t)return;if(e.buttons===0){m(!1);return}let u=e.clientX-n,d=e.clientY-r;!s&&Math.hypot(u,d)<=c||(s=!0,C=l(i+u,0,window.innerWidth-o),w=l(a+d,0,window.innerHeight-o),T())}function m(e){u||(u=!0,x.classList.remove(`ckc-launcher--dragging`),d&&(d.style.pointerEvents=f),x.hasPointerCapture(t)&&x.releasePointerCapture(t),window.removeEventListener(`pointermove`,p),window.removeEventListener(`pointerup`,h),window.removeEventListener(`pointercancel`,g),window.removeEventListener(`blur`,g),document.removeEventListener(`visibilitychange`,_),j===g&&(j=null),!s&&e&&V())}function h(){m(!0)}function g(){m(!1)}function _(){document.visibilityState===`hidden`&&m(!1)}j=g,window.addEventListener(`pointermove`,p),window.addEventListener(`pointerup`,h),window.addEventListener(`pointercancel`,g),window.addEventListener(`blur`,g),document.addEventListener(`visibilitychange`,_)}),((h=document.body)==null?document.documentElement:h).appendChild(x),{get iframe(){return D},open:V,close:z,setWidth:e=>{y=l(e,_,v),E&&(E.style.width=`${y}px`)},sendMessage:e=>{if(k)return;let t={source:`ckc-expert-agent`,type:`drawer-message`,payload:e},n=()=>{M.length>=100&&M.shift(),M.push(t)};!D||!A?n():L(t)||n()},receiveFiles:e=>(N.add(e),()=>{N.delete(e)}),receiveSessionId:e=>(P.add(e),()=>{P.delete(e)}),onVisibilityChange:e=>(F.add(e),()=>{F.delete(e)}),destroy:()=>{k||(k=!0,j==null||j(),O&&(O=!1,R(!1)),window.removeEventListener(`message`,I),N.clear(),P.clear(),F.clear(),M.length=0,x.remove(),E==null||E.remove(),E=null,D=null)}}}typeof window<`u`&&(window.createCkcDrawer=m),e.createDrawer=m});
//# sourceMappingURL=ckc-expert-agent.umd.js.map