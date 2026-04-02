import type {
  CreateRoomRequest,
  JoinRoomRequest,
  RoomSessionResponse,
  RoomStateResponse
} from "@terminal-poker/shared-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface ApiErrorShape {
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorShape | null;
    throw new ApiError(response.status, body?.code ?? "REQUEST_FAILED", body?.message ?? "Request failed.");
  }

  return (await response.json()) as T;
};

export const apiClient = {
  createRoom(payload: CreateRoomRequest) {
    return request<RoomSessionResponse>("/api/rooms", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  joinRoom(roomCode: string, payload: JoinRoomRequest) {
    return request<RoomSessionResponse>(`/api/rooms/${roomCode}/join`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  getRoomState(roomCode: string, participantToken: string) {
    return request<RoomStateResponse>(`/api/rooms/${roomCode}/state`, {
      headers: {
        "x-participant-token": participantToken
      }
    });
  }
};

