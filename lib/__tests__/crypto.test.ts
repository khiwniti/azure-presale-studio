import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { encryptNimKey, decryptNimKey, verifyEnvelope } from "../crypto";

// 64 hex chars = 32 bytes — valid AES-256 key for tests
const TEST_KEY = "a".repeat(64);

beforeAll(() => {
  process.env["NIM_ENCRYPTION_KEY"] = TEST_KEY;
});

afterAll(() => {
  delete process.env["NIM_ENCRYPTION_KEY"];
});

describe("encryptNimKey / decryptNimKey", () => {
  it("round-trips an arbitrary API key string", () => {
    const plaintext = "nvapi-abc123XYZ_test-key";
    const envelope = encryptNimKey(plaintext);
    expect(decryptNimKey(envelope)).toBe(plaintext);
  });

  it("produces envelope in iv:tag:ciphertext format", () => {
    const envelope = encryptNimKey("test");
    const parts = envelope.split(":");
    expect(parts).toHaveLength(3);
    // IV: 12 bytes = 24 hex chars
    expect(parts[0]).toMatch(/^[0-9a-f]{24}$/);
    // Auth tag: 16 bytes = 32 hex chars
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/);
    // Ciphertext: non-empty hex
    expect(parts[2]).toMatch(/^[0-9a-f]+$/);
  });

  it("produces a different envelope on each call (unique IV)", () => {
    const plaintext = "same-key";
    const env1 = encryptNimKey(plaintext);
    const env2 = encryptNimKey(plaintext);
    expect(env1).not.toBe(env2);
  });

  it("decrypts correctly despite different IVs", () => {
    const plaintext = "same-key";
    expect(decryptNimKey(encryptNimKey(plaintext))).toBe(plaintext);
    expect(decryptNimKey(encryptNimKey(plaintext))).toBe(plaintext);
  });

  it("encrypts an empty string", () => {
    expect(decryptNimKey(encryptNimKey(""))).toBe("");
  });

  it("encrypts a long key (512 chars)", () => {
    const long = "x".repeat(512);
    expect(decryptNimKey(encryptNimKey(long))).toBe(long);
  });

  it("throws on malformed envelope — wrong number of parts", () => {
    expect(() => decryptNimKey("onlyone")).toThrow("Invalid NIM key envelope");
    expect(() => decryptNimKey("a:b")).toThrow("Invalid NIM key envelope");
    expect(() => decryptNimKey("a:b:c:d")).toThrow("Invalid NIM key envelope");
  });

  it("throws on tampered ciphertext (auth tag mismatch)", () => {
    const envelope = encryptNimKey("secret");
    const parts = envelope.split(":");
    // Flip one hex char in the ciphertext
    const tampered = parts[2]!.replace(/.$/, (c) =>
      c === "f" ? "0" : "f"
    );
    expect(() => decryptNimKey(`${parts[0]}:${parts[1]}:${tampered}`)).toThrow();
  });

  it("throws on tampered auth tag", () => {
    const envelope = encryptNimKey("secret");
    const parts = envelope.split(":");
    const tamperedTag = parts[1]!.replace(/.$/, (c) => (c === "f" ? "0" : "f"));
    expect(() => decryptNimKey(`${parts[0]}:${tamperedTag}:${parts[2]}`)).toThrow();
  });

  it("throws when NIM_ENCRYPTION_KEY is missing", () => {
    const saved = process.env["NIM_ENCRYPTION_KEY"];
    delete process.env["NIM_ENCRYPTION_KEY"];
    expect(() => encryptNimKey("test")).toThrow("NIM_ENCRYPTION_KEY");
    process.env["NIM_ENCRYPTION_KEY"] = saved;
  });

  it("throws when NIM_ENCRYPTION_KEY is wrong length", () => {
    process.env["NIM_ENCRYPTION_KEY"] = "tooshort";
    expect(() => encryptNimKey("test")).toThrow("NIM_ENCRYPTION_KEY");
    process.env["NIM_ENCRYPTION_KEY"] = TEST_KEY;
  });
});

describe("verifyEnvelope", () => {
  it("returns true for a valid round-trip", () => {
    expect(verifyEnvelope("nvapi-key")).toBe(true);
  });

  it("returns false when key env is invalid", () => {
    process.env["NIM_ENCRYPTION_KEY"] = "bad";
    expect(verifyEnvelope("anything")).toBe(false);
    process.env["NIM_ENCRYPTION_KEY"] = TEST_KEY;
  });
});
