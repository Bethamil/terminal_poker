import type { Server } from "socket.io";
import type { Socket } from "socket.io";
import { ServerToClientEvents, ClientToServerEvents } from "@terminal-poker/shared-types";

import { AppError, asAppError } from "../http/errors";
import type { RoomService } from "../services/room-service";

interface SocketData {
  roomCode?: string;
  participantId?: string;
  participantToken?: string;
}

const normalizeRoomCode = (roomCode: string) => roomCode.toUpperCase();

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

const getSocketSession = (
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  payloadRoomCode: string
): { roomCode: string; participantId: string; participantToken: string } => {
  const session = socket.data as SocketData;
  const roomCode = normalizeRoomCode(payloadRoomCode);

  if (
    !session.roomCode ||
    !session.participantId ||
    !session.participantToken ||
    session.roomCode !== roomCode ||
    !socket.rooms.has(roomCode)
  ) {
    throw new AppError(401, "INVALID_SESSION", "Realtime session is invalid.");
  }

  return {
    roomCode,
    participantId: session.participantId,
    participantToken: session.participantToken
  };
};

export const registerRoomHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  roomService: RoomService
) => {
  socket.on("room:joinRealtime", async (payload, ack) => {
    try {
      const roomCode = normalizeRoomCode(payload.roomCode);
      const result = await roomService.joinRealtime(roomCode, payload.participantToken);
      const previousRoomCode = (socket.data as SocketData).roomCode;

      if (previousRoomCode && previousRoomCode !== roomCode) {
        await socket.leave(previousRoomCode);
      }

      (socket.data as SocketData).roomCode = roomCode;
      (socket.data as SocketData).participantId = result.participantId;
      (socket.data as SocketData).participantToken = payload.participantToken;

      await socket.join(roomCode);
      ack?.({ ok: true });
      await emitRoomSnapshots(io, roomService, roomCode);
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

  socket.on("room:updateSettings", async (payload, ack) => {
    try {
      const session = getSocketSession(socket, payload.roomCode);
      await roomService.updateRoomSettings(session.roomCode, session.participantToken, payload);
      ack?.({ ok: true });
      await emitRoomSnapshots(io, roomService, session.roomCode);
    } catch (error) {
      const appError = asAppError(error);
      ack?.({
        ok: false,
        error: {
          code: appError.code,
          message: appError.message
        }
      });
    }
  });

  socket.on("room:kickParticipant", async (payload) => {
    try {
      const session = getSocketSession(socket, payload.roomCode);
      const result = await roomService.kickParticipant(
        session.roomCode,
        session.participantToken,
        payload.participantId
      );
      await disconnectParticipantSockets(
        io,
        session.roomCode,
        result.participantId,
        {
          code: "KICKED",
          message: `${result.participantName} was removed by the moderator.`
        }
      );
      await emitRoomSnapshots(io, roomService, session.roomCode);
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("room:changeParticipantRole", async (payload, ack) => {
    try {
      const session = getSocketSession(socket, payload.roomCode);
      await roomService.changeParticipantRole(
        session.roomCode,
        session.participantToken,
        payload.participantId,
        payload.newRole
      );
      ack?.({ ok: true });
      await emitRoomSnapshots(io, roomService, session.roomCode);
    } catch (error) {
      const appError = asAppError(error);
      ack?.({
        ok: false,
        error: {
          code: appError.code,
          message: appError.message
        }
      });
    }
  });

  socket.on("room:leave", async (payload, ack) => {
    try {
      const session = getSocketSession(socket, payload.roomCode);
      const result = await roomService.leaveRoom(session.roomCode, session.participantToken);

      ack?.({ ok: true });

      if (result.roomDeleted) {
        await disconnectRoomSockets(io, session.roomCode, {
          code: "ROOM_CLOSED",
          message: "The host left, so the room was closed."
        });
        return;
      }

      await disconnectParticipantSockets(
        io,
        session.roomCode,
        result.participantId,
        {
          code: "LEFT_ROOM",
          message: `${result.participantName} left the room.`
        }
      );
      await emitRoomSnapshots(io, roomService, session.roomCode);
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
      const session = getSocketSession(socket, payload.roomCode);
      const { isFirstVote } = await roomService.castVote(session.roomCode, session.participantToken, payload.value);
      if (isFirstVote) {
        io.to(session.roomCode).emit("vote:status", {
          participantId: session.participantId,
          hasVoted: true
        });
      }
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("round:setTicket", async (payload) => {
    try {
      const session = getSocketSession(socket, payload.roomCode);
      await roomService.setRoundTicket(session.roomCode, session.participantToken, payload.jiraTicketKey);
      await emitRoomSnapshots(io, roomService, session.roomCode);
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("round:reveal", async (payload) => {
    try {
      const session = getSocketSession(socket, payload.roomCode);
      await roomService.revealRound(session.roomCode, session.participantToken);
      await emitRoomSnapshots(io, roomService, session.roomCode);
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("round:unreveal", async (payload) => {
    try {
      const session = getSocketSession(socket, payload.roomCode);
      await roomService.unrevealRound(session.roomCode, session.participantToken);
      await emitRoomSnapshots(io, roomService, session.roomCode);
    } catch (error) {
      emitSocketError(socket, error);
    }
  });

  socket.on("round:reset", async (payload) => {
    try {
      const session = getSocketSession(socket, payload.roomCode);
      await roomService.resetRound(session.roomCode, session.participantToken);
      await emitRoomSnapshots(io, roomService, session.roomCode);
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
