import { createHash, randomBytes } from "node:crypto";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const createParticipantToken = (): string => randomBytes(24).toString("hex");

export const hashSecret = (input: string): string =>
  createHash("sha256").update(input).digest("hex");

export const verifySecret = (rawInput: string | null | undefined, storedHash: string | null): boolean => {
  if (!storedHash) {
    return true;
  }

  if (!rawInput) {
    return false;
  }

  return hashSecret(rawInput) === storedHash;
};

export const generateRoomCode = (length = 5): string => {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }

  return value;
};

