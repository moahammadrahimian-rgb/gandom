'use strict';
const assert=require('node:assert/strict');
const k=8.9875517923e9;
function force(q1,q2,r){return k*q1*q2/(r*r);}
function field(q,r){return k*q/(r*r);}
const q1=1e-6,q2=2e-6,r=.1,F=force(q1,q2,r),E=field(q1,r);
assert(F>0&&E>0);
assert(Math.abs(F/(q2*E)-1)<1e-12);
console.log(JSON.stringify({law:2558,chapter:9,test:'ELECTROMAGNETISM_FIELDS',results:{force:F,field:E,consistency:F/(q2*E)},status:'PASS'},null,2));
