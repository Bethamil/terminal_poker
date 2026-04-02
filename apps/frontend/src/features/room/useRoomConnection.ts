import { useEffect, useMemo, useRef, useState } from "react";

import {
  getVoteCardMeta,
  type RoomErrorPayload,
  type RoomSnapshot,
  type UpdateRoomSettingsPayload,
  type VoteValue
} from "@terminal-poker/shared-types";

import { apiClient, ApiError } from "../../lib/api/client";
import { createRoomSocket } from "../../lib/socket/room-socket";

interface UseRoomConnectionResult {
  snapshot: RoomSnapshot | null;
  error: string | null;
  isVoteBlocked: boolean;
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
  ) => void;
  kickParticipant: (participantId: string) => void;
}

export const useRoomConnection = (
  roomCode: string,
  participantToken: string | null
): UseRoomConnectionResult => {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeReady, setIsRealtimeReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVoteBlocked, setIsVoteBlocked] = useState<boolean>(false);
  const [sessionEndedError, setSessionEndedError] = useState<RoomErrorPayload | null>(null);
  const socketRef = useRef<ReturnType<typeof createRoomSocket> | null>(null);

  useEffect(() => {
    if (!participantToken) {
      setSnapshot(null);
      setIsLoading(false);
      setIsRealtimeReady(false);
      setError(null);
      setIsVoteBlocked(false);
      setSessionEndedError(null);
      return;
    }

    let disposed = false;
    setIsLoading(true);
    setError(null);
    setIsVoteBlocked(false);
    setSessionEndedError(null);

    apiClient
      .getRoomState(roomCode, participantToken)
      .then((response) => {
        if (disposed) {
          return;
        }

        setSnapshot(response.snapshot);
        setIsLoading(false);

        const socket = createRoomSocket();
        socketRef.current = socket;

        socket.on("room:snapshot", (nextSnapshot: RoomSnapshot) => {
          setSnapshot(nextSnapshot);
        });

        socket.on("round:updated", (nextSnapshot: RoomSnapshot) => {
          setSnapshot(nextSnapshot);
        });

        socket.on("room:error", (payload: RoomErrorPayload) => {
          if (payload.code === "ROUND_REVEALED") {
            setIsVoteBlocked(true);
            return;
          }

          setError(payload.message);

          if (
            payload.code === "INVALID_SESSION" ||
            payload.code === "KICKED" ||
            payload.code === "LEFT_ROOM" ||
            payload.code === "ROOM_CLOSED"
          ) {
            setSessionEndedError(payload);
          }
        });

        socket.emit(
          "room:joinRealtime",
          {
            roomCode: roomCode.toUpperCase(),
            participantToken
          },
          (result: { ok: true } | { ok: false; error: RoomErrorPayload }) => {
            if (!result.ok) {
              setError(result.error.message);

              if (
                result.error.code === "INVALID_SESSION" ||
                result.error.code === "KICKED" ||
                result.error.code === "LEFT_ROOM" ||
                result.error.code === "ROOM_CLOSED"
              ) {
                setSessionEndedError(result.error);
              }

              return;
            }

            setIsRealtimeReady(true);
          }
        );
      })
      .catch((requestError: unknown) => {
        const message =
          requestError instanceof ApiError ? requestError.message : "Unable to load room state.";
        setError(message);

        if (
          requestError instanceof ApiError &&
          (
            requestError.code === "INVALID_SESSION" ||
            requestError.code === "KICKED" ||
            requestError.code === "ROOM_NOT_FOUND"
          )
        ) {
          setSessionEndedError({
            code: requestError.code === "ROOM_NOT_FOUND" ? "ROOM_CLOSED" : requestError.code,
            message: requestError.code === "ROOM_NOT_FOUND" ? "This room no longer exists." : message
          });
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
  }, [participantToken, roomCode]);

  useEffect(() => {
    if (snapshot?.round.status !== "revealed") {
      setIsVoteBlocked(false);
    }
  }, [snapshot?.round.status]);

  const emitVote = (value: VoteValue) => {
    const socket = socketRef.current;

    if (!socket || !participantToken) {
      return;
    }

    if (snapshot?.round.status === "revealed") {
      setIsVoteBlocked(true);
      return;
    }

    setIsVoteBlocked(false);

    socket.emit("vote:cast", {
      roomCode: roomCode.toUpperCase(),
      participantToken,
      value
    });
  };

  const emitRoundAction = (eventName: "round:reveal" | "round:unreveal" | "round:reset") => {
    const socket = socketRef.current;

    if (!socket || !participantToken) {
      return;
    }

    socket.emit(eventName, {
      roomCode: roomCode.toUpperCase(),
      participantToken
    });
  };

  const emitTicketUpdate = (jiraTicketKey: string | null) => {
    const socket = socketRef.current;

    if (!socket || !participantToken) {
      return;
    }

    socket.emit("round:setTicket", {
      roomCode: roomCode.toUpperCase(),
      participantToken,
      jiraTicketKey
    });
  };

  const emitRoomSettingsUpdate = (
    payload: Pick<UpdateRoomSettingsPayload, "jiraBaseUrl" | "votingDeckId" | "joinPasscode" | "joinPasscodeMode">
  ) => {
    const socket = socketRef.current;

    if (!socket || !participantToken) {
      return;
    }

    socket.emit("room:updateSettings", {
      roomCode: roomCode.toUpperCase(),
      participantToken,
      ...payload
    });
  };

  const emitKickParticipant = (participantId: string) => {
    const socket = socketRef.current;

    if (!socket || !participantToken) {
      return;
    }

    socket.emit("room:kickParticipant", {
      roomCode: roomCode.toUpperCase(),
      participantToken,
      participantId
    });
  };

  const emitLeaveRoom = () =>
    new Promise<void>((resolve, reject) => {
      const socket = socketRef.current;

      if (!socket || !participantToken) {
        reject(new Error("Room connection is not ready."));
        return;
      }

      socket.emit(
        "room:leave",
        {
          roomCode: roomCode.toUpperCase(),
          participantToken
        },
        (result: { ok: true } | { ok: false; error: RoomErrorPayload }) => {
          if (!result.ok) {
            reject(new ApiError(400, result.error.code, result.error.message));
            return;
          }

          resolve();
        }
      );
    });

  const availableShortcuts = useMemo<Map<string, VoteValue>>(
    () =>
      new Map<string, VoteValue>(
        (snapshot ? getVoteCardMeta(snapshot.room.votingDeckId) : []).map((card) => [card.shortcut, card.value])
      ),
    [snapshot]
  );

  useEffect(() => {
    if (!snapshot || !participantToken) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const hasModifierKey = event.metaKey || event.ctrlKey || event.altKey;

      if (isTypingContext || hasModifierKey) {
        return;
      }

      const normalizedKey = event.key.toLowerCase();
      const vote = availableShortcuts.get(normalizedKey);

      if (vote) {
        event.preventDefault();
        emitVote(vote);
      }

      if (snapshot.viewer.role === "moderator" && normalizedKey === "r") {
        event.preventDefault();
        emitRoundAction(snapshot.round.status === "revealed" ? "round:unreveal" : "round:reveal");
      }

      if (snapshot.viewer.role === "moderator" && normalizedKey === "n") {
        event.preventDefault();
        emitRoundAction("round:reset");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [availableShortcuts, participantToken, snapshot]);

  return {
    snapshot,
    error,
    isVoteBlocked,
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
