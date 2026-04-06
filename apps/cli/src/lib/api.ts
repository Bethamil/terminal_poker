import type {
  CreateRoomRequest,
  JoinRoomRequest,
  RoomSessionResponse,
  RoomStateResponse,
} from "@terminal-poker/shared-types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError(
      res.status,
      body?.code ?? "REQUEST_FAILED",
      body?.message ?? "Request failed.",
    );
  }

  return (await res.json()) as T;
}

export function createApiClient(baseUrl: string) {
  return {
    createRoom(payload: CreateRoomRequest) {
      return request<RoomSessionResponse>(baseUrl, "/api/rooms", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    joinRoom(roomCode: string, payload: JoinRoomRequest) {
      return request<RoomSessionResponse>(
        baseUrl,
        `/api/rooms/${roomCode}/join`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },

    leaveRoom(roomCode: string, participantToken: string) {
      return request<{
        participantId: string;
        participantName: string;
        roomDeleted: boolean;
      }>(baseUrl, `/api/rooms/${roomCode}/leave`, {
        method: "POST",
        headers: { "x-participant-token": participantToken },
      });
    },

    getRoomState(roomCode: string, participantToken: string) {
      return request<RoomStateResponse>(
        baseUrl,
        `/api/rooms/${roomCode}/state`,
        {
          headers: { "x-participant-token": participantToken },
        },
      );
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
