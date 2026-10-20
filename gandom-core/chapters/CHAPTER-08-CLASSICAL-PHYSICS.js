'use strict';
const assert=require('node:assert/strict');
function momentum(m,v){return m*v;}
function kineticEnergy(m,v){return .5*m*v*v;}
const m=2,v=3,p=momentum(m,v),E=kineticEnergy(m,v);
assert.equal(p,6); assert.equal(E,9);
console.log(JSON.stringify({law:2558,chapter:8,test:'CLASSICAL_PHYSICS',results:{mass:m,velocity:v,momentum:p,kineticEnergy:E},status:'PASS'},null,2));
