import type { RoomSnapshot } from "../domain/room";
import type { VoteValue } from "../domain/votes";

export interface RoomJoinRealtimePayload {
  roomCode: string;
  participantToken: string;
}

export interface PresenceHeartbeatPayload {
  roomCode: string;
  participantToken: string;
}

export interface CastVotePayload {
  roomCode: string;
  participantToken: string;
  value: VoteValue;
}

export interface SetTicketPayload {
  roomCode: string;
  participantToken: string;
  jiraTicketKey: string | null;
}

export interface RoundActionPayload {
  roomCode: string;
  participantToken: string;
}

export interface PresenceUpdatePayload {
  participantId: string;
  presence: "online" | "away";
  lastSeenAt: string;
}

export interface VoteStatusPayload {
  participantId: string;
  hasVoted: boolean;
}

export interface RoomErrorPayload {
  code: string;
  message: string;
}

export interface ServerToClientEvents {
  "room:snapshot": (snapshot: RoomSnapshot) => void;
  "presence:update": (payload: PresenceUpdatePayload) => void;
  "vote:status": (payload: VoteStatusPayload) => void;
  "round:updated": (snapshot: RoomSnapshot) => void;
  "room:error": (payload: RoomErrorPayload) => void;
}

export interface ClientToServerEvents {
  "room:joinRealtime": (
    payload: RoomJoinRealtimePayload,
    ack?: (result: { ok: true } | { ok: false; error: RoomErrorPayload }) => void
  ) => void;
  "presence:heartbeat": (payload: PresenceHeartbeatPayload) => void;
  "vote:cast": (payload: CastVotePayload) => void;
  "round:setTicket": (payload: SetTicketPayload) => void;
  "round:reveal": (payload: RoundActionPayload) => void;
  "round:reset": (payload: RoundActionPayload) => void;
}

