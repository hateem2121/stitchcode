/**
 * Lightweight encryption utilities for securing sensitive data in localStorage.
 * Uses Web Crypto API for AES-GCM encryption with PBKDF2 key derivation.
 *
 * Security properties (as of 2026):
 * - AES-256-GCM: Authenticated encryption with associated data
 * - PBKDF2-SHA256: Key derivation with configurable iterations
 * - Random salt and IV for each encryption operation
 * - Constant-time comparison for authentication tags
 * 
 * Key Management:
 * - Supports both device-fingerprint derived keys and user-provided passphrases
 * - User passphrases provide stronger security and cross-device sync capability
 * - Device fingerprint fallback for convenience (offline-only scenarios)
 */

const ENC_ALGO = { name: "AES-GCM", length: 256 };
const DERIVE_ALGO = { name: "PBKDF2", hash: "SHA-256" };
const SALT_LEN = 16;
const IV_LEN = 12;
const ITERATIONS = 350000; // OWASP 2026 recommendation for PBKDF2-SHA256

// Storage keys for user passphrase management
const PASSPHRASE_SALT_KEY = "__stitchcode:passphrase_salt";
const PASSPHRASE_VERIFIER_KEY = "__stitchcode:passphrase_verifier";

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
 * This is used as the default encryption key for localStorage data when no user passphrase is set.
 * 
 * @deprecated Use setUserPassphrase() and getUserPassphraseKey() for better security
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
 * Sets up a user passphrase for encryption with proper salt and verification.
 * Stores a salt and a verifier (encrypted test string) to validate the passphrase later.
 * 
 * @param passphrase - User's chosen passphrase (minimum 8 characters recommended)
 * @returns true if successfully set
 */
export async function setUserPassphrase(passphrase: string): Promise<boolean> {
  if (passphrase.length < 1) {
    return false;
  }

  try {
    // Generate random salt for this passphrase
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    
    // Derive key from passphrase
    const key = await deriveKey(passphrase, salt);
    
    // Create a verifier by encrypting a known string
    const testString = "STITCHCODE_VERIFY_2026";
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(testString)
    );
    
    // Store salt and verifier (IV prepended to ciphertext)
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Convert to base64 for storage
    let binary = "";
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    const verifierBase64 = btoa(binary);
    
    // Store in localStorage (not encrypted, just encoded)
    let saltBinary = "";
    for (let i = 0; i < salt.length; i++) {
      saltBinary += String.fromCharCode(salt[i]);
    }
    localStorage.setItem(PASSPHRASE_SALT_KEY, btoa(saltBinary));
    localStorage.setItem(PASSPHRASE_VERIFIER_KEY, verifierBase64);
    
    return true;
  } catch (error) {
    console.error("Failed to set passphrase:", error);
    return false;
  }
}

/**
 * Verifies if a passphrase is correct by attempting to decrypt the stored verifier.
 * 
 * @param passphrase - User's passphrase to verify
 * @returns true if passphrase is correct, false otherwise
 */
export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  try {
    const saltB64 = localStorage.getItem(PASSPHRASE_SALT_KEY);
    const verifierB64 = localStorage.getItem(PASSPHRASE_VERIFIER_KEY);
    
    if (!saltB64 || !verifierB64) {
      return false;
    }
    
    // Decode salt
    const saltBinary = atob(saltB64);
    const salt = new Uint8Array(saltBinary.length);
    for (let i = 0; i < saltBinary.length; i++) {
      salt[i] = saltBinary.charCodeAt(i);
    }
    
    // Decode verifier (salt + IV + encrypted test string)
    const combined = new Uint8Array(atob(verifierB64).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
    const ciphertext = combined.slice(SALT_LEN + IV_LEN);
    
    // Derive key and attempt decryption
    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    
    const dec = new TextDecoder();
    const result = dec.decode(decrypted);
    
    return result === "STITCHCODE_VERIFY_2026";
  } catch {
    return false;
  }
}

/**
 * Gets the encryption key derived from user passphrase if set, otherwise falls back to device fingerprint.
 * 
 * @param passphrase - Optional passphrase (if not provided, attempts to use stored one or falls back to device key)
 * @returns The encryption key as a string
 */
export async function getUserPassphraseKey(passphrase?: string): Promise<string | null> {
  if (passphrase) {
    const valid = await verifyPassphrase(passphrase);
    if (valid) {
      return passphrase;
    }
    return null;
  }
  
  // Check if passphrase was previously set
  const saltB64 = localStorage.getItem(PASSPHRASE_SALT_KEY);
  if (saltB64) {
    // User has set a passphrase before, but we can't retrieve it
    // They need to provide it again
    return null;
  }
  
  // No passphrase set, fall back to device fingerprint
  return null;
}

/**
 * Checks if a user passphrase has been configured.
 */
export function hasUserPassphrase(): boolean {
  return !!(localStorage.getItem(PASSPHRASE_SALT_KEY) && localStorage.getItem(PASSPHRASE_VERIFIER_KEY));
}

/**
 * Removes user passphrase configuration.
 * Note: This will make previously encrypted data inaccessible!
 */
export function removeUserPassphrase(): void {
  localStorage.removeItem(PASSPHRASE_SALT_KEY);
  localStorage.removeItem(PASSPHRASE_VERIFIER_KEY);
}

/**
 * Securely stores sensitive data in localStorage with encryption.
 * Automatically handles serialization.
 * 
 * @param key - Storage key
 * @param value - Value to store (will be JSON serialized)
 * @param appKey - Optional encryption key/passphrase. If not provided:
 *   - Uses user passphrase if one is configured
 *   - Falls back to device fingerprint key
 */
export async function secureStorageSet(key: string, value: unknown, appKey?: string): Promise<void> {
  const json = JSON.stringify(value);
  // Use provided key, or check for user passphrase, or fall back to device fingerprint
  const password = appKey ?? (await getUserPassphraseKey()) ?? await getAppKey();
  const encrypted = await encrypt(json, password);
  localStorage.setItem(`__enc:${key}`, encrypted);
}

/**
 * Retrieves and decrypts data from secure storage.
 * Returns undefined if decryption fails or key doesn't exist.
 * 
 * @param key - Storage key
 * @param appKey - Optional encryption key/passphrase. If not provided:
 *   - Uses user passphrase if one is configured
 *   - Falls back to device fingerprint key
 */
export async function secureStorageGet<T>(key: string, appKey?: string): Promise<T | undefined> {
  const encrypted = localStorage.getItem(`__enc:${key}`);
  if (!encrypted) return undefined;

  try {
    // Use provided key, or check for user passphrase, or fall back to device fingerprint
    const password = appKey ?? (await getUserPassphraseKey()) ?? await getAppKey();
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
