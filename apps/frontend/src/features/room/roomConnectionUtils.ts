import type { RoomErrorPayload } from "@terminal-poker/shared-types";

import { ApiError } from "../../lib/api/client";
import { createRoomSocket } from "../../lib/socket/room-socket";

export type RealtimeAck = { ok: true } | { ok: false; error: RoomErrorPayload };
export type RoomSocket = ReturnType<typeof createRoomSocket>;

const sessionEndedCodes = new Set(["INVALID_SESSION", "KICKED", "LEFT_ROOM", "ROOM_CLOSED"]);

export const isSessionEndedCode = (code: string) => sessionEndedCodes.has(code);

export const toSessionEndedPayload = (error: RoomErrorPayload): RoomErrorPayload | null =>
  isSessionEndedCode(error.code) ? error : null;

export const toRoomStateSessionEndedPayload = (error: ApiError): RoomErrorPayload | null => {
  if (error.code === "ROOM_NOT_FOUND") {
    return {
      code: "ROOM_CLOSED",
      message: "This room no longer exists."
    };
  }

  return isSessionEndedCode(error.code)
    ? {
        code: error.code,
        message: error.message
      }
    : null;
};

export const emitWithAck = (
  emit: (ack: (result: RealtimeAck) => void) => void,
  onSuccess: () => void,
  onError: (error: RoomErrorPayload) => void
) => {
  emit((result: RealtimeAck) => {
    if (!result.ok) {
      onError(result.error);
      return;
    }

    onSuccess();
  });
};
