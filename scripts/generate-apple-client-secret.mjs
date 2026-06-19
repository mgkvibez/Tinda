import fs from 'fs';
import process from 'process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import crypto from 'crypto';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlJSON(obj) {
  return base64url(JSON.stringify(obj));
}

function derToJoseSignature(der) {
  // DER format: SEQUENCE { INTEGER r, INTEGER s }
  // Parse to extract r and s and convert to 32-byte padded buffers
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error('Invalid DER signature');
  const seqLen = der[offset++];
  if (der[offset++] !== 0x02) throw new Error('Invalid DER signature (no integer r)');
  let rLen = der[offset++];
  let r = der.slice(offset, offset + rLen);
  offset += rLen;
  if (der[offset++] !== 0x02) throw new Error('Invalid DER signature (no integer s)');
  let sLen = der[offset++];
  let s = der.slice(offset, offset + sLen);

  // Remove leading zeros
  if (r[0] === 0x00) r = r.slice(1);
  if (s[0] === 0x00) s = s.slice(1);

  const rPad = Buffer.concat([Buffer.alloc(32 - r.length, 0), r]);
  const sPad = Buffer.concat([Buffer.alloc(32 - s.length, 0), s]);
  return Buffer.concat([rPad, sPad]);
}

function signES256(privateKeyPem, data) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  const der = sign.sign(privateKeyPem);
  const raw = derToJoseSignature(der);
  return raw;
}

function generate({ keyFile, teamId, clientId, keyId, expiresInSec = 15777000 }) {
  // expiresInSec defaults to ~6 months (Apple allows up to 6 months)
  const pkcs8 = fs.readFileSync(keyFile, 'utf8');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + expiresInSec,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  const encoded = `${base64urlJSON(header)}.${base64urlJSON(payload)}`;
  const sigRaw = signES256(pkcs8, encoded);
  const signature = base64url(sigRaw);
  return `${encoded}.${signature}`;
}

function usage() {
  console.log('Usage: node scripts/generate-apple-client-secret.mjs --key-file ./AuthKey.p8 --team-id TEAMID --client-id CLIENTID --key-id KEYID [--expires-seconds 15777000]');
}

async function main() {
  const argv = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === '--key-file') args.keyFile = argv[++i];
    else if (k === '--team-id') args.teamId = argv[++i];
    else if (k === '--client-id') args.clientId = argv[++i];
    else if (k === '--key-id') args.keyId = argv[++i];
    else if (k === '--expires-seconds') args.expiresInSec = Number(argv[++i]);
    else if (k === '--write-env') args.writeEnv = true;
  }

  if (!args.keyFile || !args.teamId || !args.clientId || !args.keyId) {
    usage();
    process.exit(2);
  }

  try {
    const jwt = await generate(args);
    if (args.writeEnv) {
      // write or replace APPLE_CLIENT_SECRET in .env
      const envPath = './.env';
      let env = '';
      try {
        env = fs.readFileSync(envPath, 'utf8');
      } catch (e) {
        env = '';
      }

      const keyLine = `APPLE_CLIENT_SECRET="${jwt}"`;
      const regex = /^APPLE_CLIENT_SECRET=.*$/m;
      if (regex.test(env)) {
        env = env.replace(regex, keyLine);
      } else {
        if (env.length && !env.endsWith('\n')) env += '\n';
        env += keyLine + '\n';
      }
      fs.writeFileSync(envPath, env, 'utf8');
      console.log('Wrote APPLE_CLIENT_SECRET to .env');
    } else {
      console.log(jwt);
    }
  } catch (err) {
    console.error('Failed to generate client secret:', err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('generate-apple-client-secret.mjs')) {
  main();
}
