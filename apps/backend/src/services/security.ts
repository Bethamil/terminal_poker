import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSCODE_HASH_PREFIX = "scrypt";
const PASSCODE_SALT_BYTES = 16;
const PASSCODE_KEY_BYTES = 32;

const constantTimeEqual = (left: Buffer, right: Buffer): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
};

export const createParticipantToken = (): string => randomBytes(24).toString("hex");

export const hashSessionToken = (input: string): string =>
  createHash("sha256").update(input).digest("hex");

export const hashPasscode = (input: string): string => {
  const salt = randomBytes(PASSCODE_SALT_BYTES).toString("hex");
  const derivedKey = scryptSync(input, salt, PASSCODE_KEY_BYTES).toString("hex");

  return `${PASSCODE_HASH_PREFIX}$${salt}$${derivedKey}`;
};

export const verifyPasscode = (rawInput: string | null | undefined, storedHash: string | null): boolean => {
  if (!storedHash) {
    return true;
  }

  if (!rawInput) {
    return false;
  }

  const [prefix, salt, expectedHash] = storedHash.split("$");

  if (prefix !== PASSCODE_HASH_PREFIX || !salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(rawInput, salt, PASSCODE_KEY_BYTES);
  const expectedHashBuffer = Buffer.from(expectedHash, "hex");

  return constantTimeEqual(actualHash, expectedHashBuffer);
};

export const generateRoomCode = (length = 5): string => {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += ROOM_CODE_CHARS[randomInt(ROOM_CODE_CHARS.length)];
  }

  return value;
};
