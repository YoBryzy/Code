import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * AES-256-GCM encryption for connected-account OAuth tokens at rest.
 * Key is a base64-encoded 32-byte value in TOKEN_ENCRYPTION_KEY
 * (generate with: `openssl rand -base64 32`).
 *
 * Ciphertext format: base64( iv[12] || authTag[16] || ciphertext ).
 */

function getKey(): Buffer {
  const key = Buffer.from(serverEnv.tokenEncryptionKey, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes (use `openssl rand -base64 32`).");
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptToken(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
