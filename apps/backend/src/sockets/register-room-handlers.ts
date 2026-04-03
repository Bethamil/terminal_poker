import type { Server } from "socket.io";
import type { Socket } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents } from "@terminal-poker/shared-types";

import { asAppError } from "../http/errors";
import type { RoomService } from "../services/room-service";

interface SocketData {
  roomCode?: string;
  participantId?: string;
  participantToken?: string;
}

const clearSocketRoomState = (socket: { data: unknown }) => {
  delete (socket.data as SocketData).roomCode;
  delete (socket.data as SocketData).participantId;
  delete (socket.data as SocketData).participantToken;
};

const getActiveParticipantIds = (
  sockets: Array<{ data: unknown }>
): ReadonlySet<string> =>
  new Set(
    sockets
      .map((socket) => (socket.data as SocketData).participantId)
      .filter((participantId): participantId is string => Boolean(participantId))
  );

const emitRoomSnapshots = async (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomService: RoomService,
  roomCode: string
) => {
  const room = await roomService.getRoomAggregate(roomCode);
  const sockets = await io.in(roomCode).fetchSockets();
  const activeParticipantIds = getActiveParticipantIds(sockets as Array<{ data: unknown }>);

  sockets.forEach((socket) => {
    const participantId = (socket.data as SocketData).participantId;

    if (!participantId) {
      return;
    }

    const participantExists = room.participants.some((participant) => participant.id === participantId);

    if (!participantExists) {
      clearSocketRoomState(socket);
      socket.emit("room:error", {
        code: "INVALID_SESSION",
        message: "Participant session is invalid."
      });
      socket.disconnect(true);
      return;
    }

    socket.emit("room:snapshot", roomService.buildSnapshotForParticipant(room, participantId, activeParticipantIds));
  });
};

const disconnectParticipantSockets = async (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomCode: string,
  participantId: string,
  payload: { code: string; message: string }
) => {
  const sockets = await io.in(roomCode).fetchSockets();

  sockets.forEach((socket) => {
    if ((socket.data as SocketData).participantId !== participantId) {
      return;
    }

    clearSocketRoomState(socket);
    socket.emit("room:error", payload);
    socket.disconnect(true);
  });
};

const disconnectRoomSockets = async (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomCode: string,
  payload: { code: string; message: string }
) => {
  const sockets = await io.in(roomCode).fetchSockets();

  sockets.forEach((socket) => {
    clearSocketRoomState(socket);
    socket.emit("room:error", payload);
    socket.disconnect(true);
  });
};

const emitSocketError = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  error: unknown
) => {
  const appError = asAppError(error);
  socket.emit("room:error", {
    code: appError.code,
    message: appError.message
  });
};

export const registerRoomHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  roomService: RoomService
) => {
  socket.on("room:joinRealtime", async (payload, ack) => {
    try {
      const result = await roomService.joinRealtime(payload.roomCode, payload.participantToken);

      (socket.data as SocketData).roomCode = payload.roomCode.toUpperCase();
      (socket.data as SocketData).participantId = result.participantId;
      (socket.data as SocketData).participantToken = payload.participantToken;

      await socket.join(payload.roomCode.toUpperCase());
      ack?.({ ok: true });
      await emitRoomSnapshots(io, roomService, payload.roomCode.toUpperCase());
    } catch (error) {
      const appError = asAppError(error);
      ack?.({
        ok: false,
        error: {
          code: appError.code,
          message: appError.message
        }
      });
      emitSocketError(socket, error);
    }
  });

  socket.on("room:updateSettings", async (payload) => {
    try {
      await roomService.updateRoomSettings(payload.roomCode, payload.participantToken, payload);
      await emitRoomSnapshots(io, roomService, payload.roomCode.toUpperCase());
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("room:kickParticipant", async (payload) => {
    try {
      const result = await roomService.kickParticipant(
        payload.roomCode,
        payload.participantToken,
        payload.participantId
      );
      await disconnectParticipantSockets(
        io,
        payload.roomCode.toUpperCase(),
        result.participantId,
        {
          code: "KICKED",
          message: `${result.participantName} was removed by the moderator.`
        }
      );
      await emitRoomSnapshots(io, roomService, payload.roomCode.toUpperCase());
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("room:leave", async (payload, ack) => {
    try {
      const result = await roomService.leaveRoom(payload.roomCode, payload.participantToken);

      ack?.({ ok: true });

      if (result.roomDeleted) {
        await disconnectRoomSockets(io, payload.roomCode.toUpperCase(), {
          code: "ROOM_CLOSED",
          message: "The host left, so the room was closed."
        });
        return;
      }

      await disconnectParticipantSockets(
        io,
        payload.roomCode.toUpperCase(),
        result.participantId,
        {
          code: "LEFT_ROOM",
          message: `${result.participantName} left the room.`
        }
      );
      await emitRoomSnapshots(io, roomService, payload.roomCode.toUpperCase());
    } catch (error) {
      const appError = asAppError(error);
      ack?.({
        ok: false,
        error: {
          code: appError.code,
          message: appError.message
        }
      });
      emitSocketError(socket, error);
    }
  });

  socket.on("vote:cast", async (payload) => {
    try {
      await roomService.castVote(payload.roomCode, payload.participantToken, payload.value);
      const participantId = (socket.data as SocketData).participantId;

      if (participantId) {
        io.to(payload.roomCode.toUpperCase()).emit("vote:status", {
          participantId,
          hasVoted: true
        });
      }

      await emitRoomSnapshots(io, roomService, payload.roomCode.toUpperCase());
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("round:setTicket", async (payload) => {
    try {
      await roomService.setRoundTicket(payload.roomCode, payload.participantToken, payload.jiraTicketKey);
      await emitRoomSnapshots(io, roomService, payload.roomCode.toUpperCase());
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("round:reveal", async (payload) => {
    try {
      await roomService.revealRound(payload.roomCode, payload.participantToken);
      await emitRoomSnapshots(io, roomService, payload.roomCode.toUpperCase());
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("round:unreveal", async (payload) => {
    try {
      await roomService.unrevealRound(payload.roomCode, payload.participantToken);
      await emitRoomSnapshots(io, roomService, payload.roomCode.toUpperCase());
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("round:reset", async (payload) => {
    try {
      await roomService.resetRound(payload.roomCode, payload.participantToken);
      await emitRoomSnapshots(io, roomService, payload.roomCode.toUpperCase());
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("disconnect", () => {
    const roomCode = (socket.data as SocketData).roomCode;

    if (!roomCode) {
      return;
    }

    void emitRoomSnapshots(io, roomService, roomCode).catch((error) => {
      const appError = asAppError(error);

      if (appError.code === "ROOM_NOT_FOUND") {
        return;
      }

      // eslint-disable-next-line no-console
      console.error(error);
    });
  });
};
