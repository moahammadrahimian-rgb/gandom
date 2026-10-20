'use strict';
const assert=require('node:assert/strict');
function step(x,v,dt){const a=-x;return{x:x+v*dt,v:v+a*dt};}
let x=1,v=0;const dt=.001;
for(let i=0;i<1000;i++){const s=step(x,v,dt);x=s.x;v=s.v;}
const r=Math.sqrt(x*x+v*v);
assert(Number.isFinite(x)&&Number.isFinite(v));
assert(Math.abs(r-1)<.01);
console.log(JSON.stringify({law:2558,chapter:7,test:'EQUATIONS_DYNAMICS',results:{x,v,r,steps:1000,dt},status:'PASS'},null,2));
