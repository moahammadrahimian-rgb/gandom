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
