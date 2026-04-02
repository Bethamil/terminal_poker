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
  sessionEndedError: RoomErrorPayload | null;
  isLoading: boolean;
  isRealtimeReady: boolean;
  castVote: (value: VoteValue) => void;
  revealRound: () => void;
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
  const [sessionEndedError, setSessionEndedError] = useState<RoomErrorPayload | null>(null);
  const socketRef = useRef<ReturnType<typeof createRoomSocket> | null>(null);

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
          setError(payload.message);

          if (payload.code === "INVALID_SESSION" || payload.code === "KICKED") {
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

              if (result.error.code === "INVALID_SESSION" || result.error.code === "KICKED") {
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
          (requestError.code === "INVALID_SESSION" || requestError.code === "KICKED")
        ) {
          setSessionEndedError({
            code: requestError.code,
            message
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
    if (!participantToken || !isRealtimeReady || !socketRef.current) {
      return;
    }

    const socket = socketRef.current;
    const timer = window.setInterval(() => {
      socket.emit("presence:heartbeat", {
        roomCode: roomCode.toUpperCase(),
        participantToken
      });
    }, 10_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isRealtimeReady, participantToken, roomCode]);

  const emitVote = (value: VoteValue) => {
    const socket = socketRef.current;

    if (!socket || !participantToken) {
      return;
    }

    socket.emit("vote:cast", {
      roomCode: roomCode.toUpperCase(),
      participantToken,
      value
    });
  };

  const emitRoundAction = (eventName: "round:reveal" | "round:reset") => {
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

      if (isTypingContext) {
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
        emitRoundAction("round:reveal");
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
    sessionEndedError,
    isLoading,
    isRealtimeReady,
    castVote: emitVote,
    revealRound: () => emitRoundAction("round:reveal"),
    resetRound: () => emitRoundAction("round:reset"),
    updateTicket: emitTicketUpdate,
    updateRoomSettings: emitRoomSettingsUpdate,
    kickParticipant: emitKickParticipant
  };
};
