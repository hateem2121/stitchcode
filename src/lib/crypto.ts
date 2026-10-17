/**
 * Local history protection — layered, and honest about what it is.
 *
 * Design (2026):
 * - AES-256-GCM envelope. A random 256-bit data key (DEK) encrypts the
 *   history blob; the DEK itself is stored WRAPPED:
 *     · device tier (default): wrapped with a random device key stored
 *       alongside the data. This is OBFUSCATION — anything that can read the
 *       storage can unwrap it. It prevents casual shoulder-surfing in devtools
 *       and nothing more. Say so, always.
 *     · passphrase tier (optional): wrapped with a key derived from the
 *       user's passphrase — PBKDF2-SHA256 (600k iterations, per OWASP's
 *       current guidance) domain-separated through HKDF-SHA256. THIS is real
 *       protection: without the passphrase the history is unrecoverable.
 * - Storage lives in IndexedDB (async, ArrayBuffer-native, far larger quota
 *   than localStorage's ~5 MB string budget).
 * - Everything is version-tagged (`v: 2`) so future format changes are
 *   deterministic migrations, not guesswork.
 * - The unwrapped DEK is cached for the session (and the KDF runs once per
 *   unlock, not once per autosave).
 *
 * Migrations handled at open: the v1 fingerprint-encrypted blob and the v0
 * plaintext list are adopted best-effort. (v1's key derived from the browser
 * fingerprint — if the browser has updated since, that data was already
 * unreadable and we start fresh; v2 ends that fragility.)
 *
 * Not provided (deliberately): cross-device sync, WebAuthn-prf unlock
 * (browser support still too fragmented as of Oct 2026 — revisit later).
 */

const DB_NAME = "stitchcode-vault";
const DB_VERSION = 1;
const STORE = "kv";
const META_KEY = "meta";
const DEVICE_WRAP_KEY_LS = "stitchcode:device-wrap-key";

/** Legacy storage names (migration only) */
const LEGACY_ENC_PREFIX = "__enc:";
const LEGACY_PLAIN_HISTORY = "stitchcode:history";

const ENC = { name: "AES-GCM", length: 256 } as const;
const IV_LEN = 12;
const DEK_LEN = 32;
const PBKDF2_ITERATIONS = 600_000; // OWASP Password Storage Cheat Sheet (SHA-256)
const HKDF_INFO = new TextEncoder().encode("stitchcode-history-kek-v1");
export const PASSPHRASE_MIN = 8;

/* --------------------------- small helpers --------------------------- */

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function aesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw as unknown as ArrayBuffer, ENC, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** AES-GCM encrypt → base64(iv | ciphertext+tag) */
async function seal(key: CryptoKey, plain: Uint8Array): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain as unknown as ArrayBuffer),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return bytesToB64(out);
}

/** AES-GCM decrypt of seal() output; throws on auth failure */
async function unseal(key: CryptoKey, packed: string): Promise<Uint8Array> {
  const raw = b64ToBytes(packed);
  const iv = raw.slice(0, IV_LEN);
  const ct = raw.slice(IV_LEN);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as ArrayBuffer },
    key,
    ct as unknown as ArrayBuffer,
  );
  return new Uint8Array(plain);
}

/** passphrase → wrapping key: PBKDF2(600k) → HKDF-SHA256 (domain-separated).
 *  HKDF keys can't be derived directly from PBKDF2 (not in the spec's allowed
 *  derivedKeyAlgorithm set) — go through raw bits instead. */
async function passphraseToKek(pass: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass) as unknown as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as unknown as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    256,
  );
  const intermediate = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt as unknown as ArrayBuffer,
      info: HKDF_INFO as unknown as ArrayBuffer,
    },
    intermediate,
    ENC,
    false,
    ["encrypt", "decrypt"],
  );
}

/* --------------------------- IndexedDB kv --------------------------- */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/* --------------------------- vault model --------------------------- */

interface WrapMeta {
  mode: "device" | "passphrase";
  /** PBKDF2 salt (b64) — passphrase tier only */
  salt?: string;
  iterations?: number;
  /** b64(iv | wrapped DEK) */
  wrappedDek: string;
  /** b64(iv | sealed verifier string) — passphrase tier only */
  verifier?: string;
}

interface MetaRecord {
  v: 2;
  wrap: WrapMeta;
}

interface BlobRecord {
  v: 2;
  /** b64(iv | ciphertext) — encrypted with the DEK */
  ct: string;
}

export type VaultStatus = "ready" | "locked" | "missing";

