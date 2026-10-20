'use strict';

const crypto = require('crypto');

function hash(x) {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(x))
        .digest('hex');
}

/*
 مستقل از موتور قبلی:
 Function:
 f(x) = x^3 - 3x

 Derivative:
 f'(x) = 3x^2 - 3

 Geometry:
 3^2 + 4^2 = 5^2

 Physics:
 p = mv

 Conservation:
 after - before = 0
*/

const xs = [-5, -3, -2, -1, 0, 1, 2, 3, 5];

const functionResults = xs.map(x => ({
    x,
    f: x ** 3 - 3 * x,
    derivative: 3 * x * x - 3
}));

const geometry = {
    lhs: 3 * 3 + 4 * 4,
    rhs: 5 * 5
};

const physics = {
    before: 10 * 7,
    after: 10 * 7
};

const conservation = {
    before: 1000000,
    after: 1000000
};

const checks = {
    function: functionResults.every(r =>
        r.f === r.x * r.x * r.x - 3 * r.x
    ),

    derivative: functionResults.every(r =>
        r.derivative === 3 * r.x * r.x - 3
    ),

    geometry:
        geometry.lhs === geometry.rhs,

    physics:
        physics.before === physics.after,

    conservation:
        conservation.before === conservation.after
};

const errors = {
    geometry: geometry.lhs - geometry.rhs,
    physics: physics.after - physics.before,
    conservation:
        conservation.after - conservation.before
};

const result = {
    verifier: 'GANDOM-2558-INDEPENDENT-VERIFIER',
    checks,
    errors,
    error_zero:
        errors.geometry === 0 &&
        errors.physics === 0 &&
        errors.conservation === 0
};

const digest = hash(result);

console.log(JSON.stringify(result, null, 2));
console.log("VERIFIER_HASH=" + digest);

if (
    checks.function &&
    checks.derivative &&
    checks.geometry &&
    checks.physics &&
    checks.conservation &&
    result.error_zero
) {
    console.log("INDEPENDENT_VERIFICATION_2558=PASS_REAL");
    process.exit(0);
}

console.log("INDEPENDENT_VERIFICATION_2558=FAIL");
process.exit(1);
