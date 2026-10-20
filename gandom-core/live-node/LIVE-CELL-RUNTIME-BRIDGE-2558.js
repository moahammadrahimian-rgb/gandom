'use strict';

const { CellLifeEngine2558 } =
  require('../cell-life-2558/CELL-LIFE-ENGINE-2558.js');

class LiveCellRuntimeBridge2558 {
  constructor(options = {}) {
    this.capacity = Number(options.capacity || 400000);
    this.intervalMs = Number(options.intervalMs || 5000);

    this.engine = new CellLifeEngine2558(this.capacity);

    this.running = false;
    this.timer = null;
    this.tickCount = 0;
    this.startedAt = Date.now();

    const first = this.engine.birth();

    if (!Number.isInteger(first) || first < 0) {
      throw new Error('INITIAL_CELL_BIRTH_FAILED');
    }

    this.rootCellId = first;
  }

  tick() {
    const before = this.engine.snapshot();

    const epoch = this.engine.tick();

    const after = this.engine.snapshot();

    this.tickCount++;

    return {
      epoch,
      tick: this.tickCount,
      rootCellId: this.rootCellId,
      before,
      after,
      energyChanged:
        before.alive !== after.alive ||
        before.epoch !== after.epoch ||
        before.births !== after.births ||
        before.deaths !== after.deaths ||
        before.mutations !== after.mutations
    };
  }

  snapshot() {
    return {
      capacity: this.capacity,
      running: this.running,
      tickCount: this.tickCount,
      uptimeMs: Date.now() - this.startedAt,
      rootCellId: this.rootCellId,
      engine: this.engine.snapshot()
    };
  }

  start() {
    if (this.running) {
      return this.snapshot();
    }

    this.running = true;

    this.timer = setInterval(() => {
      try {
        const result = this.tick();

        console.log(
          JSON.stringify({
            type: 'LIVE_CELL_TICK',
            tick: result.tick,
            epoch: result.epoch,
            alive: result.after.alive,
            births: result.after.births,
            deaths: result.after.deaths,
            mutations: result.after.mutations
          })
        );
      } catch (err) {
        console.error('LIVE_CELL_TICK_ERROR=' + err.message);
        this.stop();
      }
    }, this.intervalMs);

    return this.snapshot();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.running = false;

    return this.snapshot();
  }
}

module.exports = {
  LiveCellRuntimeBridge2558
};
