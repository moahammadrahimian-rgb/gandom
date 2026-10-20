'use strict';

class Gamete2558 {
  constructor(cellId, genome, generation, sourceNode) {
    this.cellId = cellId;
    this.genome = genome;
    this.generation = generation;
    this.sourceNode = sourceNode;
    this.type = 'GAMETE';
    this.createdAt = Date.now();
  }

  toPayload() {
    return {
      cellId: this.cellId,
      genome: this.genome,
      generation: this.generation,
      sourceNode: this.sourceNode,
      type: this.type,
      createdAt: this.createdAt
    };
  }
}

module.exports = { Gamete2558 };
