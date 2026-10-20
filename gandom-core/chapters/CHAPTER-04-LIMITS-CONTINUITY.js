'use strict';
const assert=require('node:assert/strict');
function f(x){return (x*x-1)/(x-1);}
function g(x){return Math.sin(x)/x;}
function limit(fn,x,h=1e-6){return (fn(x+h)+fn(x-h))/2;}
const a=limit(f,1),b=limit(g,0);
assert(Math.abs(a-2)<1e-5); assert(Math.abs(b-1)<1e-10);
console.log(JSON.stringify({law:2558,chapter:4,test:'LIMITS_CONTINUITY',results:{removable:a,sinc:b},status:'PASS'},null,2));
