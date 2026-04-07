import { existsSync } from "node:fs";
import path from "node:path";

import cors from "cors";
import express, { type Express } from "express";
import pinoHttp from "pino-http";

import type { Env } from "./config/env";
import { asAppError } from "./http/errors";
import { createApiRouter } from "./http/routes";
import { logger } from "./lib/logger";
import type { RoomService } from "./services/room-service";

const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");

const isBackendRoute = (pathname: string) =>
  pathname === "/healthz" ||
  pathname === "/readyz" ||
  pathname === "/api" ||
  pathname.startsWith("/api/") ||
  pathname === "/socket.io" ||
  pathname.startsWith("/socket.io/");

export const createApp = (roomService: RoomService, env: Env): Express => {
  const app = express();

  app.use(pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => {
        const url = (req as express.Request).originalUrl ?? req.url ?? "";
        return url.startsWith("/socket.io") || url === "/healthz" || url === "/readyz";
      }
    }
  }));
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(createApiRouter(roomService));

  if (existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistPath));

    app.get("*", (request, response, next) => {
      if (isBackendRoute(request.path)) {
        next();
        return;
      }

      response.sendFile(frontendIndexPath, (error) => {
        if (error) {
          next(error);
        }
      });
    });
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const appError = asAppError(error);

    if (appError.statusCode >= 500) {
      logger.error({ err: error }, appError.message);
    }

    response.status(appError.statusCode).json({
      code: appError.code,
      message: appError.message
    });
  });

  return app;
};
