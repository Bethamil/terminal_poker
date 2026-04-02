import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@terminal-poker/shared-types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export const createRoomSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> =>
  io(SOCKET_URL, {
    autoConnect: true,
    transports: ["websocket"]
  });

