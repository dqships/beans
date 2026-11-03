import "server-only";
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Test-only sign-in for local end-to-end runs. Every export refuses to work
 * in a production build (`next build` sets NODE_ENV to production, so this
 * check is fixed at build time) and unless BEANS_TEST_AUTH=1 is set.
 */
export function testAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.BEANS_TEST_AUTH === "1" && Boolean(process.env.BEANS_TEST_AUTH_ISSUER);
}

const KEY_DIR = join(process.cwd(), ".beans-test-auth");
const KEY_FILE = join(KEY_DIR, "private.pem");
const KID = "beans-test-1";

function privateKey(): KeyObject {
  if (!existsSync(KEY_FILE)) {
    mkdirSync(KEY_DIR, { recursive: true });
    const { privateKey: key } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    writeFileSync(KEY_FILE, key.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  }
  return createPrivateKey(readFileSync(KEY_FILE));
}

export function jwks() {
  const jwk = createPublicKey(privateKey()).export({ format: "jwk" });
  return { keys: [{ ...jwk, kid: KID, use: "sig", alg: "RS256" }] };
}

const b64url = (data: Buffer | string) => Buffer.from(data).toString("base64url");

/** A short-lived RS256 token for a made-up test user. */
export function issueToken(user: string): string {
  const now = Math.floor(Date.now() / 1000);
  const slug = user.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tester";
  const header = { alg: "RS256", typ: "JWT", kid: KID };
  const payload = {
    iss: process.env.BEANS_TEST_AUTH_ISSUER,
    aud: "beans-test",
    sub: slug,
    name: user,
    email: `${slug}@example.test`,
    iat: now,
    exp: now + 60 * 60,
  };
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  return `${body}.${b64url(sign("RSA-SHA256", Buffer.from(body), privateKey()))}`;
}

/** The test user and issue time of a token from `issueToken`, or null. Only in test runs. */
export function verifyTestToken(token: string): { sub: string; iat: number } | null {
  if (!testAuthEnabled()) return null;
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  const ok = verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), createPublicKey(privateKey()), Buffer.from(signature, "base64url"));
  if (!ok) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as { iss?: string; sub?: string; iat?: number; exp?: number };
  if (claims.iss !== process.env.BEANS_TEST_AUTH_ISSUER || !claims.sub || !claims.iat || !claims.exp || claims.exp * 1000 < Date.now()) return null;
  return { sub: claims.sub, iat: claims.iat };
}
