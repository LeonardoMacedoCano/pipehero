import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

export interface Jwk extends JsonWebKey {
  kid: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;

async function fetchGoogleJwks(): Promise<Jwk[]> {
  const response = await fetch(GOOGLE_JWKS_URL);
  if (!response.ok) throw new Error(`Failed to fetch Google JWKS: HTTP ${response.status}`);
  const data = (await response.json()) as { keys: Jwk[] };
  return data.keys;
}

async function getCachedGoogleJwks(): Promise<Jwk[]> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) return jwksCache.keys;
  const keys = await fetchGoogleJwks();
  jwksCache = { keys, fetchedAt: now };
  return keys;
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function verifyGoogleIdToken(
  idToken: string,
  expectedAudience: string,
  getJwks: () => Promise<Jwk[]> = getCachedGoogleJwks
): Promise<GoogleUserInfo> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed id_token");
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(base64UrlDecode(headerB64).toString("utf8")) as { alg: string; kid: string };
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as Record<string, unknown>;

  if (header.alg !== "RS256") throw new Error(`Unsupported alg: ${header.alg}`);

  const keys = await getJwks();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("No matching JWK for kid");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const signedData = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);
  if (!verify("RSA-SHA256", signedData, publicKey, signature)) {
    throw new Error("Invalid signature");
  }

  if (typeof payload.aud !== "string" || payload.aud !== expectedAudience) {
    throw new Error("Invalid audience");
  }
  if (typeof payload.iss !== "string" || !GOOGLE_ISSUERS.includes(payload.iss)) {
    throw new Error("Invalid issuer");
  }
  const exp = typeof payload.exp === "number" ? payload.exp : 0;
  if (exp * 1000 < Date.now()) {
    throw new Error("Token expired");
  }
  if (typeof payload.sub !== "string") throw new Error("Missing sub claim");

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : "",
    name: typeof payload.name === "string" ? payload.name : "",
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
