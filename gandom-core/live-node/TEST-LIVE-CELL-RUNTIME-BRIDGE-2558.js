'use strict';

const {
  LiveCellRuntimeBridge2558
} = require('./LIVE-CELL-RUNTIME-BRIDGE-2558.js');

let failures = 0;

function check(name, condition) {
  if (condition) {
    console.log(name + '=PASS_REAL');
  } else {
    console.log(name + '=FAIL_REAL');
    failures++;
  }
}

console.log('===== REAL LIVE CELL BRIDGE TEST =====');
console.log('LAW=2558');
console.log('NO_FAKE_PASS=1');

const bridge = new LiveCellRuntimeBridge2558({
  capacity: 400000,
  intervalMs: 1000
});

const initial = bridge.snapshot();

console.log('INITIAL_CAPACITY=' + initial.capacity);
console.log('INITIAL_ALIVE=' + initial.engine.alive);
console.log('ROOT_CELL_ID=' + initial.rootCellId);

check(
  'ENGINE_LOAD',
  initial.capacity === 400000
);

check(
  'INITIAL_CELL_BIRTH',
  initial.engine.alive >= 1
);

const result1 = bridge.tick();

console.log('TICK_1=' + result1.tick);
console.log('EPOCH_BEFORE=' + result1.before.epoch);
console.log('EPOCH_AFTER=' + result1.after.epoch);
console.log('ALIVE_BEFORE=' + result1.before.alive);
console.log('ALIVE_AFTER=' + result1.after.alive);

check(
  'REAL_TICK_EXECUTION',
  result1.tick === 1
);

check(
  'EPOCH_ADVANCED',
  result1.after.epoch === result1.before.epoch + 1
);

const result2 = bridge.tick();

console.log('TICK_2=' + result2.tick);
console.log('EPOCH_2=' + result2.after.epoch);
console.log('ALIVE_2=' + result2.after.alive);

check(
  'SECOND_REAL_TICK',
  result2.tick === 2
);

check(
  'SECOND_EPOCH_ADVANCED',
  result2.after.epoch === result1.after.epoch + 1
);

const finalSnapshot = bridge.snapshot();

console.log(
  'FINAL_SNAPSHOT=' +
  JSON.stringify(finalSnapshot)
);

console.log('===== FINAL BRIDGE RESULT =====');

if (failures === 0) {
  console.log('LIVE_CELL_RUNTIME_BRIDGE=PASS_REAL');
  console.log('INDEPENDENT_BRIDGE_TEST=PASS_REAL');
  console.log('NEXT=INTEGRATE_BRIDGE_INTO_SINGLE_RUNNING_SERVER');
} else {
  console.log('LIVE_CELL_RUNTIME_BRIDGE=FAIL_REAL');
  console.log('INDEPENDENT_BRIDGE_TEST=FAIL_REAL');
  console.log('NEXT=STOP_AND_FIX_EXACT_FAILURES');
}

console.log('FAILURES=' + failures);
console.log('FILES_DELETED=0');
console.log('MONEY_MOVED=FALSE');
console.log('FINAL_PROJECT_PASS=NOT_CLAIMED');

process.exitCode = failures === 0 ? 0 : 1;
