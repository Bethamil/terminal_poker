import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@terminal-poker/shared-types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_BASE_URL;

const createSocketOptions = (): Partial<ManagerOptions & SocketOptions> => ({
  autoConnect: true,
  transports: ["polling", "websocket"]
});

export const createRoomSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> =>
  SOCKET_URL ? io(SOCKET_URL, createSocketOptions()) : io(createSocketOptions());
