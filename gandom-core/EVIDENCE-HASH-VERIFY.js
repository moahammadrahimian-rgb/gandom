'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');

const events = [
  {
    ts: '2026-10-02T15:22:18.103Z',
    event: 'MESSAGE_RECEIVED',
    node_id: '53cac16f-c053-4c75-b2d4-c21aae0acc04',
    peer_id: 'client-1790954530976',
    type: 'DATA'
  },
  {
    ts: '2026-10-02T15:23:28.469Z',
    event: 'PEER_CONNECTED',
    node_id: '53cac16f-c053-4c75-b2d4-c21aae0acc04',
    peer_id: 'client-1790954608413',
    peers: 1
  },
  {
    ts: '2026-10-02T15:23:28.487Z',
    event: 'MESSAGE_RECEIVED',
    node_id: '53cac16f-c053-4c75-b2d4-c21aae0acc04',
    peer_id: 'client-1790954608413',
    type: 'HELLO'
  },
  {
    ts: '2026-10-02T15:23:29.493Z',
    event: 'MESSAGE_RECEIVED',
    node_id: '53cac16f-c053-4c75-b2d4-c21aae0acc04',
    peer_id: 'client-1790954608413',
    type: 'DATA'
  }
];

let previousHash = 'GENESIS-2558';
const chain = [];

for (const event of events) {
  const payload = JSON.stringify({
    previous_hash: previousHash,
    event
  });

  const hash = crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex');

  chain.push({
    ...event,
    previous_hash: previousHash,
    hash
  });

  previousHash = hash;
}

const evidence = {
  law: 2558,
  evidence_type: 'P2P_EVENT_HASH_CHAIN',
  node_id: '53cac16f-c053-4c75-b2d4-c21aae0acc04',
  event_count: chain.length,
  chain,
  final_hash: previousHash,
  verification: 'PENDING_INDEPENDENT_VERIFIER'
};

const out =
  `evidence/p2p/EVIDENCE-${Date.now()}.json`;

fs.writeFileSync(out, JSON.stringify(evidence, null, 2));

console.log('EVIDENCE_HASH_CHAIN=PASS');
console.log(`EVENT_COUNT=${chain.length}`);
console.log(`FINAL_HASH=${previousHash}`);
console.log(`EVIDENCE_FILE=${out}`);
console.log('INDEPENDENT_VERIFICATION=PENDING');
