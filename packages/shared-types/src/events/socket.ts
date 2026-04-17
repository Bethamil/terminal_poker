import type { RoomSnapshot } from "../domain/room";
import type { VoteValue, VotingDeckId } from "../domain/votes";

export interface RoomJoinRealtimePayload {
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

export type JoinPasscodeMode = "keep" | "clear" | "set";

export interface UpdateRoomSettingsPayload {
  roomCode: string;
  participantToken: string;
  jiraBaseUrl: string | null;
  votingDeckId: VotingDeckId;
  joinPasscode: string | null;
  joinPasscodeMode: JoinPasscodeMode;
  hostVotes: boolean;
}

export interface KickParticipantPayload {
  roomCode: string;
  participantToken: string;
  participantId: string;
}

export interface ChangeParticipantRolePayload {
  roomCode: string;
  participantToken: string;
  participantId: string;
  newRole: "moderator" | "participant" | "observer";
}

export interface LeaveRoomPayload {
  roomCode: string;
  participantToken: string;
}

export interface RoundActionPayload {
  roomCode: string;
  participantToken: string;
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
  "vote:status": (payload: VoteStatusPayload) => void;
  "round:updated": (snapshot: RoomSnapshot) => void;
  "room:error": (payload: RoomErrorPayload) => void;
}

export interface ClientToServerEvents {
  "room:joinRealtime": (
    payload: RoomJoinRealtimePayload,
    ack?: (result: { ok: true } | { ok: false; error: RoomErrorPayload }) => void
  ) => void;
  "room:leave": (
    payload: LeaveRoomPayload,
    ack?: (result: { ok: true } | { ok: false; error: RoomErrorPayload }) => void
  ) => void;
  "room:updateSettings": (
    payload: UpdateRoomSettingsPayload,
    ack?: (result: { ok: true } | { ok: false; error: RoomErrorPayload }) => void
  ) => void;
  "room:kickParticipant": (payload: KickParticipantPayload) => void;
  "room:changeParticipantRole": (
    payload: ChangeParticipantRolePayload,
    ack?: (result: { ok: true } | { ok: false; error: RoomErrorPayload }) => void
  ) => void;
  "vote:cast": (payload: CastVotePayload) => void;
  "round:setTicket": (payload: SetTicketPayload) => void;
  "round:reveal": (payload: RoundActionPayload) => void;
  "round:unreveal": (payload: RoundActionPayload) => void;
  "round:reset": (payload: RoundActionPayload) => void;
}
