import { describe, it, expect, beforeEach } from "vitest";
import {
  openVault,
  vaultGet,
  vaultSet,
  unlockVault,
  setPassphrase,
  removePassphrase,
  isPassphraseProtected,
  PASSPHRASE_MIN,
  __resetVaultForTests,
} from "./crypto";

/** Fresh vault (and fresh session) for every test. */
async function resetVault(): Promise<void> {
  __resetVaultForTests();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("stitchcode-vault");
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

/** Simulate a new session (page reload): session state dropped, vault re-opened. */
async function reopenVault(): Promise<ReturnType<typeof openVault>> {
  __resetVaultForTests();
  return openVault();
}

beforeEach(async () => {
  localStorage.clear();
  await resetVault();
});

describe("crypto vault v2", () => {
  it("creates a device vault on first open and round-trips values", async () => {
    await expect(openVault()).resolves.toBe("ready");
    const data = [{ id: "a", ts: 1, payload: "https://stitchcode.run" }];
    await vaultSet("history", data);
    expect(await vaultGet<typeof data>("history")).toEqual(data);
    expect(await vaultGet("nothing-here")).toBeNull();
  });

  it("device tier survives a session restart with no user action", async () => {
    await openVault();
    await vaultSet("history", [{ id: "a", ts: 1, payload: "x" }]);
    await reopenVault();
    expect(await vaultGet<Array<{ id: string }>>("history")).toEqual([
      { id: "a", ts: 1, payload: "x" },
    ]);
  });

  it("enforces the passphrase minimum length", async () => {
    await openVault();
    expect(PASSPHRASE_MIN).toBeGreaterThanOrEqual(8);
    await expect(setPassphrase("short")).resolves.toBe(false);
    expect(isPassphraseProtected()).toBe(false);
  });

  it("passphrase tier: locks on reload, rejects wrong pass, unlocks with right one", async () => {
    await openVault();
    await vaultSet("history", [{ id: "a", ts: 1, payload: "secret-wifi" }]);
    await expect(setPassphrase("warp-and-weft")).resolves.toBe(true);
    expect(isPassphraseProtected()).toBe(true);

    /* reload: session state gone, data must be locked away */
    await reopenVault();
    expect(isPassphraseProtected()).toBe(true);
    await expect(vaultGet("history")).rejects.toThrow(/locked/i);
    await expect(unlockVault("wrong-passphrase")).resolves.toBe(false);
    await expect(unlockVault("warp-and-weft")).resolves.toBe(true);
    expect(await vaultGet<Array<{ payload: string }>>("history")).toEqual([
      { id: "a", ts: 1, payload: "secret-wifi" },
    ]);
  });

  it("removing the passphrase returns to the device tier", async () => {
    await openVault();
    await setPassphrase("warp-and-weft");
    await removePassphrase();
    await reopenVault();
    expect(isPassphraseProtected()).toBe(false);
    /* device tier: opens with no interaction */
    await expect(vaultGet("history")).resolves.toBeNull();
  });

  it("migrates a v0 plaintext history list into the vault", async () => {
    localStorage.setItem(
      "stitchcode:history",
      JSON.stringify([{ id: "old", ts: 42, payload: "https://legacy.example" }]),
    );
    await openVault();
    expect(localStorage.getItem("stitchcode:history")).toBeNull();
    expect(await vaultGet<Array<{ id: string }>>("history")).toEqual([
      { id: "old", ts: 42, payload: "https://legacy.example" },
    ]);
  });

  it("migrates a v1 fingerprint-encrypted blob (reproduces the v1 format)", async () => {
    /* v1: PBKDF2(password = b64(SHA-256(fingerprint)), salt, 350k) → AES-GCM,
       blob = b64(salt16 | iv12 | ct) under localStorage "__enc:stitchcode:history" */
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
    let pw = "";
    for (const b of digest) pw += String.fromCharCode(b);
    const password = btoa(pw);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
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
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const history = [{ id: "v1", ts: 7, payload: "https://v1.example" }];
    const ct = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as unknown as ArrayBuffer },
        key,
        new TextEncoder().encode(JSON.stringify(history)) as unknown as ArrayBuffer,
      ),
    );
    const blob = new Uint8Array(16 + 12 + ct.length);
    blob.set(salt, 0);
    blob.set(iv, 16);
    blob.set(ct, 28);
    let b64 = "";
    for (const x of blob) b64 += String.fromCharCode(x);
    localStorage.setItem("__enc:stitchcode:history", btoa(b64));

    await openVault();
    expect(localStorage.getItem("__enc:stitchcode:history")).toBeNull();
    expect(await vaultGet<Array<{ id: string }>>("history")).toEqual(history);
  });

  it("starts fresh when a v1 blob is unreadable (fingerprint changed)", async () => {
    localStorage.setItem("__enc:stitchcode:history", "not-valid-base64!!!");
    await openVault();
    expect(await vaultGet("history")).toBeNull();
    expect(localStorage.getItem("__enc:stitchcode:history")).toBeNull();
  });
});
