import { ParticipantRole, RoundStatus, type PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { AppError } from "../http/errors";
import { hashPasscode, hashSessionToken, verifyPasscode } from "./security";
import { RoomService } from "./room-service";
import type { RoomAggregate } from "./room-snapshot";

const createRoomAggregate = (): RoomAggregate =>
  ({
    id: "room_1",
    code: "AB123",
    name: "Planning Alpha",
    jiraBaseUrl: "https://jira.old.example.com",
    votingDeckId: "modified-fibonacci",
    joinPasscodeHash: hashPasscode("secret"),
    lastActivityAt: new Date("2026-01-01T10:00:00.000Z"),
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: new Date("2026-01-01T10:00:00.000Z"),
    participants: [
      {
        id: "mod_1",
        roomId: "room_1",
        name: "Alice",
        role: ParticipantRole.MODERATOR,
        sessionTokenHash: hashSessionToken("moderator-token"),
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        updatedAt: new Date("2026-01-01T10:00:00.000Z")
      },
      {
        id: "part_1",
        roomId: "room_1",
        name: "Bob",
        role: ParticipantRole.PARTICIPANT,
        sessionTokenHash: hashSessionToken("participant-token"),
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
        data: {
          jiraBaseUrl?: string | null;
          votingDeckId?: string;
          joinPasscodeHash?: string | null;
          lastActivityAt?: Date;
        };
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

        if ("lastActivityAt" in data && data.lastActivityAt) {
          room.lastActivityAt = data.lastActivityAt;
        }

        return room;
      }
    },
    participant: {
      create: async ({
        data
      }: {
        data: { roomId: string; name: string; role: ParticipantRole; sessionTokenHash: string };
      }) => {
        const participant = {
          id: `part_${room.participants.length + 1}`,
          roomId: data.roomId,
          name: data.name,
          role: data.role,
          sessionTokenHash: data.sessionTokenHash,
          createdAt: new Date("2026-01-01T10:05:00.000Z"),
          updatedAt: new Date("2026-01-01T10:05:00.000Z")
        };

        room.participants.push(participant as RoomAggregate["participants"][number]);
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
    vote: {
      upsert: async ({
        where,
        create,
        update
      }: {
        where: { roundId_participantId: { roundId: string; participantId: string } };
        create: { roundId: string; participantId: string; value: string };
        update: { value: string };
      }) => {
        const round = room.rounds.find((entry) => entry.id === where.roundId_participantId.roundId);

        if (!round) {
          throw new Error("Round not found.");
        }

        const vote = round.votes.find((entry) => entry.participantId === where.roundId_participantId.participantId);

        if (vote) {
          vote.value = update.value;
          vote.updatedAt = new Date("2026-01-01T10:08:00.000Z");
          return vote;
        }

        const nextVote = {
          id: `vote_${round.votes.length + 1}`,
          roundId: create.roundId,
          participantId: create.participantId,
          value: create.value,
          createdAt: new Date("2026-01-01T10:08:00.000Z"),
          updatedAt: new Date("2026-01-01T10:08:00.000Z")
        };

        round.votes.push(nextVote);
        return nextVote;
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
    expect(verifyPasscode("secret", room.joinPasscodeHash)).toBe(true);
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

  it("touches room activity when a participant joins, votes, and resets", async () => {
    const room = createRoomAggregate();
    const service = createService(room);
    const beforeJoin = room.lastActivityAt;

    await service.joinRoom("AB123", { name: "Charlie", joinPasscode: "secret" });
    expect(room.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeJoin.getTime());

    const afterJoin = room.lastActivityAt;
    await service.castVote("AB123", "participant-token", "5");
    expect(room.lastActivityAt.getTime()).toBeGreaterThanOrEqual(afterJoin.getTime());

    const afterVote = room.lastActivityAt;
    await service.resetRound("AB123", "moderator-token");
    expect(room.lastActivityAt.getTime()).toBeGreaterThanOrEqual(afterVote.getTime());
  });

  it("does not create duplicate empty rounds when reset is spammed", async () => {
    const room = createRoomAggregate();
    const service = createService(room);

    await service.resetRound("AB123", "moderator-token");
    expect(room.rounds).toHaveLength(2);

    await service.resetRound("AB123", "moderator-token");
    expect(room.rounds).toHaveLength(2);
    expect(room.rounds[0]).toMatchObject({
      jiraTicketKey: null,
      status: RoundStatus.ACTIVE,
      votes: []
    });
  });

  it("touches room activity for moderator mutations and participant removal", async () => {
    const room = createRoomAggregate();
    const service = createService(room);

    const beforeSettings = room.lastActivityAt;
    await service.updateRoomSettings("AB123", "moderator-token", {
      jiraBaseUrl: "https://jira.next.example.com",
      votingDeckId: "modified-fibonacci",
      joinPasscode: null,
      joinPasscodeMode: "keep"
    });
    expect(room.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeSettings.getTime());

    const afterSettings = room.lastActivityAt;
    await service.setRoundTicket("AB123", "moderator-token", "PROJ-2");
    expect(room.lastActivityAt.getTime()).toBeGreaterThanOrEqual(afterSettings.getTime());

    const afterTicket = room.lastActivityAt;
    await service.revealRound("AB123", "moderator-token");
    expect(room.lastActivityAt.getTime()).toBeGreaterThanOrEqual(afterTicket.getTime());

    const afterReveal = room.lastActivityAt;
    await service.unrevealRound("AB123", "moderator-token");
    expect(room.lastActivityAt.getTime()).toBeGreaterThanOrEqual(afterReveal.getTime());

    const afterUnreveal = room.lastActivityAt;
    await service.kickParticipant("AB123", "moderator-token", "part_1");
    expect(room.lastActivityAt.getTime()).toBeGreaterThanOrEqual(afterUnreveal.getTime());
  });

  it("touches room activity when a participant leaves", async () => {
    const room = createRoomAggregate();
    const service = createService(room);
    const beforeLeave = room.lastActivityAt;

    await service.leaveRoom("AB123", "participant-token");

    expect(room.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeLeave.getTime());
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
