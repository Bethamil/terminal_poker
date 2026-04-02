import type { RoomSnapshot } from "../domain/room";

export interface CreateRoomRequest {
  name: string;
  jiraBaseUrl?: string | null;
  joinPasscode?: string | null;
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

