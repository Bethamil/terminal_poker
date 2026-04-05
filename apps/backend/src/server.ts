import { createServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@terminal-poker/shared-types";

import { createApp } from "./app";
import { getEnv } from "./config/env";
import { createPrismaClient } from "./prisma/client";
import { closeSocketIoRedisClients, createSocketIoRedisClients } from "./redis/socket-adapter";
import { registerRoomHandlers } from "./sockets/register-room-handlers";
import { JiraRoomLinkProvider } from "./services/jira-provider";
import { RoomService } from "./services/room-service";

const env = getEnv();
const prisma = createPrismaClient(env);
let redisClients: Awaited<ReturnType<typeof createSocketIoRedisClients>> = null;

const bootstrap = async () => {
  const roomService = new RoomService(prisma, new JiraRoomLinkProvider());
  const app = createApp(roomService, env);
  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true
    }
  });

  redisClients = await createSocketIoRedisClients(env);

  if (redisClients) {
    io.adapter(createAdapter(redisClients.pubClient, redisClients.subClient));
  }

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket, roomService);
  });

  httpServer.listen(env.PORT, "0.0.0.0", () => {
    // eslint-disable-next-line no-console
    console.log(`socket adapter mode: ${env.REDIS_MODE}`);
    // eslint-disable-next-line no-console
    console.log(`backend listening on http://0.0.0.0:${env.PORT}`);
  });
};

bootstrap().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  closeSocketIoRedisClients(redisClients);
  await prisma.$disconnect();
  process.exit(1);
});
