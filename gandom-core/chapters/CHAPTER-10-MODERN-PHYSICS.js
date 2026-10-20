'use strict';
const assert=require('node:assert/strict');
const c=299792458,h=6.62607015e-34,lambda=500e-9;
const photonEnergy=h*c/lambda;
assert(Number.isFinite(photonEnergy)&&photonEnergy>0);
console.log(JSON.stringify({law:2558,chapter:10,test:'MODERN_PHYSICS_PHOTON',results:{c,h,wavelength:lambda,photonEnergy},status:'PASS'},null,2));
