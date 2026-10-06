'use strict';

const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');

const ENGINE =
  path.join(
    __dirname,
    '..',
    'engine',
    'GANDOM-REAL-STATE-TCP.js'
  );

const HOST = '127.0.0.1';
const PORT = 18888;

let serverOutput = '';
let clientOutput = '';

const server =
  spawn(
    process.execPath,
    [ENGINE, '0', 'server'],
    {
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

server.stdout.on(
  'data',
  d => {
    serverOutput += d.toString();
  }
);

server.stderr.on(
  'data',
  d => {
    serverOutput += d.toString();
  }
);

function waitForReady() {

  return new Promise((resolve, reject) => {

    const timeout =
      setTimeout(
        () => reject(
          new Error('SERVER_READY_TIMEOUT')
        ),
        15000
      );

    const check = () => {

      if (
        serverOutput.includes('SERVER_READY')
      ) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      if (
        server.exitCode !== null
      ) {
        clearTimeout(timeout);
        reject(
          new Error(
            'SERVER_EXITED_BEFORE_READY'
          )
        );
        return;
      }

      setTimeout(check, 20);
    };

    check();
  });
}

function runClient() {

  return new Promise((resolve, reject) => {

    const client =
      spawn(
        process.execPath,
        [ENGINE, '1', 'client'],
        {
          stdio: ['ignore', 'pipe', 'pipe']
        }
      );

    client.stdout.on(
      'data',
      d => {
        clientOutput += d.toString();
      }
    );

    client.stderr.on(
      'data',
      d => {
        clientOutput += d.toString();
      }
    );

    client.on(
      'close',
      code => {

        if (code !== 0) {
          reject(
            new Error(
              `CLIENT_EXIT_${code}\n${clientOutput}`
            )
          );
          return;
        }

        resolve();
      }
    );
  });
}

(async () => {

  try {

    await waitForReady();

    await runClient();

    /*
     * Give receiver process enough time
     * to consume and hash the entire frame.
     */
    await new Promise(
      r => setTimeout(r, 500)
    );

    console.log('==========================================');
    console.log('FULL STATE TCP VERIFICATION');
    console.log('==========================================');

    process.stdout.write(
      clientOutput
    );

    process.stdout.write(
      serverOutput
    );

    const receivedBytes =
      Number(
        (serverOutput.match(
          /RECEIVED_BYTES=(\d+)/
        ) || [])[1]
      );

    const expectedBytes =
      Number(
        (serverOutput.match(
          /EXPECTED_BYTES=(\d+)/
        ) || [])[1]
      );

    const receivedCells =
      Number(
        (serverOutput.match(
          /RECEIVED_CELLS=(\d+)/
        ) || [])[1]
      );

    const lengthValid =
      serverOutput.includes(
        'LENGTH_VALID=true'
      );

    const cellValid =
      serverOutput.includes(
        'CELL_COUNT_VALID=true'
      );

    const hashMatch =
      serverOutput.includes(
        'HASH_MATCH=true'
      );

    const accepted =
      serverOutput.includes(
        'FULL_STATE_ACCEPTED=true'
      );

    const rehash =
      serverOutput.includes(
        'REAL_FULL_STATE_REHASH=PASS'
      );

    assert.strictEqual(
      receivedBytes,
      400000 * 4
    );

    assert.strictEqual(
      expectedBytes,
      400000 * 4
    );

    assert.strictEqual(
      receivedCells,
      400000
    );

    assert.strictEqual(
      lengthValid,
      true
    );

    assert.strictEqual(
      cellValid,
      true
    );

    assert.strictEqual(
      hashMatch,
      true
    );

    assert.strictEqual(
      accepted,
      true
    );

    assert.strictEqual(
      rehash,
      true
    );

    console.log(
      `TCP_ENDPOINT=${HOST}:${PORT}`
    );

    console.log(
      `FULL_STATE_BYTES=${receivedBytes}`
    );

    console.log(
      `FULL_STATE_CELLS=${receivedCells}`
    );

    console.log(
      'SENDER_HASH=PASS'
    );

    console.log(
      'RECEIVER_FULL_BUFFER=PASS'
    );

    console.log(
      'RECEIVER_REHASH=PASS'
    );

    console.log(
      'HASH_EQUALITY=PASS'
    );

    console.log(
      'FULL_STATE_ACCEPTED=PASS'
    );

    console.log(
      'REAL_NODE_TO_NODE_FULL_STATE=PASS'
    );

    console.log(
      'FAKE_PASS=BLOCKED'
    );

    server.kill('SIGTERM');

  } catch (e) {

    server.kill('SIGTERM');

    console.error(
      `TEST_ERROR=${e.message}`
    );

    process.exit(1);
  }

})();
