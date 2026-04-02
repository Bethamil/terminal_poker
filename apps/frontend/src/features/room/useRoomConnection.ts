import { useEffect, useMemo, useRef, useState } from "react";

import {
  VOTE_CARD_META,
  type RoomErrorPayload,
  type RoomSnapshot,
  type VoteValue
} from "@terminal-poker/shared-types";

import { apiClient, ApiError } from "../../lib/api/client";
import { createRoomSocket } from "../../lib/socket/room-socket";

interface UseRoomConnectionResult {
  snapshot: RoomSnapshot | null;
  error: string | null;
  isLoading: boolean;
  isRealtimeReady: boolean;
  castVote: (value: VoteValue) => void;
  revealRound: () => void;
  resetRound: () => void;
  updateTicket: (jiraTicketKey: string | null) => void;
}

export const useRoomConnection = (
  roomCode: string,
  participantToken: string | null
): UseRoomConnectionResult => {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeReady, setIsRealtimeReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof createRoomSocket> | null>(null);

  useEffect(() => {
    if (!participantToken) {
      setSnapshot(null);
      setIsLoading(false);
      setIsRealtimeReady(false);
      setError(null);
      return;
    }

    let disposed = false;
    setIsLoading(true);
    setError(null);

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

  const sendIfReady = <T extends VoteValue | string | null>(
    eventName: "vote:cast" | "round:setTicket" | "round:reveal" | "round:reset",
    payload?: T
  ) => {
    const socket = socketRef.current;

    if (!socket || !participantToken) {
      return;
    }

    if (eventName === "vote:cast" && payload) {
      socket.emit("vote:cast", {
        roomCode: roomCode.toUpperCase(),
        participantToken,
        value: payload as VoteValue
      });
    }

    if (eventName === "round:setTicket") {
      socket.emit("round:setTicket", {
        roomCode: roomCode.toUpperCase(),
        participantToken,
        jiraTicketKey: payload as string | null
      });
    }

    if (eventName === "round:reveal") {
      socket.emit("round:reveal", {
        roomCode: roomCode.toUpperCase(),
        participantToken
      });
    }

    if (eventName === "round:reset") {
      socket.emit("round:reset", {
        roomCode: roomCode.toUpperCase(),
        participantToken
      });
    }
  };

  const availableShortcuts = useMemo(() => new Map(VOTE_CARD_META.map((card) => [card.shortcut, card.value])), []);

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
        sendIfReady("vote:cast", vote);
      }

      if (snapshot.viewer.role === "moderator" && normalizedKey === "r") {
        event.preventDefault();
        sendIfReady("round:reveal");
      }

      if (snapshot.viewer.role === "moderator" && normalizedKey === "n") {
        event.preventDefault();
        sendIfReady("round:reset");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [availableShortcuts, participantToken, snapshot]);

  return {
    snapshot,
    error,
    isLoading,
    isRealtimeReady,
    castVote: (value) => sendIfReady("vote:cast", value),
    revealRound: () => sendIfReady("round:reveal"),
    resetRound: () => sendIfReady("round:reset"),
    updateTicket: (jiraTicketKey) => sendIfReady("round:setTicket", jiraTicketKey)
  };
};
