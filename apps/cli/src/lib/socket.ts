import {
  io,
  type Socket,
} from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@terminal-poker/shared-types";

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createRoomSocket(serverUrl: string): RoomSocket {
  return io(serverUrl, {
    autoConnect: false,
    transports: ["polling", "websocket"],
  });
}
