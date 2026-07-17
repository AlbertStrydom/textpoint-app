import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  buildPasswordHash,
  verifyPasswordHash,
} from "../db";

describe("normalizeEmail", () => {
  it("trims whitespace", () => {
    expect(normalizeEmail("  user@test.com  ")).toBe("user@test.com");
  });

  it("lowercases the email", () => {
    expect(normalizeEmail("USER@TEST.COM")).toBe("user@test.com");
  });

  it("handles already normalized email", () => {
    expect(normalizeEmail("user@test.com")).toBe("user@test.com");
  });
});

describe("buildPasswordHash / verifyPasswordHash", () => {
  it("verifies a password that was hashed", () => {
    const hash = buildPasswordHash("mySecret123!");
    expect(verifyPasswordHash("mySecret123!", hash)).toBe(true);
  });

  it("rejects wrong password", () => {
    const hash = buildPasswordHash("correctPassword");
    expect(verifyPasswordHash("wrongPassword", hash)).toBe(false);
  });

  it("rejects null/undefined hash", () => {
    expect(verifyPasswordHash("password", null)).toBe(false);
    expect(verifyPasswordHash("password", undefined)).toBe(false);
  });

  it("rejects malformed hash", () => {
    expect(verifyPasswordHash("password", "invalid-hash-format")).toBe(false);
    expect(verifyPasswordHash("password", ":nosalt")).toBe(false);
  });
});
