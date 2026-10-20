'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(process.cwd());
const EVIDENCE = path.join(ROOT, 'gandom-core', 'evidence');
const OUT = path.join(
  ROOT,
  'runtime-logs',
  `HISTORY-INDEX-2558-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
);

const TARGET = /^ALL-CELL-HISTORY-.*\.txt$/i;

let files = 0;
let bytes = 0;
let errors = 0;

async function indexFile(file, out) {
  const stat = await fsp.stat(file);

  const hash = crypto.createHash('sha256');
  const input = fs.createReadStream(file, {
    highWaterMark: 64 * 1024
  });

  try {
    for await (const chunk of input) {
      hash.update(chunk);
    }

    const sha256 = hash.digest('hex');

    const record = {
      law: 2558,
      type: 'HISTORY_INDEX',
      file: path.relative(ROOT, file),
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      sha256,
      indexedAt: new Date().toISOString(),
      deleteEnabled: false
    };

    out.write(JSON.stringify(record) + '\n');

    files++;
    bytes += stat.size;

    console.log(
      `INDEXED=${record.file} SIZE=${record.sizeBytes} SHA256=${record.sha256}`
    );
  } catch (err) {
    errors++;
    console.error(`INDEX_ERROR=${path.relative(ROOT, file)}`);
    console.error(String(err.message || err));
  }
}

async function main() {
  console.log('LAW=2558');
  console.log('INDEX_MODE=STREAMING');
  console.log('DELETE_ENABLED=FALSE');
  console.log('HISTORY_MUTATION=FALSE');
  console.log(`OUTPUT=${path.relative(ROOT, OUT)}`);

  const out = fs.createWriteStream(OUT, {
    flags: 'wx',
    encoding: 'utf8'
  });

  try {
    const entries = await fsp.readdir(EVIDENCE, {
      withFileTypes: true
    });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!TARGET.test(entry.name)) continue;

      await indexFile(
        path.join(EVIDENCE, entry.name),
        out
      );
    }
  } finally {
    await new Promise(resolve => out.end(resolve));
  }

  console.log('');
  console.log('===== INDEX SUMMARY =====');
  console.log(`FILES_INDEXED=${files}`);
  console.log(`BYTES_INDEXED=${bytes}`);
  console.log(`ERRORS=${errors}`);
  console.log('FILES_DELETED=0');
  console.log('HISTORY_MUTATION=FALSE');
  console.log('DELETE_ENABLED=FALSE');
  console.log('FINAL_PROJECT_PASS=NOT_CLAIMED');
  console.log('NEXT=INDEPENDENT_INDEX_VERIFICATION');

  if (errors > 0) process.exitCode = 2;
}

main().catch(err => {
  console.error('INDEX_FATAL=TRUE');
  console.error(err);
  process.exitCode = 1;
});
