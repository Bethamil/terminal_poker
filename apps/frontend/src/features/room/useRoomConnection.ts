import { useEffect, useMemo, useRef, useState } from "react";

import {
  getVoteCardMeta,
  type RoomErrorPayload,
  type RoomSnapshot,
  type UpdateRoomSettingsPayload,
  type VoteStatusPayload,
  type VoteValue
} from "@terminal-poker/shared-types";

import { apiClient, ApiError } from "../../lib/api/client";
import { createRoomSocket } from "../../lib/socket/room-socket";
import { emitWithAck, type RoomSocket, toRoomStateSessionEndedPayload, toSessionEndedPayload } from "./roomConnectionUtils";
import { useRoomShortcuts } from "./useRoomShortcuts";

interface UseRoomConnectionResult {
  snapshot: RoomSnapshot | null;
  error: string | null;
  sessionEndedError: RoomErrorPayload | null;
  isLoading: boolean;
  isRealtimeReady: boolean;
  castVote: (value: VoteValue) => void;
  leaveRoom: () => Promise<void>;
  revealRound: () => void;
  unrevealRound: () => void;
  resetRound: () => void;
  updateTicket: (jiraTicketKey: string | null) => void;
  updateRoomSettings: (
    payload: Pick<UpdateRoomSettingsPayload, "jiraBaseUrl" | "votingDeckId" | "joinPasscode" | "joinPasscodeMode">
  ) => Promise<void>;
  kickParticipant: (participantId: string) => void;
}

