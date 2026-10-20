'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256(value) {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

function findStateFiles() {
  const roots = [
    path.join(process.cwd(), 'gandom-core'),
    path.join(process.cwd(), 'data'),
    path.join(process.cwd(), 'state')
  ];

  const result = [];

  function walk(dir, depth) {
    if (depth > 5) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const e of entries) {
      const p = path.join(dir, e.name);

      if (e.isDirectory()) {
        if (
          e.name !== 'node_modules' &&
          e.name !== '.git' &&
          e.name !== 'backups'
        ) {
          walk(p, depth + 1);
        }
        continue;
      }

      if (!e.isFile()) continue;

      const n = e.name.toLowerCase();

      if (
        n.includes('state') ||
        n.includes('persistence') ||
        n.includes('worker-state')
      ) {
        result.push(p);
      }
    }
  }

  for (const root of roots) walk(root, 0);

  return [...new Set(result)];
}

function readCandidate(file) {
  try {
    const stat = fs.statSync(file);

    if (stat.size > 10 * 1024 * 1024) return null;

    const raw = fs.readFileSync(file);

    return {
      file,
      bytes: raw.length,
      sha256: sha256(raw),
      modified: stat.mtime.toISOString()
    };
  } catch (_) {
    return null;
  }
}

function getStateSnapshot() {
  const candidates = findStateFiles()
    .map(readCandidate)
    .filter(Boolean);

  return {
    ok: true,
    source: 'GANDOM_REAL_STATE_DISCOVERY',
    generatedAt: new Date().toISOString(),
    files: candidates
  };
}

module.exports = {
  getStateSnapshot
};
