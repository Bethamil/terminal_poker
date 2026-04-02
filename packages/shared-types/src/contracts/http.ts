import type { RoomSnapshot } from "../domain/room";
import type { VotingDeckId } from "../domain/votes";

export interface CreateRoomRequest {
  name: string;
  roomName: string;
  jiraBaseUrl?: string | null;
  joinPasscode?: string | null;
  votingDeckId?: VotingDeckId;
}

export interface JoinRoomRequest {
  name: string;
  joinPasscode?: string | null;
}

export interface RoomSessionResponse {
  roomCode: string;
  participantToken: string;
  snapshot: RoomSnapshot;
}

export interface RoomStateResponse {
  snapshot: RoomSnapshot;
}
