'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const ROOT = path.resolve(process.cwd());
const INDEX_DIR = path.join(ROOT, 'runtime-logs');

async function main() {
  const indexes = (await fsp.readdir(INDEX_DIR))
    .filter(x =>
      x.startsWith('HISTORY-INDEX-2558-') &&
      x.endsWith('.jsonl')
    )
    .sort();

  if (!indexes.length) {
    console.error('INDEX_NOT_FOUND');
    process.exit(1);
  }

  const indexFile = path.join(
    INDEX_DIR,
    indexes[indexes.length - 1]
  );

  /*
   * IMPORTANT:
   * Only the small JSONL index is read.
   * The original history files are NOT read.
   */
  const content = await fsp.readFile(indexFile, 'utf8');

  const records = content
    .split('\n')
    .filter(Boolean)
    .map(JSON.parse);

  let valid = true;
  let existing = 0;
  let missing = 0;
  let totalIndexedBytes = 0;

  console.log(`LAW=2558`);
  console.log(`MODE=INDEX_LOOKUP_ONLY`);
  console.log(`INDEX=${path.relative(ROOT, indexFile)}`);
  console.log(`RECORDS=${records.length}`);

  for (const r of records) {
    const full = path.join(ROOT, r.file);

    const required =
      r.law === 2558 &&
      r.type === 'HISTORY_INDEX' &&
      r.deleteEnabled === false &&
      typeof r.file === 'string' &&
      Number.isInteger(r.sizeBytes) &&
      typeof r.sha256 === 'string' &&
      r.sha256.length === 64;

    if (!required) {
      valid = false;
      console.log(`RECORD_VALID=FAIL_REAL FILE=${r.file}`);
      continue;
    }

    totalIndexedBytes += r.sizeBytes;

    try {
      const stat = await fsp.stat(full);

      existing++;

      const sizeMatches = stat.size === r.sizeBytes;

      console.log(
        `INDEX_FILE=${r.file} ` +
        `INDEX_SIZE=${r.sizeBytes} ` +
        `CURRENT_SIZE=${stat.size} ` +
        `SIZE_MATCH=${sizeMatches}`
      );

      if (!sizeMatches) valid = false;

    } catch {
      missing++;
      valid = false;
      console.log(
        `INDEX_FILE=${r.file} ` +
        `CURRENT_FILE=NOT_FOUND`
      );
    }
  }

  const mem = process.memoryUsage();

  console.log('');
  console.log('===== INDEX LOOKUP SUMMARY =====');
  console.log(`INDEX_RECORDS=${records.length}`);
  console.log(`EXISTING_FILES=${existing}`);
  console.log(`MISSING_FILES=${missing}`);
  console.log(`INDEXED_BYTES=${totalIndexedBytes}`);
  console.log(`INDEX_RECORDS_VALID=${valid ? 'PASS_REAL' : 'FAIL_REAL'}`);
  console.log(`HASH_RECALCULATION=FALSE`);
  console.log(`LARGE_HISTORY_READ=FALSE`);
  console.log(`FILES_DELETED=0`);
  console.log(`DELETE_ENABLED=FALSE`);
  console.log(`HISTORY_MUTATION=FALSE`);
  console.log(`RSS_MB=${(mem.rss / 1024 / 1024).toFixed(2)}`);
  console.log(`FINAL_PROJECT_PASS=NOT_CLAIMED`);

  if (!valid) process.exit(1);
}

main().catch(err => {
  console.error('INDEX_LOOKUP_FATAL=TRUE');
  console.error(err);
  process.exit(1);
});
