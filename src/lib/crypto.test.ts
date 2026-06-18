import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

// A deterministic 32-byte key for tests.
beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("crypto: AES-256-GCM token encryption", () => {
  it("round-trips a value back to the original plaintext", () => {
    const secret = "ya29.a0AfH6SM-some-oauth-access-token";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("handles unicode and empty strings", () => {
    expect(decrypt(encrypt(""))).toBe("");
    expect(decrypt(encrypt("café ☕ — 日本語"))).toBe("café ☕ — 日本語");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encrypt("same-input");
    const b = encrypt("same-input");
    expect(a).not.toBe(b);
    // ...but both still decrypt to the same plaintext.
    expect(decrypt(a)).toBe(decrypt(b));
  });

  it("uses the iv.tag.ciphertext format", () => {
    const parts = encrypt("hello").split(".");
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(p.length).toBeGreaterThan(0));
  });

  it("rejects a tampered ciphertext (GCM auth tag fails)", () => {
    const [iv, tag, data] = encrypt("trust-me").split(".");
    // Flip a byte in the ciphertext segment.
    const corrupted = Buffer.from(data, "base64");
    corrupted[0] ^= 0xff;
    const tampered = [iv, tag, corrupted.toString("base64")].join(".");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("rejects a malformed payload", () => {
    expect(() => decrypt("not-a-valid-payload")).toThrow(
      /malformed encrypted payload/i,
    );
  });
});
