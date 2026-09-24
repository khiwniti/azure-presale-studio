/**
 * AES-256-GCM encrypt/decrypt for NIM API keys stored in the database.
 *
 * Envelope format (all hex, colon-separated):
 *   "<12-byte iv>:<16-byte authTag>:<N-byte ciphertext>"
 *
 * The key is taken from NIM_ENCRYPTION_KEY env var (32 bytes / 64 hex chars).
 * We use Node.js built-in `crypto` — no third-party deps.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES = 12; // 96-bit IV recommended for GCM
const TAG_BYTES = 16;

/**
 * Derive a 32-byte key Buffer from the hex env string.
 * Called lazily so unit tests can override NIM_ENCRYPTION_KEY before import.
 */
function getKey(): Buffer {
  const hex = process.env["NIM_ENCRYPTION_KEY"];
  if (!hex || hex.length !== 64) {
    throw new Error(
      "[crypto] NIM_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
        "Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns envelope string: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptNimKey(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(
    ":"
  );
}

/**
 * Decrypt an envelope string produced by `encryptNimKey`.
 * Throws if the envelope is malformed or authentication fails (tampered data).
 */
export function decryptNimKey(envelope: string): string {
  const parts = envelope.split(":");
  if (parts.length !== 3) {
    throw new Error("[crypto] Invalid NIM key envelope: expected iv:tag:ciphertext");
  }
  const [ivHex, tagHex, ciphertextHex] = parts as [string, string, string];

  if (ivHex.length !== IV_BYTES * 2) {
    throw new Error(`[crypto] IV must be ${IV_BYTES * 2} hex chars`);
  }
  if (tagHex.length !== TAG_BYTES * 2) {
    throw new Error(`[crypto] Auth tag must be ${TAG_BYTES * 2} hex chars`);
  }

  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Round-trip helper used in tests: encrypt then immediately decrypt.
 * Returns true if the result matches the original plaintext.
 */
export function verifyEnvelope(plaintext: string): boolean {
  try {
    return decryptNimKey(encryptNimKey(plaintext)) === plaintext;
  } catch {
    return false;
  }
}
