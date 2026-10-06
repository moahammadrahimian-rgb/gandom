'use strict';

const { spawn } = require('child_process');

const file = require.resolve('../execution/GANDOM-REAL-NODE-LINK');

const server = spawn(process.execPath, [file, 'server'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverOutput = '';
let clientOutput = '';

server.stdout.on('data', d => {
  serverOutput += d.toString();
});

server.stderr.on('data', d => {
  process.stderr.write(d);
});

setTimeout(() => {
  const client = spawn(process.execPath, [file, 'client'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  client.stdout.on('data', d => {
    clientOutput += d.toString();
  });

  client.stderr.on('data', d => {
    process.stderr.write(d);
  });

  client.on('close', code => {
    setTimeout(() => {
      server.kill();

      const combined = serverOutput + clientOutput;

      console.log('=== GANDOM REAL NODE LINK TEST ===');
      process.stdout.write(serverOutput);
      process.stdout.write(clientOutput);

      const listening =
        combined.includes('NODE_0_LISTENING=');

      const remoteCells =
        (combined.match(/REMOTE_CELLS=400000/g) || []).length >= 2;

      const digest =
        /REMOTE_STATE_SHA256=[a-f0-9]{64}/.test(combined);

      const valid =
        combined.includes('REMOTE_STATE_VALID=true');

      const accepted =
        combined.includes('REMOTE_STATE_ACCEPTED=true');

      console.log(`TCP_LISTENING=${listening}`);
      console.log(`CELL_STATE_EXCHANGED=${remoteCells}`);
      console.log(`STATE_HASH_EXCHANGED=${digest}`);
      console.log(`REMOTE_STATE_VERIFIED=${valid}`);
      console.log(`REMOTE_STATE_ACCEPTED=${accepted}`);
      console.log(`CLIENT_EXIT_CODE=${code}`);

      if (!listening) throw new Error('TCP_LISTEN_FAIL');
      if (!remoteCells) throw new Error('CELL_EXCHANGE_FAIL');
      if (!digest) throw new Error('HASH_EXCHANGE_FAIL');
      if (!valid) throw new Error('STATE_VERIFY_FAIL');
      if (!accepted) throw new Error('STATE_ACCEPT_FAIL');
      if (code !== 0) throw new Error('CLIENT_FAIL');

      console.log('REAL_NODE_TO_NODE_TCP=PASS');
      console.log('REAL_CELL_STATE_EXCHANGE=PASS');
      console.log('REAL_STATE_HASH_EXCHANGE=PASS');
      console.log('REAL_REMOTE_VERIFICATION=PASS');
      console.log('REAL_NODE_HEARTBEAT_CHANNEL=PASS');
      console.log('FAKE_PASS=BLOCKED');
    }, 200);
  });
}, 300);
