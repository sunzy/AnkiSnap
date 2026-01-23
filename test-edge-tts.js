
const { WebSocket } = require('ws');
const crypto = require('crypto');

const token = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

const getSecMsGec = () => {
  const ticks = BigInt(Date.now()) * 10000n + 116444736000000000n;
  const roundedTicks = ticks - (ticks % 3000000000n);
  const strToHash = roundedTicks.toString() + token;
  return crypto.createHash('sha256').update(strToHash).digest('hex').toUpperCase();
};

const connectionId = crypto.randomUUID().replace(/-/g, '');
const webSocketURL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${token}&ConnectionId=${connectionId}`;

console.log(`Connecting to ${webSocketURL}...`);
const secMsGec = getSecMsGec();
console.log(`Using Sec-MS-GEC: ${secMsGec}`);

const ws = new WebSocket(webSocketURL, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

ws.on('open', () => {
  console.log('Connected!');
  ws.close();
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout');
  process.exit(1);
}, 5000);
