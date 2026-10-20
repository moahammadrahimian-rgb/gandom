'use strict';

const fs = require('fs');
const crypto = require('crypto');
const net = require('net');

const TARGET_NODES = 20000;
const REGISTRY = process.env.GANDOM_NODE_REGISTRY ||
  'gandom-core/evidence/real-infrastructure/REAL-NODE-REGISTRY.json';

function fail(msg) {
  console.error(`REAL_INFRASTRUCTURE=FAIL`);
  console.error(`REASON=${msg}`);
  console.error(`FAKE_PASS=BLOCKED`);
  process.exit(1);
}

function load() {
  if (!fs.existsSync(REGISTRY)) return [];
  const raw = fs.readFileSync(REGISTRY, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) fail('REGISTRY_NOT_ARRAY');
  return data;
}

function validNode(n) {
  return Number.isInteger(n.nodeId) &&
    n.nodeId >= 0 &&
    n.nodeId < TARGET_NODES &&
    typeof n.host === 'string' &&
    n.host.length > 0 &&
    Number.isInteger(n.port) &&
    n.port > 0 &&
    n.port <= 65535;
}

function checkTCP(host, port, timeout = 1500) {
  return new Promise(resolve => {
    const s = new net.Socket();
    let done = false;

    const finish = ok => {
      if (done) return;
      done = true;
      s.destroy();
      resolve(ok);
    };

    s.setTimeout(timeout);
    s.once('connect', () => finish(true));
    s.once('timeout', () => finish(false));
    s.once('error', () => finish(false));

    s.connect(port, host);
  });
}

(async () => {
  const nodes = load();

  if (nodes.length !== TARGET_NODES) {
    fail(
      `REAL_NODES=${nodes.length}; REQUIRED=${TARGET_NODES}`
    );
  }

  const ids = new Set();

  for (const n of nodes) {
    if (!validNode(n)) fail('INVALID_REAL_NODE_RECORD');
    if (ids.has(n.nodeId)) fail(`DUPLICATE_NODE_ID=${n.nodeId}`);
    ids.add(n.nodeId);
  }

  if (ids.size !== TARGET_NODES) {
    fail(`UNIQUE_NODE_IDS=${ids.size}`);
  }

  let reachable = 0;

  for (const n of nodes) {
    const ok = await checkTCP(n.host, n.port);
    if (ok) reachable++;
  }

  if (reachable !== TARGET_NODES) {
    fail(
      `REAL_REACHABLE_NODES=${reachable}; REQUIRED=${TARGET_NODES}`
    );
  }

  const canonical = nodes
    .slice()
    .sort((a,b) => a.nodeId - b.nodeId)
    .map(n =>
      `${n.nodeId}|${n.host}|${n.port}|${n.cells}|${n.epoch}`
    )
    .join('\n');

  const root = crypto
    .createHash('sha256')
    .update(canonical)
    .digest('hex');

  const evidence = {
    targetNodes: TARGET_NODES,
    realNodes: nodes.length,
    reachableNodes: reachable,
    evidenceRoot: root,
    verifiedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    'gandom-core/evidence/real-infrastructure/REAL-NODE-REGISTRY-EVIDENCE.json',
    JSON.stringify(evidence, null, 2)
  );

  console.log(`TARGET_NODES=${TARGET_NODES}`);
  console.log(`REAL_NODES=${nodes.length}`);
  console.log(`REACHABLE_NODES=${reachable}`);
  console.log(`EVIDENCE_ROOT=${root}`);
  console.log(`REAL_20000_NODE_INFRASTRUCTURE=PASS`);
  console.log(`FAKE_PASS=BLOCKED`);
})();
