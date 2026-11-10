import { randomBytes, randomInt } from "node:crypto";

/** Unguessable household token for links and QR codes (22 URL-safe chars, 128 bits). */
export function newToken(): string {
  return randomBytes(16).toString("base64url");
}

// No 0/O, 1/I/L: these codes are read aloud over the phone.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Six-character code printed under the QR. Only usable by a signed-in host. */
export function newShortCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export function isPlausibleToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(value);
}
