'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(process.cwd());
const EVIDENCE = path.join(ROOT, 'gandom-core', 'evidence');

const OUT = path.join(
  ROOT,
  'runtime-logs',
  `STREAMING-EVENT-SEARCH-2558-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
);

const TARGET = /^ALL-CELL-HISTORY-.*\.txt$/i;

const PATTERNS = {
  birth: /birth/i,
  death: /death/i,
  division: /divide|division/i,
  generation: /generation/i,
  mutation: /mutation/i,
  metabolism: /metabol/i,
  energy: /energy/i,
  cell: /\bcell\b/i,
  neuron: /neuron/i,
  organism: /organism/i,
  species: /species/i,
  breath: /breath|respirat/i,
  heartbeat: /heartbeat|heart.?beat/i,
  vital: /vital/i,
  p2p: /\bp2p\b|peer|message/i
};

const MAX_LINE_BYTES = 1024 * 1024;

async function searchFile(file, output) {
  const counts = {};

  for (const key of Object.keys(PATTERNS)) {
    counts[key] = 0;
  }

  let lines = 0;
  let bytesApprox = 0;
  let oversizedLines = 0;

  const input = fs.createReadStream(file, {
    highWaterMark: 64 * 1024
  });

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    lines++;
    bytesApprox += Buffer.byteLength(line) + 1;

    if (Buffer.byteLength(line) > MAX_LINE_BYTES) {
      oversizedLines++;
      continue;
    }

    for (const [key, regex] of Object.entries(PATTERNS)) {
      if (regex.test(line)) {
        counts[key]++;
      }
    }
  }

  const record = {
    law: 2558,
    type: 'STREAMING_EVENT_SEARCH',
    file: path.relative(ROOT, file),
    lines,
    bytesApprox,
    counts,
    oversizedLines,
    deleteEnabled: false,
    historyMutation: false,
    searchedAt: new Date().toISOString()
  };

  output.write(JSON.stringify(record) + '\n');

  console.log(`FILE=${record.file}`);
  console.log(`LINES=${lines}`);
  console.log(`BYTES_APPROX=${bytesApprox}`);

  for (const key of Object.keys(PATTERNS)) {
    console.log(`${key.toUpperCase()}=${counts[key]}`);
  }

  console.log(`OVERSIZED_LINES=${oversizedLines}`);
  console.log('');
}

async function main() {
  console.log('LAW=2558');
  console.log('MODE=STREAMING_EVENT_SEARCH');
  console.log('CONCURRENCY=1');
  console.log('DELETE_ENABLED=FALSE');
  console.log('HISTORY_MUTATION=FALSE');
  console.log('LARGE_HISTORY_READ=FALSE');

  const output = fs.createWriteStream(OUT, {
    flags: 'wx',
    encoding: 'utf8'
  });

  let files = 0;
  let totalLines = 0;
  let totalBytes = 0;
  let errors = 0;

  try {
    const entries = await fsp.readdir(EVIDENCE, {
      withFileTypes: true
    });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!TARGET.test(entry.name)) continue;

      try {
        const file = path.join(EVIDENCE, entry.name);

        const before = process.memoryUsage().rss;

        await searchFile(file, output);

        const after = process.memoryUsage().rss;

        console.log(
          `RSS_BEFORE_MB=${(before / 1024 / 1024).toFixed(2)}`
        );
        console.log(
          `RSS_AFTER_MB=${(after / 1024 / 1024).toFixed(2)}`
        );

        files++;
      } catch (err) {
        errors++;
        console.error(
          `SEARCH_ERROR=${entry.name}`
        );
        console.error(
          String(err.message || err)
        );
      }
    }
  } finally {
    await new Promise(resolve => output.end(resolve));
  }

  /*
   * Read only our tiny JSONL result file, never the giant history files.
   */
  const resultText = await fsp.readFile(OUT, 'utf8');

  for (const line of resultText.split('\n')) {
    if (!line.trim()) continue;

    const r = JSON.parse(line);

    totalLines += r.lines;
    totalBytes += r.bytesApprox;
  }

  const rss = process.memoryUsage().rss;

  console.log('===== STREAMING EVENT SEARCH SUMMARY =====');
  console.log(`FILES_SCANNED=${files}`);
  console.log(`LINES_SCANNED=${totalLines}`);
  console.log(`BYTES_SCANNED_APPROX=${totalBytes}`);
  console.log(`ERRORS=${errors}`);
  console.log(`RESULT_FILE=${path.relative(ROOT, OUT)}`);
  console.log(`DELETE_ENABLED=FALSE`);
  console.log(`HISTORY_MUTATION=FALSE`);
  console.log(`FILES_DELETED=0`);
  console.log(`RSS_MB=${(rss / 1024 / 1024).toFixed(2)}`);
  console.log(`FINAL_PROJECT_PASS=NOT_CLAIMED`);
  console.log(`NEXT=INDEPENDENT_STREAMING_EVENT_VERIFICATION`);

  if (errors > 0) {
    process.exitCode = 2;
  }
}

main().catch(err => {
  console.error('STREAMING_EVENT_SEARCH_FATAL=TRUE');
  console.error(err);
  process.exitCode = 1;
});
