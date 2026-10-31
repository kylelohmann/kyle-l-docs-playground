// Minimal webhook receiver that verifies the Arccos-Signature header.
// Usage: WEBHOOK_SECRET=whsec_... node examples/webhook-receiver.js
import crypto from 'node:crypto';
import http from 'node:http';

const SECRET = process.env.WEBHOOK_SECRET;
const TOLERANCE_SECONDS = 300;

function verify(rawBody, header) {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  const age = Math.abs(Date.now() / 1000 - Number(parts.t));
  if (!parts.t || !parts.v1 || age > TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(`${parts.t}.${rawBody}`).digest('hex');
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    if (!verify(raw, req.headers['arccos-signature'] ?? '')) {
      res.writeHead(400).end('invalid signature');
      return;
    }
    const event = JSON.parse(raw);
    console.log(`Received ${event.type} for ${event.data.player_id}: shot ${event.data.score} (${event.data.to_par >= 0 ? '+' : ''}${event.data.to_par})`);
    res.writeHead(200).end();
  });
}).listen(4001, () => console.log('Listening for webhooks on http://localhost:4001/webhooks'));
