'use strict';
const assert=require('node:assert/strict');
function f(x){return x*x*x+2*x;}
function derivative(fn,x,h=1e-5){return (fn(x+h)-fn(x-h))/(2*h);}
const x=2,numerical=derivative(f,x),expected=3*x*x+2;
assert(Math.abs(numerical-expected)<1e-6);
console.log(JSON.stringify({law:2558,chapter:5,test:'DERIVATIVE_CHANGE',results:{x,numerical,expected,error:Math.abs(numerical-expected)},status:'PASS'},null,2));
