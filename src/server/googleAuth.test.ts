import test from "node:test";
import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type JsonWebKey } from "node:crypto";
import { verifyGoogleIdToken, type Jwk } from "./googleAuth.js";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "test-kid";
const AUDIENCE = "test-client-id.apps.googleusercontent.com";

const jwk: Jwk = { ...(publicKey.export({ format: "jwk" }) as JsonWebKey), kid: KID };

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signToken(overrides: {
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  tamperSignature?: boolean;
}): string {
  const header = {
    alg: "RS256",
    kid: KID,
    typ: "JWT",
    ...overrides.header,
  };
  const payload = {
    aud: AUDIENCE,
    iss: "https://accounts.google.com",
    sub: "1234567890",
    email: "user@example.com",
    name: "Test User",
    picture: "https://example.com/avatar.png",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides.payload,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signedData = `${headerB64}.${payloadB64}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signedData);
  signer.end();
  let signatureB64 = base64UrlEncode(signer.sign(privateKey));
  if (overrides.tamperSignature) {
    signatureB64 = signatureB64.slice(0, -4) + (signatureB64.slice(-4) === "AAAA" ? "BBBB" : "AAAA");
  }

  return `${signedData}.${signatureB64}`;
}

async function fakeJwks(): Promise<Jwk[]> {
  return [jwk];
}

test("a validly signed token with correct audience/issuer resolves with the user's claims", async () => {
  const token = signToken({});
  const user = await verifyGoogleIdToken(token, AUDIENCE, fakeJwks);
  assert.deepEqual(user, {
    sub: "1234567890",
    email: "user@example.com",
    name: "Test User",
    picture: "https://example.com/avatar.png",
  });
});

test("rejects a token with the wrong audience", async () => {
  const token = signToken({ payload: { aud: "someone-else.apps.googleusercontent.com" } });
  await assert.rejects(() => verifyGoogleIdToken(token, AUDIENCE, fakeJwks));
});

test("rejects a token with the wrong issuer", async () => {
  const token = signToken({ payload: { iss: "https://not-google.example.com" } });
  await assert.rejects(() => verifyGoogleIdToken(token, AUDIENCE, fakeJwks));
});

test("rejects an expired token", async () => {
  const token = signToken({ payload: { exp: Math.floor(Date.now() / 1000) - 60 } });
  await assert.rejects(() => verifyGoogleIdToken(token, AUDIENCE, fakeJwks));
});

test("rejects a token with a tampered signature", async () => {
  const token = signToken({ tamperSignature: true });
  await assert.rejects(() => verifyGoogleIdToken(token, AUDIENCE, fakeJwks));
});

test("rejects a token whose kid doesn't match any known JWK", async () => {
  const token = signToken({ header: { kid: "unknown-kid" } });
  await assert.rejects(() => verifyGoogleIdToken(token, AUDIENCE, fakeJwks));
});

test("rejects a token that doesn't declare RS256", async () => {
  const token = signToken({ header: { alg: "none" } });
  await assert.rejects(() => verifyGoogleIdToken(token, AUDIENCE, fakeJwks));
});

test("rejects a malformed token (not three dot-separated parts)", async () => {
  await assert.rejects(() => verifyGoogleIdToken("not-a-jwt", AUDIENCE, fakeJwks));
});
