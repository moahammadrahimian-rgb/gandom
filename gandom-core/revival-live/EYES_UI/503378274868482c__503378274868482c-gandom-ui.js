'use strict';

const GANDOM_UI = {
  version: '1.0.0',
  sections: 5,
  appId: 'com.gandom.app'
};

window.GANDOM_UI = Object.freeze(GANDOM_UI);

const $ = (selector) => document.querySelector(selector);

function activateView(name){
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${name}`);
  });

  document.querySelectorAll('.nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
}

document.querySelectorAll('.nav button').forEach(button => {
  button.addEventListener('click', () => activateView(button.dataset.view));
});

function drawChart(){
  const canvas = $('#marketChart');
  if(!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;

  ctx.clearRect(0,0,w,h);

  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;

  for(let i=1;i<5;i++){
    const y = h*i/5;
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(w,y);
    ctx.stroke();
  }

  /*
   * این خط فقط برای نمایش ساختار نمودار است.
   * هیچ قیمت یا داده بازار جعلی تولید نمی‌شود.
   */
  ctx.strokeStyle = '#22b77d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20,h*.70);
  ctx.lineTo(w*.25,h*.58);
  ctx.lineTo(w*.42,h*.63);
  ctx.lineTo(w*.60,h*.40);
  ctx.lineTo(w*.78,h*.48);
  ctx.lineTo(w-20,h*.28);
  ctx.stroke();
}

async function checkRuntime(){
  const status = $('#runtimeStatus');

  try{
    const response = await fetch('/health', {
      method:'GET',
      cache:'no-store'
    });

    if(!response.ok) throw new Error('HTTP '+response.status);

    status.textContent = 'Runtime Online';
    status.classList.remove('offline');
  }catch(error){
    status.textContent = 'Runtime Offline';
    status.classList.add('offline');
  }
}

window.addEventListener('resize', drawChart);

document.addEventListener('DOMContentLoaded', () => {
  drawChart();
  checkRuntime();
});


/* GANDOM_BACK_NAV_V1 */
(function(){
  'use strict';

  const NAV_KEY = 'gandom-nav-v1';
  let restoring = false;

  function viewButtons(){
    return Array.from(document.querySelectorAll('[data-view]'));
  }

  function getCurrentView(){
    const active=document.querySelector('[data-view].active,[data-view][aria-current="page"]');
    if(active && active.dataset.view) return active.dataset.view;

    const visible=viewButtons().find(b=>{
      const id=b.dataset.view;
      if(!id) return false;
      const target=document.getElementById(id);
      if(!target) return false;
      const st=getComputedStyle(target);
      return st.display!=='none' && st.visibility!=='hidden';
    });

    return visible ? visible.dataset.view : null;
  }

  function findView(view){
    return viewButtons().find(b=>b.dataset.view===view);
  }

  function saveScroll(){
    return {
      x:window.scrollX || 0,
      y:window.scrollY || 0
    };
  }

  function restoreScroll(pos){
    if(!pos) return;
    requestAnimationFrame(()=>{
      window.scrollTo(pos.x || 0,pos.y || 0);
    });
  }

  function makeState(view){
    return {
      gandomNav:NAV_KEY,
      view:view || null,
      scroll:saveScroll(),
      time:Date.now()
    };
  }

  function applyView(view,scroll){
    if(!view) return false;

    const button=findView(view);
    if(!button) return false;

    restoring=true;
    try{
      button.click();
    }finally{
      setTimeout(()=>{
        restoring=false;
        restoreScroll(scroll);
      },0);
    }
    return true;
  }

  function ensureInitialState(){
    const current=getCurrentView();
    const st=history.state;

    if(!st || st.gandomNav!==NAV_KEY){
      history.replaceState(makeState(current),'',location.href);
    }
  }

  function goBack(){
    if(history.state && history.state.gandomNav===NAV_KEY){
      history.back();
      return true;
    }
    return false;
  }

  document.addEventListener('click',function(event){
    const back=event.target.closest('[data-gandom-back]');
    if(back){
      event.preventDefault();
      goBack();
      return;
    }

    const button=event.target.closest('[data-view]');
    if(!button || restoring) return;

    const view=button.dataset.view;
    if(!view) return;

    const current=history.state && history.state.gandomNav===NAV_KEY
      ? history.state.view
      : getCurrentView();

    if(current===view) return;

    history.pushState(makeState(view),'',location.href);
  });

  window.addEventListener('popstate',function(event){
    const st=event.state;

    if(st && st.gandomNav===NAV_KEY){
      if(!applyView(st.view,st.scroll)){
        console.warn('GANDOM_BACK_VIEW_NOT_FOUND',st.view);
      }
      return;
    }

    const initial=getCurrentView();
    if(initial) applyView(initial);
  });

  document.addEventListener('keydown',function(event){
    if(event.key==='Escape'){
      const overlay=document.querySelector(
        '[aria-modal="true"]:not([hidden]),' +
        '.modal.open,.modal.active,' +
        '.drawer.open,.drawer.active,' +
        '.bottom-sheet.open,.bottom-sheet.active'
      );

      if(overlay){
        const close=overlay.querySelector(
          '[data-close],[data-dismiss],.close,.modal-close,.drawer-close'
        );

        if(close){
          close.click();
          return;
        }
      }

      goBack();
    }
  });

  window.GANDOM_NAV={
    version:'1.0.0',
    back:goBack,
    current:getCurrentView,
    state:function(){return history.state;}
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',ensureInitialState,{once:true});
  }else{
    ensureInitialState();
  }

  console.log('GANDOM_BACK_NAV=READY');
})();
