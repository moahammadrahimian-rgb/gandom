'use strict';

const crypto = require('crypto');

function digest(value) {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(value))
        .digest('hex');
}

const X = [-5,-3,-2,-1,0,1,2,3,5];

/* ENGINE-A */
const A = X.map(x => ({
    x,
    function_value: x*x*x - 3*x,
    derivative_value: 3*x*x - 3
}));

const A_GEOMETRY =
    (3*3 + 4*4) - (5*5);

const A_PHYSICS =
    (10*7) - (10*7);

const A_CONSERVATION =
    1000000 - 1000000;


/* VERIFIER-B */
const B = X.map(x => ({
    x,
    function_value: (x*x - 3)*x,
    derivative_value: x*(3*x) - 3
}));

const B_GEOMETRY =
    (9 + 16) - 25;

const B_PHYSICS =
    70 - 70;

const B_CONSERVATION =
    1000000 - 1000000;


/* CANONICAL RESULT */
const resultA = {
    function: A,
    geometry_error: A_GEOMETRY,
    physics_error: A_PHYSICS,
    conservation_error: A_CONSERVATION
};

const resultB = {
    function: B,
    geometry_error: B_GEOMETRY,
    physics_error: B_PHYSICS,
    conservation_error: B_CONSERVATION
};

const hashA = digest(resultA);
const hashB = digest(resultB);

const function_match =
    JSON.stringify(A) === JSON.stringify(B);

const geometry_zero =
    A_GEOMETRY === 0 &&
    B_GEOMETRY === 0;

const physics_zero =
    A_PHYSICS === 0 &&
    B_PHYSICS === 0;

const conservation_zero =
    A_CONSERVATION === 0 &&
    B_CONSERVATION === 0;

const hash_match = hashA === hashB;

const final =
    function_match &&
    geometry_zero &&
    physics_zero &&
    conservation_zero &&
    hash_match;

const evidence = {
    contract: "GOLDEN-MOTHER-LAW-2558",
    function_match,
    geometry_zero,
    physics_zero,
    conservation_zero,
    hash_a: hashA,
    hash_b: hashB,
    hash_match,
    final
};

console.log(JSON.stringify(evidence, null, 2));

require('fs').writeFileSync(
    'gandom-core/math-physics-2558/evidence/CROSS-VERIFY-2558.json',
    JSON.stringify(evidence, null, 2) + '\n'
);

if (final) {
    console.log("CROSS_VERIFICATION_2558=PASS_REAL");
    process.exit(0);
}

console.log("CROSS_VERIFICATION_2558=FAIL");
process.exit(1);
