'use strict';
const assert=require('node:assert/strict');
function integrate(fn,a,b,n=10000){
 const h=(b-a)/n; let s=0;
 for(let i=0;i<n;i++){const x=a+i*h,y=x+h;s+=(fn(x)+fn(y))*h/2;}
 return s;
}
const numerical=integrate(x=>x*x,0,1),expected=1/3;
assert(Math.abs(numerical-expected)<1e-8);
console.log(JSON.stringify({law:2558,chapter:6,test:'INTEGRAL_ANALYSIS',results:{numerical,expected,error:Math.abs(numerical-expected)},status:'PASS'},null,2));