export const useRoomConnection = (
  roomCode: string,
  participantToken: string | null
): UseRoomConnectionResult => {
  const normalizedRoomCode = roomCode.toUpperCase();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeReady, setIsRealtimeReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEndedError, setSessionEndedError] = useState<RoomErrorPayload | null>(null);
  const socketRef = useRef<RoomSocket | null>(null);

  const setSessionEndedState = (payload: RoomErrorPayload | null) => {
    if (payload) {
      setSessionEndedError(payload);
    }
  };

  useEffect(() => {
    if (!participantToken) {
      setSnapshot(null);
      setIsLoading(false);
      setIsRealtimeReady(false);
      setError(null);
      setSessionEndedError(null);
      return;
    }

    let disposed = false;
    setIsLoading(true);
    setError(null);
    setSessionEndedError(null);

    apiClient
      .getRoomState(normalizedRoomCode, participantToken)
      .then((response) => {
        if (disposed) {
          return;
        }

        setSnapshot(response.snapshot);
        setIsLoading(false);

        const socket = createRoomSocket();
        socketRef.current = socket;

        const joinRealtimeRoom = () => {
          if (disposed) {
            return;
          }

          setIsRealtimeReady(false);

          emitWithAck(
            (ack) =>
              socket.emit("room:joinRealtime", {
                roomCode: normalizedRoomCode,
                participantToken
              }, ack),
            () => {
              if (disposed) {
                return;
              }

              setError(null);
              setSessionEndedError(null);
              setIsRealtimeReady(true);
            },
            (nextError) => {
              if (disposed) {
                return;
              }

              setIsRealtimeReady(false);
              setError(nextError.message);
              setSessionEndedState(toSessionEndedPayload(nextError));
            }
          );
        };

        socket.on("connect", joinRealtimeRoom);

        socket.on("disconnect", () => {
          if (disposed) {
            return;
          }

          setIsRealtimeReady(false);
        });

        socket.on("connect_error", () => {
          if (disposed) {
            return;
          }

          setIsRealtimeReady(false);
        });

        socket.on("room:snapshot", (nextSnapshot: RoomSnapshot) => {
          if (disposed) {
            return;
          }

          setSnapshot(nextSnapshot);
        });

        socket.on("round:updated", (nextSnapshot: RoomSnapshot) => {
          if (disposed) {
            return;
          }

          setSnapshot(nextSnapshot);
        });

        socket.on("vote:status", (payload: VoteStatusPayload) => {
          if (disposed) {
            return;
          }

          setSnapshot((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p.id === payload.participantId ? { ...p, hasVoted: payload.hasVoted } : p
              )
            };
          });
        });

        socket.on("room:error", (payload: RoomErrorPayload) => {
          if (disposed) {
            return;
          }

          if (payload.code === "ROUND_REVEALED") {
            return;
          }

          setError(payload.message);
          setSessionEndedState(toSessionEndedPayload(payload));
        });
      })
      .catch((requestError: unknown) => {
        const message =
          requestError instanceof ApiError ? requestError.message : "Unable to load room state.";
        setError(message);

        if (requestError instanceof ApiError) {
          setSessionEndedState(toRoomStateSessionEndedPayload(requestError));
        }

        setSnapshot(null);
        setIsLoading(false);
      });

    return () => {
      disposed = true;
      setIsRealtimeReady(false);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [normalizedRoomCode, participantToken]);

  const getSocketSession = (
    requireRealtimeReady = false
  ): { socket: RoomSocket; participantToken: string } | null => {
    const socket = socketRef.current;

    if (!socket || !participantToken || (requireRealtimeReady && !isRealtimeReady)) {
      return null;
    }

    return { socket, participantToken };
  };

  const emitVote = (value: VoteValue) => {
    const session = getSocketSession(true);

    if (!session) {
      return;
    }

    if (snapshot?.round.status === "revealed") {
      return;
    }

    setSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        viewer: { ...prev.viewer, selectedVote: value }
      };
    });

    session.socket.emit("vote:cast", {
      roomCode: normalizedRoomCode,
      participantToken: session.participantToken,
      value
    });
  };

  const emitRoundAction = (eventName: "round:reveal" | "round:unreveal" | "round:reset") => {
    const session = getSocketSession(true);

    if (!session) {
      return;
    }

    session.socket.emit(eventName, {
      roomCode: normalizedRoomCode,
      participantToken: session.participantToken
    });
  };

  const emitTicketUpdate = (jiraTicketKey: string | null) => {
    const session = getSocketSession(true);

    if (!session) {
      return;
    }

    session.socket.emit("round:setTicket", {
      roomCode: normalizedRoomCode,
      participantToken: session.participantToken,
      jiraTicketKey
    });
  };

  const emitRoomSettingsUpdate = (
    payload: Pick<UpdateRoomSettingsPayload, "jiraBaseUrl" | "votingDeckId" | "joinPasscode" | "joinPasscodeMode">
  ) =>
    new Promise<void>((resolve, reject) => {
      const session = getSocketSession(true);

      if (!session) {
        reject(new Error("Room connection is not ready."));
        return;
      }

      let finished = false;
      const timeoutId = window.setTimeout(() => {
        if (finished) {
          return;
        }

        finished = true;
        reject(new ApiError(408, "REQUEST_TIMEOUT", "Unable to save room settings right now."));
      }, 4000);

      emitWithAck(
        (ack) =>
          session.socket.emit("room:updateSettings", {
            roomCode: normalizedRoomCode,
            participantToken: session.participantToken,
            ...payload
          }, ack),
        () => {
          if (finished) {
            return;
          }

          finished = true;
          window.clearTimeout(timeoutId);
          resolve();
        },
        (nextError) => {
          if (finished) {
            return;
          }

          finished = true;
          window.clearTimeout(timeoutId);
          reject(new ApiError(400, nextError.code, nextError.message));
        }
      );
    });

  const emitKickParticipant = (participantId: string) => {
    const session = getSocketSession(true);

    if (!session) {
      return;
    }

    session.socket.emit("room:kickParticipant", {
      roomCode: normalizedRoomCode,
      participantToken: session.participantToken,
      participantId
    });
  };

  const emitLeaveRoom = () =>
    new Promise<void>((resolve, reject) => {
      const session = getSocketSession(true);

      if (!session) {
        reject(new Error("Room connection is not ready."));
        return;
      }

      emitWithAck(
        (ack) =>
          session.socket.emit("room:leave", {
            roomCode: normalizedRoomCode,
            participantToken: session.participantToken
          }, ack),
        resolve,
        (nextError) => reject(new ApiError(400, nextError.code, nextError.message))
      );
    });

  const availableShortcuts = useMemo<Map<string, VoteValue>>(
    () =>
      new Map<string, VoteValue>(
        (snapshot ? getVoteCardMeta(snapshot.room.votingDeckId) : []).map((card) => [card.shortcut, card.value])
      ),
    [snapshot]
  );

  useRoomShortcuts({
    availableShortcuts,
    emitRoundAction,
    emitVote,
    isRealtimeReady,
    participantToken,
    snapshot
  });

  return {
    snapshot,
    error,
    sessionEndedError,
    isLoading,
    isRealtimeReady,
    castVote: emitVote,
    leaveRoom: emitLeaveRoom,
    revealRound: () => emitRoundAction("round:reveal"),
    unrevealRound: () => emitRoundAction("round:unreveal"),
    resetRound: () => emitRoundAction("round:reset"),
    updateTicket: emitTicketUpdate,
    updateRoomSettings: emitRoomSettingsUpdate,
    kickParticipant: emitKickParticipant
  };
};
