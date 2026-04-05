import { getEnv } from "../config/env";
import { logger } from "../lib/logger";
import { createPrismaClient } from "../prisma/client";
import { RoomRepository } from "../repositories/room-repository";

const env = getEnv();
const prisma = createPrismaClient(env);

const run = async () => {
  const cutoff = new Date(Date.now() - env.ROOM_INACTIVITY_TTL_HOURS * 60 * 60 * 1000);
  const repository = new RoomRepository(prisma);
  const result = await repository.removeExpiredRooms(cutoff);

  logger.info(
    `cleanup-expired-rooms removed ${result.count} rooms inactive since before ${cutoff.toISOString()}`
  );
};

run()
  .catch(async (error) => {
    logger.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
