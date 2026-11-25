const assert = require('assert');

const Link = 'http://localhost:5000';

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(Link);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Server is not online');
}

async function main() {
  try {
    await waitForServer();
    const res = await fetch(`${Link}/`);
    assert.ok(res.status > 0);
    console.log('PASS: server is online');
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  }
}

main();