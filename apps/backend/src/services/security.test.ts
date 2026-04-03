import { describe, expect, it } from "vitest";

import { generateRoomCode, hashPasscode, hashSessionToken, verifyPasscode } from "./security";

describe("security helpers", () => {
  it("hashes passcodes with a salt and verifies them", () => {
    const firstHash = hashPasscode("secret");
    const secondHash = hashPasscode("secret");

    expect(firstHash).not.toBe(secondHash);
    expect(verifyPasscode("secret", firstHash)).toBe(true);
    expect(verifyPasscode("nope", firstHash)).toBe(false);
  });

  it("hashes session tokens deterministically for lookup", () => {
    expect(hashSessionToken("participant-token")).toBe(hashSessionToken("participant-token"));
    expect(hashSessionToken("participant-token")).not.toBe(hashSessionToken("other-token"));
  });

  it("rejects malformed stored passcode hashes", () => {
    expect(verifyPasscode("secret", "invalid-hash")).toBe(false);
  });

  it("generates room codes from the allowed alphabet", () => {
    const code = generateRoomCode(32);

    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{32}$/);
  });
});
