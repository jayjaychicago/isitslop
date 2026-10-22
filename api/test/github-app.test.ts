import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { appJwt, pemToPkcs8 } from '../src/lib/github-app.ts';

test('a PKCS#1 app key (what GitHub downloads) signs a JWT that the public key verifies', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs1', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  assert.match(privateKey, /BEGIN RSA PRIVATE KEY/);
  const jwt = await appJwt('5419816', privateKey, 1_700_000_000);
  const [h, p, s] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(p, 'base64url').toString()), { iat: 1_700_000_000 - 60, exp: 1_700_000_000 + 540, iss: '5419816' });
  const v = createVerify('RSA-SHA256');
  v.update(`${h}.${p}`);
  assert.ok(v.verify(publicKey, Buffer.from(s, 'base64url')));
});

test('a PKCS#8 key passes through untouched', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const der = pemToPkcs8(privateKey);
  assert.equal(der[0], 0x30);
  assert.equal(Buffer.from(der).toString('base64'), privateKey.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, ''));
});
