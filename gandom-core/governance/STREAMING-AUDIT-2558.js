'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { StringDecoder } = require('string_decoder');

const ROOT = path.resolve(process.cwd());
const TARGET_ROOT = path.join(ROOT, 'gandom-core');
const REPORT_DIR = path.join(ROOT, 'runtime-logs');

const REPORT = path.join(
  REPORT_DIR,
  `STREAMING-AUDIT-2558-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
);

const DELETE_ENABLED = false;
const MAX_LINE_BYTES = 1024 * 1024;
const HIGH_WATER_MARK = 64 * 1024;

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'backups',
  'runtime-logs'
]);

let files = 0;
let bytes = 0;
let lines = 0;
let historyFiles = 0;
let matchingLines = 0;
let errors = 0;
let peakRSS = process.memoryUsage().rss;

function memorySample() {
  const rss = process.memoryUsage().rss;
  if (rss > peakRSS) peakRSS = rss;
}

async function* walk(dir) {
  let entries;

  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (err) {
    errors++;
    console.error(`WALK_ERROR=${dir}`);
    console.error(String(err.message || err));
    return;
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function isHistoryFile(file) {
  return /^ALL-CELL-HISTORY-.*\.txt$/i.test(path.basename(file));
}

function safeRelative(file) {
  return path.relative(ROOT, file);
}

async function auditFile(file, reportStream) {
  const hash = crypto.createHash('sha256');
  const decoder = new StringDecoder('utf8');

  let fileBytes = 0;
  let fileLines = 0;
  let fileMatches = 0;
  let lineBuffer = '';
  let lineBytes = 0;
  let oversizedLine = false;

  const input = fs.createReadStream(file, {
    highWaterMark: HIGH_WATER_MARK
  });

  try {
    for await (const chunk of input) {
      hash.update(chunk);
      fileBytes += chunk.length;
      bytes += chunk.length;

      const text = decoder.write(chunk);

      for (const ch of text) {
        lineBuffer += ch;
        lineBytes++;

        if (lineBytes > MAX_LINE_BYTES) {
          oversizedLine = true;
          lineBuffer = '';
          lineBytes = 0;
        }

        if (ch === '\n') {
          fileLines++;
          lines++;

          if (!oversizedLine) {
            if (
              /birth|death|divide|generation|mutation|metabol|energy|cell|neuron|organism|species|breath|heartbeat|vital/i
                .test(lineBuffer)
            ) {
              fileMatches++;
              matchingLines++;
            }
          }

          lineBuffer = '';
          lineBytes = 0;
          oversizedLine = false;
        }
      }

      memorySample();
    }

    const tail = decoder.end();

    if (tail.length > 0) {
      lineBuffer += tail;
    }

    if (lineBuffer.length > 0) {
      fileLines++;
      lines++;

      if (
        !oversizedLine &&
        /birth|death|divide|generation|mutation|metabol|energy|cell|neuron|organism|species|breath|heartbeat|vital/i
          .test(lineBuffer)
      ) {
        fileMatches++;
        matchingLines++;
      }
    }

    const digest = hash.digest('hex');

    const record = {
      law: 2558,
      mode: 'STREAMING',
      deleteEnabled: DELETE_ENABLED,
      file: safeRelative(file),
      sizeBytes: fileBytes,
      lines: fileLines,
      matchingLines: fileMatches,
      sha256: digest,
      auditedAt: new Date().toISOString(),
      memoryRssBytes: process.memoryUsage().rss
    };

    reportStream.write(JSON.stringify(record) + '\n');

    files++;
    historyFiles++;

    console.log(
      `AUDITED=${safeRelative(file)} SIZE=${fileBytes} LINES=${fileLines} SHA256=${digest}`
    );

  } catch (err) {
    errors++;

    const record = {
      law: 2558,
      mode: 'STREAMING',
      deleteEnabled: DELETE_ENABLED,
      file: safeRelative(file),
      error: String(err.message || err),
      auditedAt: new Date().toISOString()
    };

    reportStream.write(JSON.stringify(record) + '\n');

    console.error(`AUDIT_ERROR=${safeRelative(file)}`);
    console.error(String(err.message || err));
  }
}

async function main() {
  console.log('LAW=2558');
  console.log('NO_FAKE_PASS=1');
  console.log('DELETE_ENABLED=FALSE');
  console.log('CONCURRENCY=1');
  console.log(`TARGET=${TARGET_ROOT}`);
  console.log(`REPORT=${safeRelative(REPORT)}`);
  console.log(`HIGH_WATER_MARK=${HIGH_WATER_MARK}`);
  console.log(`MAX_LINE_BYTES=${MAX_LINE_BYTES}`);

  await fsp.mkdir(REPORT_DIR, { recursive: true });

  const reportStream = fs.createWriteStream(REPORT, {
    flags: 'wx',
    encoding: 'utf8'
  });

  try {
    for await (const file of walk(TARGET_ROOT)) {
      if (!isHistoryFile(file)) continue;
      await auditFile(file, reportStream);
      memorySample();
    }
  } finally {
    await new Promise(resolve => reportStream.end(resolve));
  }

  const finalRSS = process.memoryUsage().rss;
  if (finalRSS > peakRSS) peakRSS = finalRSS;

  const summary = {
    law: 2558,
    noFakePass: true,
    mode: 'STREAMING',
    deleteEnabled: DELETE_ENABLED,
    filesAudited: historyFiles,
    bytesAudited: bytes,
    linesAudited: lines,
    matchingLines: matchingLines,
    errors: errors,
    peakRssBytes: peakRSS,
    peakRssMB: Number((peakRSS / 1024 / 1024).toFixed(2)),
    report: safeRelative(REPORT),
    filesDeleted: 0,
    finalProjectPass: 'NOT_CLAIMED',
    next: 'INDEPENDENT_STREAMING_AUDIT_VERIFICATION'
  };

  console.log('');
  console.log('===== STREAMING AUDIT SUMMARY =====');
  console.log(`LAW=${summary.law}`);
  console.log(`DELETE_ENABLED=${summary.deleteEnabled}`);
  console.log(`FILES_AUDITED=${summary.filesAudited}`);
  console.log(`BYTES_AUDITED=${summary.bytesAudited}`);
  console.log(`LINES_AUDITED=${summary.linesAudited}`);
  console.log(`MATCHING_LINES=${summary.matchingLines}`);
  console.log(`ERRORS=${summary.errors}`);
  console.log(`PEAK_RSS_MB=${summary.peakRssMB}`);
  console.log(`FILES_DELETED=${summary.filesDeleted}`);
  console.log(`REPORT=${summary.report}`);
  console.log(`FINAL_PROJECT_PASS=${summary.finalProjectPass}`);
  console.log(`NEXT=${summary.next}`);

  if (errors > 0) process.exitCode = 2;
}

main().catch(err => {
  console.error('STREAMING_AUDIT_FATAL=TRUE');
  console.error(err);
  process.exitCode = 1;
});
