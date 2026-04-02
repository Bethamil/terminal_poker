import cors from "cors";
import express, { type Express } from "express";

import { env } from "./config/env";
import { asAppError } from "./http/errors";
import { createApiRouter } from "./http/routes";
import type { RoomService } from "./services/room-service";

export const createApp = (roomService: RoomService): Express => {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(createApiRouter(roomService));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const appError = asAppError(error);

    response.status(appError.statusCode).json({
      code: appError.code,
      message: appError.message
    });
  });

  return app;
};
