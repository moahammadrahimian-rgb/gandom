'use strict';

const { LiveCellRuntimeBridge2558 } =
  require('./LIVE-CELL-RUNTIME-BRIDGE-2558');

let failures = 0;

function check(name, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}_${name}`);
  if (!condition) failures++;
}

const bridge = new LiveCellRuntimeBridge2558({
  capacity: 2,
  intervalMs: 1000
});

try {
  const initial = bridge.snapshot();
  check('BRIDGE_CREATED', !!initial);
  check('CAPACITY_TWO', initial.capacity === 2);
  check('INITIAL_EPOCH_ZERO', initial.engine.epoch === 0);

  const first = bridge.tick();
  check('TICK_ONE', first.tick === 1);
  check('EPOCH_ONE', first.epoch === 1);
  check('FIRST_SNAPSHOT_EPOCH', first.after.epoch === 1);

  const second = bridge.tick();
  check('TICK_TWO', second.tick === 2);
  check('EPOCH_TWO', second.epoch === 2);
  check('SECOND_SNAPSHOT_EPOCH', second.after.epoch === 2);

  const final = bridge.snapshot();
  check('FINAL_EPOCH_TWO', final.engine.epoch === 2);
  check('ROOT_CELL_ALIVE', final.engine.alive === 1);

  console.log('FINAL_SNAPSHOT=' + JSON.stringify(final));
} catch (err) {
  failures++;
  console.error('TEST_ERROR=' + err.stack);
} finally {
  bridge.stop();
}

console.log('FAILURES=' + failures);
console.log(failures === 0
  ? 'BRIDGE_RUNTIME_TEST=PASS_REAL'
  : 'BRIDGE_RUNTIME_TEST=FAIL_REAL');
console.log('SERVER_CHANGED=0');
