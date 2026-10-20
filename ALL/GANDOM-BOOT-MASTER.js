'use strict';
// GANDOM BOOT MASTER 2558 — Real Execution Aggregator
// Law 2558 | NO_FAKE_PASS=1

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

const STEPS = [
    { name: 'LAW_2558',      cmd: 'node gandom-core/governance/Law2558ExecutionGate.js' },
    { name: 'SOUL',          cmd: 'node gandom-core/governance/GANDOM-SOUL-2558.js' },
    { name: 'EXPERIENCE',    cmd: 'node gandom-core/revival-live/GANDOM-EXPERIENCE-INJECTOR-2558.js' },
    { name: 'CELL_MATH',     cmd: 'node gandom-core/execution/GANDOM-REAL-CELL-MATH.js' },
    { name: 'NODE_DEATH',    cmd: 'node gandom-core/p2p/neural/GANDOM-NODE-DEATH-2558.js' },
    { name: 'WALLET',        cmd: 'node wallet/GANDOM-WALLET-2558.js' },
    { name: 'BANK_TEST',     cmd: 'node -e "const W=require(\'./wallet/modules/index.js\'); const a=W.createWallet(1000000); const b=W.createWallet(0); W.transfer(a,b,100000); console.log(\'BANK_PASS\');"' },
    { name: 'WORKFORCE',     cmd: 'node employees/workforce.js' },
    { name: 'ACCOUNTANT',    cmd: 'node employees/AI-ACCOUNTANT-038.js' },
    { name: 'TREASURER',     cmd: 'node employees/AI-TREASURER-039.js' },
    { name: 'MARKETER',      cmd: 'node employees/AI-MARKETER-037.js' },
    // AUDIT_SERVICE: READ-ONLY; never kill shared Node.js processes
];

console.log('==========================================');
console.log('GANDOM BOOT MASTER 2558');
console.log('LAW=2558 | NO_FAKE_PASS=1');
console.log('==========================================');

let passed = 0;
let failed = 0;

for (const step of STEPS) {
    process.stdout.write('[' + step.name + '] ... ');
    try {
        const out = execSync(step.cmd, {
            cwd: ROOT, timeout: 30000, stdio: 'pipe'
        }).toString().trim();

        if (out.length > 0 && /(?:^|\n).*\bPASS_REAL\b/.test(out)
            && !/(?:^|\n).*\b(?:FAIL|ERROR|PARTIAL)\b/.test(out)) {
            console.log('PASS_REAL_EVIDENCE_PRESENT');
            passed++;
        } else {
            console.log('FAIL_CLOSED — missing or invalid evidence');
            failed++;
        }
    } catch (e) {
        console.log('❌ FAIL: ' + (e.message || '').slice(0, 60));
        failed++;
    }
}

console.log('');
console.log('==========================================');
console.log('PASSED=' + passed);
console.log('FAILED=' + failed);
console.log('==========================================');

if (failed === 0 && passed === STEPS.length) {
    console.log('MASTER_BOOT=PASS_REAL');
} else {
    console.log('MASTER_BOOT=FAIL_CLOSED');
}
console.log('FAKE_PASS=BLOCKED');
