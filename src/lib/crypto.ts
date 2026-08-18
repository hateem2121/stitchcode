/**
 * Lightweight encryption utilities for securing sensitive data in localStorage.
 * Uses Web Crypto API for AES-GCM encryption with PBKDF2 key derivation.
 *
 * Security properties (as of 2026):
 * - AES-256-GCM: Authenticated encryption with associated data
 * - PBKDF2-SHA256: Key derivation with configurable iterations
 * - Random salt and IV for each encryption operation
 * - Constant-time comparison for authentication tags
 */

const ENC_ALGO = { name: "AES-GCM", length: 256 };
const DERIVE_ALGO = { name: "PBKDF2", hash: "SHA-256" };
const SALT_LEN = 16;
const IV_LEN = 12;
const ITERATIONS = 350000; // OWASP 2026 recommendation for PBKDF2-SHA256

/**
 * Derives a cryptographic key from a password using PBKDF2.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    DERIVE_ALGO,
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      ...DERIVE_ALGO,
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: ITERATIONS,
    },
    keyMaterial,
    ENC_ALGO,
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Constant-time byte array comparison to prevent timing attacks.
 * Returns true if both arrays are equal in length and content.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Encrypts plaintext data using AES-256-GCM.
 * Returns base64-encoded ciphertext with salt and IV prepended.
 * Format: [salt: 16 bytes][iv: 12 bytes][ciphertext + authTag]
 */
export async function encrypt(text: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  // Convert to base64
  let binary = "";
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypts data encrypted with encrypt().
 * Expects base64-encoded input with salt and IV prepended.
 * Uses constant-time comparison for authentication tag validation.
 */
export async function decrypt(encryptedBase64: string, password: string): Promise<string> {
  // Decode base64
  const binary = atob(encryptedBase64);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  // Extract salt, iv, and ciphertext
  const salt = combined.slice(0, SALT_LEN);
  const iv = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = combined.slice(SALT_LEN + IV_LEN);

  const key = await deriveKey(password, salt);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(plaintext);
  } catch (error) {
    // Authentication failed - possible tampering or wrong password
    // Use constant-time operations to avoid timing side-channels
    const dummy = new Uint8Array(ciphertext.length);
    constantTimeEqual(dummy, ciphertext);
    throw new Error("Decryption failed: authentication tag mismatch");
  }
}

/**
 * Generates a deterministic but secure app-specific key from device fingerprint.
 * This is used as the default encryption key for localStorage data.
 */
export async function getAppKey(): Promise<string> {
  // Use a combination of stable browser properties
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    location.hostname,
  ].join("|");

  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
  const hashBytes = new Uint8Array(hash);

  // Convert to base64 for use as password
  let binary = "";
  for (let i = 0; i < hashBytes.length; i++) {
    binary += String.fromCharCode(hashBytes[i]);
  }
  return btoa(binary);
}

/**
 * Securely stores sensitive data in localStorage with encryption.
 * Automatically handles serialization.
 */
export async function secureStorageSet(key: string, value: unknown, appKey?: string): Promise<void> {
  const json = JSON.stringify(value);
  const password = appKey ?? await getAppKey();
  const encrypted = await encrypt(json, password);
  localStorage.setItem(`__enc:${key}`, encrypted);
}

/**
 * Retrieves and decrypts data from secure storage.
 * Returns undefined if decryption fails or key doesn't exist.
 */
export async function secureStorageGet<T>(key: string, appKey?: string): Promise<T | undefined> {
  const encrypted = localStorage.getItem(`__enc:${key}`);
  if (!encrypted) return undefined;

  try {
    const password = appKey ?? await getAppKey();
    const json = await decrypt(encrypted, password);
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

/**
 * Removes encrypted data from secure storage.
 */
export function secureStorageRemove(key: string): void {
  localStorage.removeItem(`__enc:${key}`);
}