/* session cache — the DEK material, derived/imported once per session */
let sessionDek: CryptoKey | null = null;
let sessionDekRaw: Uint8Array | null = null;
let vaultState: VaultStatus = "missing";
let wrapMode: WrapMeta["mode"] = "device";
let opened = false;

export function vaultStatus(): VaultStatus {
  return vaultState;
}

/** True when a passphrase must unlock the vault (passphrase tier, not yet
 *  unlocked this session). */
export function isLocked(): boolean {
  return vaultState === "locked";
}

/** True when the vault is protected by a passphrase (either tier of lock). */
export function isPassphraseProtected(): boolean {
  return wrapMode === "passphrase";
}

function getDeviceWrapKey(): Uint8Array {
  const existing = localStorage.getItem(DEVICE_WRAP_KEY_LS);
  if (existing) {
    try {
      return b64ToBytes(existing);
    } catch {
      /* fall through — regenerate */
    }
  }
  const fresh = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(DEVICE_WRAP_KEY_LS, bytesToB64(fresh));
  return fresh;
}

async function cacheDek(raw: Uint8Array): Promise<void> {
  sessionDekRaw = raw;
  sessionDek = await aesKey(raw);
}

async function createDeviceVault(): Promise<void> {
  const dek = crypto.getRandomValues(new Uint8Array(DEK_LEN));
  const wrapKey = await aesKey(getDeviceWrapKey());
  const wrappedDek = await seal(wrapKey, dek);
  const meta: MetaRecord = { v: 2, wrap: { mode: "device", wrappedDek } };
  await idbPut(META_KEY, meta);
  await cacheDek(dek);
  wrapMode = "device";
  vaultState = "ready";
}

/* --------------------------- legacy migration --------------------------- */

/**
 * v1 derived its key from browser fingerprint properties (userAgent,
 * language, colorDepth, timezone, hostname) — the fingerprint was SHA-256
 * hashed, base64-encoded, and used as the PBKDF2 password. Reproduced ONLY
 * to read old blobs during migration; nothing new is ever encrypted with it.
 * A browser update changes the fingerprint — such blobs are unreadable by
 * design of v1, and the migration simply starts fresh.
 */
async function legacyBlobPassword(): Promise<string> {
  /* v1 fingerprints were hashed via SHA-256 then used as PBKDF2 "password"
     material — reproduce that: the getAppKey() digest, base64-encoded. */
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen?.colorDepth ?? 24),
    String(new Date().getTimezoneOffset()),
    location.hostname,
  ].join("|");
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(parts) as unknown as ArrayBuffer,
    ),
  );
  return bytesToB64(digest);
}

/** Decrypt a v1 blob: b64(salt16 | iv12 | ct), PBKDF2(password, salt, 350k). */
async function legacyDecrypt(blobB64: string, password: string): Promise<string> {
  const raw = b64ToBytes(blobB64);
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const ct = raw.slice(28);
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password) as unknown as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as unknown as ArrayBuffer,
      iterations: 350_000,
    },
    material,
    ENC,
    false,
    ["encrypt", "decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as ArrayBuffer },
    key,
    ct as unknown as ArrayBuffer,
  );
  return new TextDecoder().decode(plain);
}

function isHistoryArray(v: unknown): v is unknown[] {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        !!x &&
        typeof x === "object" &&
        typeof (x as { id?: unknown }).id === "string" &&
        typeof (x as { ts?: unknown }).ts === "number" &&
        typeof (x as { payload?: unknown }).payload === "string",
    )
  );
}

async function migrateLegacy(): Promise<unknown[] | null> {
  /* v1: fingerprint-encrypted blob */
  const encV1 = localStorage.getItem(`${LEGACY_ENC_PREFIX}stitchcode:history`);
  if (encV1) {
    try {
      const parsed = JSON.parse(await legacyDecrypt(encV1, await legacyBlobPassword()));
      if (isHistoryArray(parsed)) {
        localStorage.removeItem(`${LEGACY_ENC_PREFIX}stitchcode:history`);
        return parsed;
      }
    } catch {
      /* fingerprint changed (browser update) or corrupt — unrecoverable */
      localStorage.removeItem(`${LEGACY_ENC_PREFIX}stitchcode:history`);
    }
  }
  /* v0: plaintext list */
  const plain = localStorage.getItem(LEGACY_PLAIN_HISTORY);
  if (plain) {
    try {
      const parsed = JSON.parse(plain);
      if (isHistoryArray(parsed)) {
        localStorage.removeItem(LEGACY_PLAIN_HISTORY);
        return parsed;
      }
    } catch {
      localStorage.removeItem(LEGACY_PLAIN_HISTORY);
    }
  }
  return null;
}

