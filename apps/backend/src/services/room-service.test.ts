import { ParticipantRole, RoundStatus, type PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { AppError } from "../http/errors";
import { hashSecret } from "./security";
import { RoomService } from "./room-service";
import type { RoomAggregate } from "./room-snapshot";

const createRoomAggregate = (): RoomAggregate =>
  ({
    id: "room_1",
    code: "AB123",
    jiraBaseUrl: "https://jira.old.example.com",
    joinPasscodeHash: hashSecret("secret"),
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: new Date("2026-01-01T10:00:00.000Z"),
    participants: [
      {
        id: "mod_1",
        roomId: "room_1",
        name: "Alice",
        role: ParticipantRole.MODERATOR,
        sessionTokenHash: hashSecret("moderator-token"),
        lastSeenAt: new Date("2026-01-01T10:00:00.000Z"),
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        updatedAt: new Date("2026-01-01T10:00:00.000Z")
      },
      {
        id: "part_1",
        roomId: "room_1",
        name: "Bob",
        role: ParticipantRole.PARTICIPANT,
        sessionTokenHash: hashSecret("participant-token"),
        lastSeenAt: new Date("2026-01-01T10:00:00.000Z"),
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        updatedAt: new Date("2026-01-01T10:00:00.000Z")
      }
    ],
    rounds: [
      {
        id: "round_1",
        roomId: "room_1",
        status: RoundStatus.ACTIVE,
        jiraTicketKey: "PROJ-1",
        revealedAt: null,
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        updatedAt: new Date("2026-01-01T10:00:00.000Z"),
        votes: []
      }
    ]
  }) as RoomAggregate;

const createFakePrisma = (room: RoomAggregate): PrismaClient => {
  const client = {
    room: {
      findUnique: async () => room,
      update: async ({
        data
      }: {
        data: { jiraBaseUrl?: string | null; joinPasscodeHash?: string | null };
      }) => {
        if ("jiraBaseUrl" in data) {
          room.jiraBaseUrl = data.jiraBaseUrl ?? null;
        }

        if ("joinPasscodeHash" in data) {
          room.joinPasscodeHash = data.joinPasscodeHash ?? null;
        }

        return room;
      }
    },
    participant: {
      update: async ({ where }: { where: { id: string } }) => {
        const participant = room.participants.find((entry) => entry.id === where.id);

        if (!participant) {
          throw new Error("Participant not found.");
        }

        participant.lastSeenAt = new Date("2026-01-01T10:05:00.000Z");
        return participant;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const participantIndex = room.participants.findIndex((entry) => entry.id === where.id);

        if (participantIndex === -1) {
          throw new Error("Participant not found.");
        }

        const [participant] = room.participants.splice(participantIndex, 1);
        room.rounds[0].votes = room.rounds[0].votes.filter((vote) => vote.participantId !== where.id);
        return participant;
      }
    },
    $transaction: async (callback: (transactionClient: PrismaClient) => Promise<unknown>) =>
      callback(client as unknown as PrismaClient),
    $queryRaw: async () => [{ "?column?": 1 }]
  };

  return client as unknown as PrismaClient;
};

const createService = (room: RoomAggregate) =>
  new RoomService(createFakePrisma(room), { buildIssueUrl: () => null }, 30);

describe("RoomService moderator actions", () => {
  it("updates room settings without clearing the passcode when mode is keep", async () => {
    const room = createRoomAggregate();
    const service = createService(room);

    await service.updateRoomSettings("AB123", "moderator-token", {
      jiraBaseUrl: "https://jira.next.example.com/browse",
      joinPasscode: null,
      joinPasscodeMode: "keep"
    });

    expect(room.jiraBaseUrl).toBe("https://jira.next.example.com");
    expect(room.joinPasscodeHash).toBe(hashSecret("secret"));
  });

  it("kicks a participant and blocks moderators from kicking themselves", async () => {
    const room = createRoomAggregate();
    const service = createService(room);

    const result = await service.kickParticipant("AB123", "moderator-token", "part_1");

    expect(result).toEqual({
      participantId: "part_1",
      participantName: "Bob"
    });
    expect(room.participants.map((participant) => participant.id)).toEqual(["mod_1"]);

    await expect(service.kickParticipant("AB123", "moderator-token", "mod_1")).rejects.toMatchObject({
      code: "CANNOT_KICK_SELF"
    } satisfies Partial<AppError>);
  });
});
