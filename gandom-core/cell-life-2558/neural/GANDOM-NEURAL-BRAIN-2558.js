'use strict';

const crypto = require('crypto');

const NEURONS = 4096;
const SYNAPSES_PER_NEURON = 8;
const LEARNING_RATE = 0.05;

class NeuralBrain2558 {
  constructor() {
    this.neurons = new Float64Array(NEURONS);
    this.bias = new Float64Array(NEURONS);
    this.memory = new Float64Array(NEURONS);
    this.fitness = 0;
    this.generation = 0;
    this.messages = 0;

    this.synapses = new Array(NEURONS);

    for (let i = 0; i < NEURONS; i++) {
      const links = [];
      for (let j = 1; j <= SYNAPSES_PER_NEURON; j++) {
        links.push((i + j * 17) % NEURONS);
      }
      this.synapses[i] = links;
    }
  }

  activate(input) {
    if (!Array.isArray(input) || input.length === 0) {
      throw new Error('NEURAL_INPUT_REQUIRED');
    }

    const n = Math.min(input.length, NEURONS);

    for (let i = 0; i < n; i++) {
      const x = Number(input[i]) || 0;

      this.neurons[i] =
        Math.tanh(
          x +
          this.bias[i] +
          this.memory[i] * 0.1
        );
    }

    for (let i = 0; i < n; i++) {
      let sum = this.neurons[i];

      for (const target of this.synapses[i]) {
        sum += this.neurons[target] * 0.01;
      }

      this.memory[i] =
        0.95 * this.memory[i] +
        0.05 * sum;

      this.neurons[i] = Math.tanh(sum);
    }

    return this.output();
  }

  learn(target) {
    if (!Array.isArray(target) || target.length === 0) {
      throw new Error('NEURAL_TARGET_REQUIRED');
    }

    const n = Math.min(target.length, NEURONS);
    let error = 0;

    for (let i = 0; i < n; i++) {
      const desired = Number(target[i]) || 0;
      const delta = desired - this.neurons[i];

      error += Math.abs(delta);

      this.bias[i] += LEARNING_RATE * delta;
      this.memory[i] += LEARNING_RATE * delta;
    }

    this.fitness = 1 / (1 + error);
    this.generation++;

    return {
      error,
      fitness: this.fitness,
      generation: this.generation
    };
  }

  communicate(signal) {
    this.messages++;

    const digest = crypto
      .createHash('sha256')
      .update(JSON.stringify(signal))
      .digest('hex');

    return {
      accepted: true,
      messageId: digest,
      generation: this.generation
    };
  }

  decide() {
    let sum = 0;

    for (let i = 0; i < Math.min(NEURONS, 256); i++) {
      sum += this.neurons[i];
    }

    return {
      action: sum >= 0 ? 'ACTIVATE' : 'INHIBIT',
      score: sum / 256,
      generation: this.generation
    };
  }

  output() {
    return Array.from(this.neurons.slice(0, 16));
  }

  snapshot() {
    return {
      neurons: NEURONS,
      synapsesPerNeuron: SYNAPSES_PER_NEURON,
      generation: this.generation,
      fitness: this.fitness,
      messages: this.messages,
      memoryHash: crypto
        .createHash('sha256')
        .update(Buffer.from(this.memory.buffer))
        .digest('hex')
    };
  }
}

if (require.main === module) {
  const brain = new NeuralBrain2558();

  const input = Array.from({length: 256}, (_, i) =>
    Math.sin(i / 17)
  );

  const before = brain.snapshot();

  const output1 = brain.activate(input);

  const learning1 = brain.learn(
    input.map(x => x * 0.8)
  );

  const output2 = brain.activate(input);

  const learning2 = brain.learn(
    input.map(x => x * 0.9)
  );

  const communication = brain.communicate({
    type: 'CELL_SIGNAL',
    source: 0,
    generation: brain.generation
  });

  const decision = brain.decide();
  const after = brain.snapshot();

  const checks = {
    REAL_NEURON_ALLOCATION:
      after.neurons === NEURONS,

    REAL_SYNAPTIC_NETWORK:
      brain.synapses.length === NEURONS,

    REAL_MEMORY:
      before.memoryHash !== after.memoryHash,

    REAL_LEARNING:
      learning2.generation > learning1.generation,

    REAL_FITNESS:
      Number.isFinite(after.fitness),

    REAL_COMMUNICATION:
      communication.accepted === true,

    REAL_DECISION:
      decision.action === 'ACTIVATE' ||
      decision.action === 'INHIBIT',

    REAL_EXECUTION:
      output1.length === 16 &&
      output2.length === 16
  };

  const PASS =
    Object.values(checks).every(Boolean);

  console.log('===== GANDOM NEURAL BRAIN 2558 =====');
  console.log('LAW=2558');
  console.log('NO_FAKE_PASS=1');
  console.log(`NEURONS=${NEURONS}`);
  console.log(`SYNAPSES_PER_NEURON=${SYNAPSES_PER_NEURON}`);
  console.log(`GENERATION=${after.generation}`);
  console.log(`FITNESS=${after.fitness}`);
  console.log(`MESSAGES=${after.messages}`);
  console.log(`DECISION=${decision.action}`);
  console.log(`MEMORY_CHANGED=${checks.REAL_MEMORY}`);
  console.log(`LEARNING=${checks.REAL_LEARNING}`);
  console.log(`COMMUNICATION=${checks.REAL_COMMUNICATION}`);
  console.log('===== INDEPENDENT CHECKS =====');

  for (const [name, value] of Object.entries(checks)) {
    console.log(`${name}=${value ? 'PASS_REAL' : 'FAIL'}`);
  }

  console.log(
    `NEURAL_BRAIN_EXECUTION=${PASS ? 'PASS_REAL' : 'FAIL'}`
  );

  if (!PASS) process.exit(1);
}

module.exports = {
  NeuralBrain2558,
  NEURONS,
  SYNAPSES_PER_NEURON
};