/* --------------------------- public API --------------------------- */

/** Open (or create) the vault. Call once at app boot. */
export async function openVault(): Promise<VaultStatus> {
  if (opened) return vaultState;
  opened = true;
  try {
    const meta = await idbGet<MetaRecord>(META_KEY);
    if (!meta || meta.v !== 2 || !meta.wrap) {
      const legacy = await migrateLegacy();
      await createDeviceVault();
      if (legacy) await idbPut("history", await sealValue(JSON.stringify(legacy)));
      return vaultState;
    }
    wrapMode = meta.wrap.mode;
    if (meta.wrap.mode === "device") {
      try {
        const wrapKey = await aesKey(getDeviceWrapKey());
        await cacheDek(await unseal(wrapKey, meta.wrap.wrappedDek));
        vaultState = "ready";
      } catch {
        /* device key lost (storage cleared partially) — fresh vault */
        await createDeviceVault();
      }
      return vaultState;
    }
    /* passphrase tier */
    vaultState = sessionDek ? "ready" : "locked";
    return vaultState;
  } catch {
    vaultState = "ready"; /* degrade: vault unusable but app functional */
    sessionDek = null;
    sessionDekRaw = null;
    return vaultState;
  }
}

async function sealValue(json: string): Promise<BlobRecord> {
  if (!sessionDek) throw new Error("Vault locked");
  const ct = await seal(sessionDek, new TextEncoder().encode(json));
  return { v: 2, ct };
}

/** Read a value from the vault. `null` when absent. Throws when locked. */
export async function vaultGet<T>(key: string): Promise<T | null> {
  if (!sessionDek) throw new Error("Vault locked");
  const rec = await idbGet<BlobRecord>(key);
  if (!rec || rec.v !== 2) return null;
  try {
    const plain = await unseal(sessionDek, rec.ct);
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    throw new Error(`Vault record '${key}' failed authentication (corrupt)`);
  }
}

/** Write a value to the vault. Throws when locked or over quota. */
export async function vaultSet<T>(key: string, value: T): Promise<void> {
  const rec = await sealValue(JSON.stringify(value));
  await idbPut(key, rec);
}

/**
 * Unlock a passphrase-protected vault. Runs the 600k-iteration KDF once;
 * the DEK stays cached for the session.
 */
export async function unlockVault(pass: string): Promise<boolean> {
  const meta = await idbGet<MetaRecord>(META_KEY);
  if (!meta || meta.wrap.mode !== "passphrase" || !meta.wrap.salt) return false;
  try {
    const kek = await passphraseToKek(pass, b64ToBytes(meta.wrap.salt));
    await cacheDek(await unseal(kek, meta.wrap.wrappedDek));
    vaultState = "ready";
    return true;
  } catch {
    return false;
  }
}

/**
 * Protect the vault with a passphrase (must currently be unlocked).
 * Re-wraps the SAME DEK, so existing data stays readable.
 */
export async function setPassphrase(pass: string): Promise<boolean> {
  if (pass.length < PASSPHRASE_MIN) return false;
  if (!sessionDek || !sessionDekRaw) throw new Error("Vault locked");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const kek = await passphraseToKek(pass, salt);
  const wrappedDek = await seal(kek, sessionDekRaw);
  const verifier = await seal(kek, new TextEncoder().encode("stitchcode-verifier"));
  const meta: MetaRecord = {
    v: 2,
    wrap: {
      mode: "passphrase",
      salt: bytesToB64(salt),
      iterations: PBKDF2_ITERATIONS,
      wrappedDek,
      verifier,
    },
  };
  await idbPut(META_KEY, meta);
  localStorage.removeItem(DEVICE_WRAP_KEY_LS);
  wrapMode = "passphrase";
  return true;
}

/** Drop passphrase protection: re-wrap the DEK with a fresh device key. */
export async function removePassphrase(): Promise<void> {
  if (!sessionDekRaw) throw new Error("Vault locked");
  localStorage.removeItem(DEVICE_WRAP_KEY_LS);
  const wrapKey = await aesKey(getDeviceWrapKey());
  const wrappedDek = await seal(wrapKey, sessionDekRaw);
  await idbPut(META_KEY, { v: 2, wrap: { mode: "device", wrappedDek } });
  wrapMode = "device";
}

/* test-only: reset SESSION state (a page reload keeps localStorage — tests
 * clear storage explicitly when they want the device tier gone) */
export function __resetVaultForTests(): void {
  sessionDek = null;
  sessionDekRaw = null;
  vaultState = "missing";
  wrapMode = "device";
  opened = false;
}
