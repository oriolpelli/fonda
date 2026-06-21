import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * Symmetric encryption for secrets at rest (e.g. PMS API tokens stored in the
 * `hotels` table). AES-256-GCM — authenticated encryption, so tampering with
 * the ciphertext is detected on decrypt.
 *
 * The key comes from `MEWS_TOKEN_ENCRYPTION_KEY` and must be 32 bytes, supplied
 * as base64 or hex. Generate one with:  `openssl rand -base64 32`
 *
 * Stored format:  v1:<base64(iv | authTag | ciphertext)>
 */

const SCHEME = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, recommended for GCM
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.MEWS_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "MEWS_TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32`."
    );
  }

  // Accept either hex (64 chars) or base64.
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error(
      `MEWS_TOKEN_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Use \`openssl rand -base64 32\`.`
    );
  }

  cachedKey = key;
  return key;
}

/** Encrypts a UTF-8 string. Returns the versioned, base64-packed ciphertext. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${SCHEME}:${Buffer.concat([iv, authTag, ciphertext]).toString("base64")}`;
}

/** Reverses {@link encryptSecret}. Throws if the payload is malformed or tampered with. */
export function decryptSecret(payload: string): string {
  const [scheme, packed] = payload.split(":", 2);
  if (scheme !== SCHEME || !packed) {
    throw new Error("Unrecognized encrypted payload format.");
  }

  const buffer = Buffer.from(packed, "base64");
  const iv = buffer.subarray(0, IV_BYTES);
  const authTag = buffer.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = buffer.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
