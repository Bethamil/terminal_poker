import { useState, useCallback, useRef, useEffect } from "react";
import type {
  JoinPasscodeMode,
  ParticipantRole,
  RoomSnapshot,
  VoteValue,
  VotingDeckId,
} from "@terminal-poker/shared-types";
import { createRoomSocket } from "../lib/socket.js";

export type ConnectionStatus = "connecting" | "sync" | "live" | "disconnected";

export interface RoomSession {
  roomCode: string;
  participantToken: string;
  serverUrl: string;
}

interface UseRoomConnectionOptions {
  log: (text: string, color?: string) => void;
  onNewRound: () => void;
  onSessionEnded: () => void;
}

export function useRoomConnection({ log, onNewRound, onSessionEnded }: UseRoomConnectionOptions) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const socketRef = useRef<ReturnType<typeof createRoomSocket> | null>(null);
  const roundIdRef = useRef<string | null>(null);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnectionStatus("disconnected");
    setSnapshot(null);
    setSession(null);
  }, []);

  const connectToRoom = useCallback(
    (roomCode: string, participantToken: string, serverUrl: string, snap: RoomSnapshot) => {
      socketRef.current?.disconnect();

      setSnapshot(snap);
      setSession({ roomCode, participantToken, serverUrl });
      setConnectionStatus("connecting");
      roundIdRef.current = snap.round.id;

      const socket = createRoomSocket(serverUrl);
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnectionStatus("sync");
        socket.emit(
          "room:joinRealtime",
          { roomCode, participantToken },
          (result) => {
            if (result && "ok" in result && result.ok) {
              setConnectionStatus("live");
            } else {
              const err = result && "error" in result ? result.error : null;
              log(`Failed to join realtime: ${err?.message ?? "unknown"}`, "red");
            }
          },
        );
      });

      socket.on("disconnect", () => {
        setConnectionStatus("disconnected");
        log("Disconnected", "yellow");
      });

      socket.on("room:snapshot", (newSnapshot) => {
        if (roundIdRef.current && roundIdRef.current !== newSnapshot.round.id) {
          onNewRound();
        }
        roundIdRef.current = newSnapshot.round.id;
        setSnapshot(newSnapshot);
      });

      socket.on("vote:status", (payload) => {
        setSnapshot((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.id === payload.participantId
                ? { ...p, hasVoted: payload.hasVoted }
                : p,
            ),
          };
        });
      });

      socket.on("room:error", (payload) => {
        log(`Error: ${payload.message}`, "red");
        if (
          payload.code === "ROOM_CLOSED" ||
          payload.code === "KICKED" ||
          payload.code === "INVALID_SESSION"
        ) {
          disconnect();
          onSessionEnded();
          log("Session ended. Returning home.", "yellow");
        }
      });

      socket.connect();
    },
    [log, onNewRound, onSessionEnded, disconnect],
  );

  const vote = useCallback((value: VoteValue) => {
    if (!session) return;
    socketRef.current?.emit("vote:cast", {
      roomCode: session.roomCode,
      participantToken: session.participantToken,
      value,
    });
    setSnapshot((prev) => prev ? {
      ...prev,
      viewer: { ...prev.viewer, selectedVote: value },
    } : prev);
  }, [session]);

  const reveal = useCallback(() => {
    if (!session) return;
    socketRef.current?.emit("round:reveal", {
      roomCode: session.roomCode,
      participantToken: session.participantToken,
    });
  }, [session]);

  const unreveal = useCallback(() => {
    if (!session) return;
    socketRef.current?.emit("round:unreveal", {
      roomCode: session.roomCode,
      participantToken: session.participantToken,
    });
  }, [session]);

  const reset = useCallback(() => {
    if (!session) return;
    socketRef.current?.emit("round:reset", {
      roomCode: session.roomCode,
      participantToken: session.participantToken,
    });
  }, [session]);

  const setTicket = useCallback((key: string | null) => {
    if (!session) return;
    socketRef.current?.emit("round:setTicket", {
      roomCode: session.roomCode,
      participantToken: session.participantToken,
      jiraTicketKey: key,
    });
  }, [session]);

  const updateSettings = useCallback((settings: {
    jiraBaseUrl?: string | null;
    votingDeckId?: VotingDeckId;
    joinPasscode?: string | null;
    joinPasscodeMode?: JoinPasscodeMode;
    hostVotes?: boolean;
  }) => {
    if (!session || !snapshot) return;
    socketRef.current?.emit("room:updateSettings", {
      roomCode: session.roomCode,
      participantToken: session.participantToken,
      jiraBaseUrl: settings.jiraBaseUrl !== undefined ? settings.jiraBaseUrl : snapshot.room.jiraBaseUrl,
      votingDeckId: settings.votingDeckId ?? snapshot.room.votingDeckId,
      joinPasscode: settings.joinPasscode ?? null,
      joinPasscodeMode: settings.joinPasscodeMode ?? "keep",
      hostVotes: settings.hostVotes ?? snapshot.room.hostVotes,
    });
  }, [session, snapshot]);

  const kickParticipant = useCallback((participantId: string) => {
    if (!session) return;
    socketRef.current?.emit("room:kickParticipant", {
      roomCode: session.roomCode,
      participantToken: session.participantToken,
      participantId,
    });
  }, [session]);

  const changeParticipantRole = useCallback(
    (participantId: string, newRole: ParticipantRole) =>
      new Promise<void>((resolve, reject) => {
        if (!session) {
          reject(new Error("Room connection is not ready."));
          return;
        }

        let settled = false;
        const timeoutId = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error("Unable to change participant role right now."));
        }, 4000);

        socketRef.current?.emit(
          "room:changeParticipantRole",
          {
            roomCode: session.roomCode,
            participantToken: session.participantToken,
            participantId,
            newRole,
          },
          (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            if (result && "ok" in result && result.ok) {
              resolve();
              return;
            }
            reject(new Error(result?.error.message ?? "Unable to change participant role."));
          },
        );
      }),
    [session],
  );

  return {
    snapshot,
    session,
    connectionStatus,
    connectToRoom,
    disconnect,
    vote,
    reveal,
    unreveal,
    reset,
    setTicket,
    updateSettings,
    kickParticipant,
    changeParticipantRole,
  };
}
