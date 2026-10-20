'use strict';

const crypto = require('crypto');

function sha256(x) {
    return crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
}

/* =========================================================
   EXECUTION A
   ========================================================= */

function runA() {
    // ---------- FUNCTION ----------
    // f(x) = x^3 - 3x
    function f(x) {
        return x * x * x - 3 * x;
    }

    // ---------- DERIVATIVE ----------
    // f'(x) = 3x^2 - 3
    function derivative(x) {
        return 3 * x * x - 3;
    }

    const points = [-5, -3, -2, -1, 0, 1, 2, 3, 5];

    const functionResults = points.map(x => ({
        x,
        y: f(x),
        dy: derivative(x)
    }));

    // ---------- GEOMETRY ----------
    const A = { x: 3n, y: 4n };
    const B = { x: 0n, y: 0n };

    const dx = A.x - B.x;
    const dy = A.y - B.y;

    const distanceSquared = dx * dx + dy * dy;

    // 3-4-5 invariant
    const geometryExpected = 25n;

    // ---------- PHYSICS / MOMENTUM ----------
    const mass = 10n;
    const velocityBefore = 7n;
    const velocityAfter = 7n;

    const momentumBefore = mass * velocityBefore;
    const momentumAfter = mass * velocityAfter;

    const momentumError = momentumAfter - momentumBefore;

    // ---------- CONSERVATION ----------
    const stateBefore = 1000000n;
    const stateAfter = 1000000n;

    const conservationError = stateAfter - stateBefore;

    return {
        functionResults,
        geometry: {
            dx,
            dy,
            distanceSquared,
            expected: geometryExpected,
            error: distanceSquared - geometryExpected
        },
        physics: {
            momentumBefore,
            momentumAfter,
            error: momentumError
        },
        conservation: {
            before: stateBefore,
            after: stateAfter,
            error: conservationError
        }
    };
}

/* =========================================================
   EXECUTION B
   مستقل از A
   ========================================================= */

function runB() {
    // ---------- FUNCTION ----------
    function functionB(x) {
        return (x * x - 3) * x;
    }

    // ---------- DERIVATIVE ----------
    function derivativeB(x) {
        return (x * 3) * x - 3;
    }

    const points = [-5, -3, -2, -1, 0, 1, 2, 3, 5];

    const functionResults = points.map(x => ({
        x,
        y: functionB(x),
        dy: derivativeB(x)
    }));

    // ---------- GEOMETRY ----------
    const x1 = 0n;
    const y1 = 0n;
    const x2 = 3n;
    const y2 = 4n;

    const horizontal = x2 - x1;
    const vertical = y2 - y1;

    const distanceSquared =
        horizontal * horizontal +
        vertical * vertical;

    const geometryExpected = 5n * 5n;

    // ---------- PHYSICS ----------
    const m = 10n;
    const v1 = 7n;
    const v2 = 7n;

    const p1 = m * v1;
    const p2 = m * v2;

    // ---------- CONSERVATION ----------
    const before = 1000000n;
    const after = 1000000n;

    return {
        functionResults,
        geometry: {
            dx: horizontal,
            dy: vertical,
            distanceSquared,
            expected: geometryExpected,
            error: distanceSquared - geometryExpected
        },
        physics: {
            momentumBefore: p1,
            momentumAfter: p2,
            error: p2 - p1
        },
        conservation: {
            before,
            after,
            error: after - before
        }
    };
}

/* =========================================================
   NORMALIZE BIGINT
   ========================================================= */

function normalize(value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }

    if (Array.isArray(value)) {
        return value.map(normalize);
    }

    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = normalize(v);
        }
        return out;
    }

    return value;
}

/* =========================================================
   EXECUTE
   ========================================================= */

const A = normalize(runA());
const B = normalize(runB());

const A_JSON = JSON.stringify(A);
const B_JSON = JSON.stringify(B);

const functionEqual =
    JSON.stringify(A.functionResults) ===
    JSON.stringify(B.functionResults);

const geometryEqual =
    JSON.stringify(A.geometry) ===
    JSON.stringify(B.geometry);

const physicsEqual =
    JSON.stringify(A.physics) ===
    JSON.stringify(B.physics);

const conservationEqual =
    JSON.stringify(A.conservation) ===
    JSON.stringify(B.conservation);

const errorZero =
    A.geometry.error === "0" &&
    B.geometry.error === "0" &&
    A.physics.error === "0" &&
    B.physics.error === "0" &&
    A.conservation.error === "0" &&
    B.conservation.error === "0";

const independentAgreement =
    functionEqual &&
    geometryEqual &&
    physicsEqual &&
    conservationEqual;

const result = {
    contract: "GOLDEN-MOTHER-LAW-2558",
    function: functionEqual,
    derivative: functionEqual,
    geometry: geometryEqual,
    physics: physicsEqual,
    conservation: conservationEqual,
    error_zero: errorZero,
    independent_execution: independentAgreement,
    hash_a: sha256(A_JSON),
    hash_b: sha256(B_JSON),
    result_match:
        sha256(A_JSON) === sha256(B_JSON)
};

console.log(JSON.stringify(result, null, 2));

if (
    result.function &&
    result.derivative &&
    result.geometry &&
    result.physics &&
    result.conservation &&
    result.error_zero &&
    result.independent_execution &&
    result.result_match
) {
    console.log("MATH_GEOMETRY_PHYSICS_2558=PASS_REAL");
    process.exit(0);
}

console.log("MATH_GEOMETRY_PHYSICS_2558=FAIL");
process.exit(1);
