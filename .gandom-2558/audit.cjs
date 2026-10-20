const fs = require('fs');
const crypto = require('crypto');

const files = [
  'blockchain-data/chain.json',
  'blockchain-data-b/chain.json'
];

const report = { time: new Date().toISOString(), checks: [] };

for (const file of files) {
  try {
    const raw = fs.readFileSync(file);
    const parsed = JSON.parse(raw.toString('utf8'));
    const chain = Array.isArray(parsed) ? parsed : parsed.chain;
    const errors = [];

    if (!Array.isArray(chain) || chain.length === 0) {
      errors.push('EMPTY_OR_INVALID_CHAIN');
    } else {
      for (let i = 0; i < chain.length; i++) {
        const b = chain[i];
        if (Number(b.index) !== i) errors.push('INDEX_ERROR_' + i);
        if (i > 0 && b.prevHash !== chain[i - 1].hash)
          errors.push('LINK_ERROR_' + i);
        if (!b.hash) errors.push('MISSING_HASH_' + i);
      }
    }

    report.checks.push({
      file,
      status: errors.length ? 'FAIL' : 'PASS_STRUCTURE_ONLY',
      errors,
      bytes: raw.length,
      sha256: crypto.createHash('sha256').update(raw).digest('hex'),
      blocks: Array.isArray(chain) ? chain.length : 0,
      genesisHash: chain[0]?.hash ?? null,
      latestIndex: chain[chain.length - 1]?.index ?? null
    });
  } catch (e) {
    report.checks.push({ file, status: 'ERROR', error: e.message });
  }
}

const dest = '.gandom-2558/structure-report.json';
fs.writeFileSync(dest, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log('REPORT_SAVED=' + dest);
