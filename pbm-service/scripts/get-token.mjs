#!/usr/bin/env node
// One-shot Authorization Code + PKCE flow against the take-home Auth0 tenant.
// Purpose: obtain a REAL access token + ID token to inspect their format
// (alg, aud, iss, sub) — the password grant is disabled on this client, so a
// browser flow is the only way to mint tokens.
//
// This script DECODES tokens for inspection only. It never verifies them and
// is never imported by application code — verification belongs to the auth
// guard (CLAUDE.md: never jwt.decode in place of jwt.verify).
//
// Usage: node scripts/get-token.mjs
// Requires port 3000 free (stop the Nest dev server first) — the Auth0 app's
// allowed callback is fixed at http://localhost:3000/callback.

import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';

const ISSUER = 'https://dev-yg.us.auth0.com';
const CLIENT_ID = 'H9F6QG5SzTKMv0tbmgxLj9LjG1EKVllA';
const REDIRECT_URI = 'http://localhost:3000/callback';
const AUDIENCE = 'https://bbl-candidate-test-api';
const SCOPE = 'openid profile email';

const b64url = (buf) => buf.toString('base64url');
const verifier = b64url(randomBytes(32));
const challenge = b64url(createHash('sha256').update(verifier).digest());
const state = b64url(randomBytes(16));

const authorizeUrl = new URL(`${ISSUER}/authorize`);
authorizeUrl.search = new URLSearchParams({
  response_type: 'code',
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: SCOPE,
  audience: AUDIENCE,
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
}).toString();

function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

function printToken(label, token) {
  const parts = token.split('.');
  console.log(`\n=== ${label} ===`);
  if (parts.length !== 3) {
    console.log(`Not a JWS (${parts.length} segments) — opaque or JWE token.`);
    console.log(`Raw (first 40 chars): ${token.slice(0, 40)}…`);
    return;
  }
  console.log('header :', JSON.stringify(decodeJwtPart(parts[0]), null, 2));
  console.log('payload:', JSON.stringify(decodeJwtPart(parts[1]), null, 2));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }
  const err = url.searchParams.get('error');
  if (err) {
    res.writeHead(400, { 'content-type': 'text/plain' });
    res.end(`Auth0 returned an error: ${err}`);
    console.error(`\nAuth0 error: ${err} — ${url.searchParams.get('error_description')}`);
    server.close();
    process.exitCode = 1;
    return;
  }
  if (url.searchParams.get('state') !== state) {
    res.writeHead(400).end('state mismatch');
    console.error('\nstate mismatch — aborting.');
    server.close();
    process.exitCode = 1;
    return;
  }

  const tokenRes = await fetch(`${ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code: url.searchParams.get('code'),
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  const body = await tokenRes.json();

  if (!tokenRes.ok) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Token exchange failed — see terminal.');
    console.error('\nToken exchange failed:', JSON.stringify(body, null, 2));
  } else {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Tokens received — you can close this tab. Output is in the terminal.');
    console.log('\ntoken_type :', body.token_type);
    console.log('expires_in :', body.expires_in);
    console.log('scope      :', body.scope);
    printToken('ACCESS TOKEN (decoded, NOT verified)', body.access_token);
    if (body.id_token) printToken('ID TOKEN (decoded, NOT verified)', body.id_token);
    console.log('\n--- raw access token (for curl testing) ---\n');
    console.log(body.access_token);
  }
  server.close();
});

server.listen(3000, () => {
  console.log('Waiting for Auth0 callback on http://localhost:3000/callback …');
  console.log('If the browser does not open, visit:\n\n' + authorizeUrl.href + '\n');
  execFile('open', [authorizeUrl.href], (e) => {
    if (e) console.error('(could not auto-open browser)');
  });
});
