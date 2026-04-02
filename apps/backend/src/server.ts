import { createServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@terminal-poker/shared-types";

import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./prisma/client";
import { registerRoomHandlers } from "./sockets/register-room-handlers";
import { JiraRoomLinkProvider } from "./services/jira-provider";
import { RoomService } from "./services/room-service";

const bootstrap = async () => {
  const roomService = new RoomService(prisma, new JiraRoomLinkProvider(), env.PRESENCE_TTL_SECONDS);
  const app = createApp(roomService);
  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true
    }
  });

  if (env.REDIS_URL) {
    const publisher = createClient({ url: env.REDIS_URL });
    const subscriber = publisher.duplicate();

    await publisher.connect();
    await subscriber.connect();
    io.adapter(createAdapter(publisher, subscriber));
  }

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket, roomService);
  });

  httpServer.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`backend listening on http://localhost:${env.PORT}`);
  });
};

bootstrap().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

