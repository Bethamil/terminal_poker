import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { VOTING_DECK_IDS } from "@terminal-poker/shared-types";

import type { RoomService } from "../services/room-service";
import { createRoomLimiter } from "./rate-limit";

const createRoomSchema = z.object({
  name: z.string(),
  roomName: z.string(),
  jiraBaseUrl: z.string().optional().nullable(),
  joinPasscode: z.string().optional().nullable(),
  votingDeckId: z.enum(VOTING_DECK_IDS).optional()
});

const joinRoomSchema = z.object({
  name: z.string(),
  joinPasscode: z.string().optional().nullable()
});

export const createApiRouter = (roomService: RoomService): ExpressRouter => {
  const router = Router();

  router.get("/healthz", (_request, response) => {
    response.json({ ok: true });
  });

  router.get("/readyz", async (_request, response, next) => {
    try {
      await roomService.checkReadiness();
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/rooms", createRoomLimiter, async (request, response, next) => {
    try {
      const payload = createRoomSchema.parse(request.body);
      const result = await roomService.createRoom(payload);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/rooms/:code/join", async (request, response, next) => {
    try {
      const payload = joinRoomSchema.parse(request.body);
      const result = await roomService.joinRoom(request.params.code, payload);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/rooms/:code/leave", async (request, response, next) => {
    try {
      const participantToken = request.header("x-participant-token");

      if (!participantToken) {
        response.status(401).json({
          code: "MISSING_SESSION",
          message: "Missing participant token."
        });
        return;
      }

      const result = await roomService.leaveRoom(request.params.code, participantToken);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/rooms/:code/state", async (request, response, next) => {
    try {
      const participantToken = request.header("x-participant-token");

      if (!participantToken) {
        response.status(401).json({
          code: "MISSING_SESSION",
          message: "Missing participant token."
        });
        return;
      }

      const result = await roomService.getRoomState(request.params.code, participantToken);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
