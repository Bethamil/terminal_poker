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
    name: "Planning Alpha",
    jiraBaseUrl: "https://jira.old.example.com",
    votingDeckId: "modified-fibonacci",
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
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        updatedAt: new Date("2026-01-01T10:00:00.000Z")
      },
      {
        id: "part_1",
        roomId: "room_1",
        name: "Bob",
        role: ParticipantRole.PARTICIPANT,
        sessionTokenHash: hashSecret("participant-token"),
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
  }) as unknown as RoomAggregate;

const createFakePrisma = (room: RoomAggregate): PrismaClient => {
  const client = {
    room: {
      findUnique: async () => room,
      delete: async ({ where }: { where: { id: string } }) => {
        if (where.id !== room.id) {
          throw new Error("Room not found.");
        }

        return room;
      },
      update: async ({
        data
      }: {
        data: { jiraBaseUrl?: string | null; votingDeckId?: string; joinPasscodeHash?: string | null };
      }) => {
        if ("jiraBaseUrl" in data) {
          room.jiraBaseUrl = data.jiraBaseUrl ?? null;
        }

        if ("votingDeckId" in data && data.votingDeckId) {
          room.votingDeckId = data.votingDeckId;
        }

        if ("joinPasscodeHash" in data) {
          room.joinPasscodeHash = data.joinPasscodeHash ?? null;
        }

        return room;
      }
    },
    participant: {
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
    round: {
      create: async ({ data }: { data: { roomId: string; jiraTicketKey?: string | null } }) => {
        const round = {
          id: `round_${room.rounds.length + 1}`,
          roomId: data.roomId,
          status: RoundStatus.ACTIVE,
          jiraTicketKey: data.jiraTicketKey ?? null,
          revealedAt: null,
          createdAt: new Date("2026-01-01T10:06:00.000Z"),
          updatedAt: new Date("2026-01-01T10:06:00.000Z"),
          votes: []
        };

        room.rounds.unshift(round as RoomAggregate["rounds"][number]);
        return round;
      },
      update: async ({
        where,
        data
      }: {
        where: { id: string };
        data: { status?: RoundStatus; revealedAt?: Date | null; jiraTicketKey?: string | null };
      }) => {
        const round = room.rounds.find((entry) => entry.id === where.id);

        if (!round) {
          throw new Error("Round not found.");
        }

        if ("status" in data && data.status) {
          round.status = data.status;
        }

        if ("revealedAt" in data) {
          round.revealedAt = data.revealedAt ?? null;
        }

        if ("jiraTicketKey" in data) {
          round.jiraTicketKey = data.jiraTicketKey ?? null;
        }

        return round;
      }
    },
    $transaction: async (callback: (transactionClient: PrismaClient) => Promise<unknown>) =>
      callback(client as unknown as PrismaClient),
    $queryRaw: async () => [{ "?column?": 1 }]
  };

  return client as unknown as PrismaClient;
};

const createService = (room: RoomAggregate) =>
  new RoomService(createFakePrisma(room), { buildIssueUrl: () => null });

describe("RoomService moderator actions", () => {
  it("updates room settings without clearing the passcode when mode is keep", async () => {
    const room = createRoomAggregate();
    const service = createService(room);

    await service.updateRoomSettings("AB123", "moderator-token", {
      jiraBaseUrl: "https://jira.next.example.com/browse",
      votingDeckId: "powers-of-two",
      joinPasscode: null,
      joinPasscodeMode: "keep"
    });

    expect(room.jiraBaseUrl).toBe("https://jira.next.example.com");
    expect(room.votingDeckId).toBe("powers-of-two");
    expect(room.joinPasscodeHash).toBe(hashSecret("secret"));
    expect(room.rounds).toHaveLength(2);
    expect(room.rounds[0].votes).toEqual([]);
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

  it("deletes the room when the moderator leaves", async () => {
    const room = createRoomAggregate();
    const service = createService(room);

    const result = await service.leaveRoom("AB123", "moderator-token");

    expect(result).toEqual({
      participantId: "mod_1",
      participantName: "Alice",
      roomDeleted: true
    });
  });

  it("removes only the participant when a non-host leaves", async () => {
    const room = createRoomAggregate();
    const service = createService(room);

    const result = await service.leaveRoom("AB123", "participant-token");

    expect(result).toEqual({
      participantId: "part_1",
      participantName: "Bob",
      roomDeleted: false
    });
    expect(room.participants.map((participant) => participant.id)).toEqual(["mod_1"]);
  });

  it("rejects votes that are not part of the room deck", async () => {
    const room = createRoomAggregate();
    room.votingDeckId = "tshirt";
    const service = createService(room);

    await expect(service.castVote("AB123", "participant-token", "5")).rejects.toMatchObject({
      code: "INVALID_VOTE"
    } satisfies Partial<AppError>);
  });

  it("unreveals the current round without creating a new one", async () => {
    const room = createRoomAggregate();
    room.rounds[0].status = RoundStatus.REVEALED;
    room.rounds[0].revealedAt = new Date("2026-01-01T10:10:00.000Z");
    room.rounds[0].votes.push({
      id: "vote_1",
      roundId: "round_1",
      participantId: "part_1",
      value: "8",
      createdAt: new Date("2026-01-01T10:09:00.000Z"),
      updatedAt: new Date("2026-01-01T10:09:00.000Z")
    });
    const service = createService(room);

    await service.unrevealRound("AB123", "moderator-token");

    expect(room.rounds).toHaveLength(1);
    expect(room.rounds[0].status).toBe(RoundStatus.ACTIVE);
    expect(room.rounds[0].revealedAt).toBeNull();
    expect(room.rounds[0].votes).toHaveLength(1);
  });
});
