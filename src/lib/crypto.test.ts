import { describe, it, expect, beforeEach } from "vitest";
import {
  encrypt,
  decrypt,
  secureStorageSet,
  secureStorageGet,
  secureStorageRemove,
  setUserPassphrase,
  verifyPassphrase,
  hasUserPassphrase,
  removeUserPassphrase,
} from "./crypto";

describe("crypto.ts", () => {
  beforeEach(() => {
    localStorage.clear();
    removeUserPassphrase();
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a plaintext string correctly", async () => {
      const plaintext = "Confidential QR Data 12345";
      const password = "test-secret-password";

      const encrypted = await encrypt(plaintext, password);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);

      const decrypted = await decrypt(encrypted, password);
      expect(decrypted).toBe(plaintext);
    });

    it("should fail decryption when using the wrong password", async () => {
      const plaintext = "Sensitive info";
      const encrypted = await encrypt(plaintext, "correct-password");

      await expect(decrypt(encrypted, "wrong-password")).rejects.toThrow();
    });

    it("should fail decryption on corrupted or tampered ciphertext", async () => {
      const plaintext = "Valid payload";
      const encrypted = await encrypt(plaintext, "password");

      const tampered = encrypted.slice(0, 10) + "AAAA" + encrypted.slice(14);
      await expect(decrypt(tampered, "password")).rejects.toThrow();
    });
  });

  describe("secureStorage helpers", () => {
    it("should set, get, and remove encrypted items in localStorage", async () => {
      const key = "test_secure_item";
      const value = { a: 1, b: "stitch" };

      await secureStorageSet(key, value, "test-key");
      const rawStored = localStorage.getItem(`__enc:${key}`);
      expect(rawStored).toBeTruthy();

      const retrieved = await secureStorageGet<typeof value>(key, "test-key");
      expect(retrieved).toEqual(value);

      secureStorageRemove(key);
      expect(localStorage.getItem(`__enc:${key}`)).toBeNull();
      const afterRemoval = await secureStorageGet(key, "test-key");
      expect(afterRemoval).toBeUndefined();
    });
  });

  describe("Passphrase management", () => {
    it("should set and verify custom user passphrase", async () => {
      expect(hasUserPassphrase()).toBe(false);

      const success = await setUserPassphrase("MyMasterSecret2026!");
      expect(success).toBe(true);
      expect(hasUserPassphrase()).toBe(true);

      const valid = await verifyPassphrase("MyMasterSecret2026!");
      expect(valid).toBe(true);

      const invalid = await verifyPassphrase("WrongSecret");
      expect(invalid).toBe(false);

      removeUserPassphrase();
      expect(hasUserPassphrase()).toBe(false);
    });
  });
});
