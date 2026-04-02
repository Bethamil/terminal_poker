import { ParticipantRole, Prisma, PrismaClient } from "@prisma/client";
import {
  CreateRoomRequest,
  JoinRoomRequest,
  RoomSessionResponse,
  RoomStateResponse,
  VoteValue,
  isVoteValue,
  normalizeJiraBaseUrl
} from "@terminal-poker/shared-types";

import { AppError } from "../http/errors";
import { RoomRepository } from "../repositories/room-repository";
import type { RoomAggregate } from "./room-snapshot";
import { buildRoomSnapshot } from "./room-snapshot";
import { generateRoomCode, hashSecret, createParticipantToken, verifySecret } from "./security";
import type { IssueLinkProvider } from "./jira-provider";

const sanitizeName = (name: string): string => name.trim().replace(/\s+/g, " ");

export class RoomService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly issueLinkProvider: IssueLinkProvider,
    private readonly presenceTtlSeconds: number
  ) {}

  private repository(client: PrismaClient | Prisma.TransactionClient = this.prisma): RoomRepository {
    return new RoomRepository(client);
  }

  private async generateUniqueCode(): Promise<string> {
    const repo = this.repository();

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const code = generateRoomCode();

      if (!(await repo.isRoomCodeTaken(code))) {
        return code;
      }
    }

    throw new AppError(500, "ROOM_CODE_EXHAUSTED", "Unable to generate a room code.");
  }

  private validateName(name: string): string {
    const sanitized = sanitizeName(name);

    if (!sanitized || sanitized.length < 2 || sanitized.length > 40) {
      throw new AppError(400, "INVALID_NAME", "Name must be between 2 and 40 characters.");
    }

    return sanitized;
  }

  private async getAuthorizedRoom(roomCode: string, participantToken: string): Promise<{
    room: RoomAggregate;
    participantId: string;
    role: ParticipantRole;
  }> {
    const room = await this.repository().getRoomAggregateByCode(roomCode.toUpperCase());

    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Room not found.");
    }

    const tokenHash = hashSecret(participantToken);
    const participant = room.participants.find((entry) => entry.sessionTokenHash === tokenHash);

    if (!participant) {
      throw new AppError(401, "INVALID_SESSION", "Participant session is invalid.");
    }

    return {
      room,
      participantId: participant.id,
      role: participant.role
    };
  }

  async createRoom(input: CreateRoomRequest): Promise<RoomSessionResponse> {
    const name = this.validateName(input.name);
    const jiraBaseUrl = normalizeJiraBaseUrl(input.jiraBaseUrl);
    const joinPasscodeHash = input.joinPasscode?.trim() ? hashSecret(input.joinPasscode.trim()) : null;
    const roomCode = await this.generateUniqueCode();
    const participantToken = createParticipantToken();
    const participantTokenHash = hashSecret(participantToken);

    await this.prisma.$transaction(async (transaction) => {
      const repo = this.repository(transaction);
      const room = await repo.createRoom({
        code: roomCode,
        jiraBaseUrl,
        joinPasscodeHash
      });

      await repo.createParticipant({
        roomId: room.id,
        name,
        role: ParticipantRole.MODERATOR,
        sessionTokenHash: participantTokenHash
      });

      await repo.createRound({
        roomId: room.id
      });
    });

    const snapshotResponse = await this.getRoomState(roomCode, participantToken);
    return {
      roomCode,
      participantToken,
      snapshot: snapshotResponse.snapshot
    };
  }

  async joinRoom(roomCodeInput: string, input: JoinRoomRequest): Promise<RoomSessionResponse> {
    const roomCode = roomCodeInput.toUpperCase();
    const name = this.validateName(input.name);
    const participantToken = createParticipantToken();
    const participantTokenHash = hashSecret(participantToken);

    await this.prisma.$transaction(async (transaction) => {
      const repo = this.repository(transaction);
      const room = await repo.getRoomAggregateByCode(roomCode);

      if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found.");
      }

      const hasNameConflict = room.participants.some(
        (participant) => participant.name.toLowerCase() === name.toLowerCase()
      );

      if (hasNameConflict) {
        throw new AppError(409, "NAME_TAKEN", "That name is already in use in this room.");
      }

      if (!verifySecret(input.joinPasscode?.trim(), room.joinPasscodeHash)) {
        throw new AppError(403, "INVALID_PASSCODE", "Join passcode is incorrect.");
      }

      await repo.createParticipant({
        roomId: room.id,
        name,
        role: ParticipantRole.PARTICIPANT,
        sessionTokenHash: participantTokenHash
      });
    });

    const snapshotResponse = await this.getRoomState(roomCode, participantToken);
    return {
      roomCode,
      participantToken,
      snapshot: snapshotResponse.snapshot
    };
  }

  async getRoomState(roomCode: string, participantToken: string): Promise<RoomStateResponse> {
    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);
    await this.repository().touchParticipant(authorized.participantId);
    const refreshedRoom = await this.repository().getRoomAggregateByCode(roomCode.toUpperCase());

    if (!refreshedRoom) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Room not found.");
    }

    return {
      snapshot: buildRoomSnapshot(
        refreshedRoom,
        authorized.participantId,
        this.issueLinkProvider,
        this.presenceTtlSeconds
      )
    };
  }

  async getRoomAggregate(roomCode: string): Promise<RoomAggregate> {
    const room = await this.repository().getRoomAggregateByCode(roomCode.toUpperCase());

    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Room not found.");
    }

    return room;
  }

  async checkReadiness(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  buildSnapshotForParticipant(room: RoomAggregate, participantId: string) {
    return buildRoomSnapshot(room, participantId, this.issueLinkProvider, this.presenceTtlSeconds);
  }

  async markHeartbeat(roomCode: string, participantToken: string): Promise<void> {
    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);
    await this.repository().touchParticipant(authorized.participantId);
  }

  async joinRealtime(roomCode: string, participantToken: string): Promise<{ participantId: string }> {
    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);
    await this.repository().touchParticipant(authorized.participantId);
    return { participantId: authorized.participantId };
  }

  async castVote(roomCode: string, participantToken: string, value: VoteValue): Promise<void> {
    if (!isVoteValue(value)) {
      throw new AppError(400, "INVALID_VOTE", "Vote value is invalid.");
    }

    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);
    const round = authorized.room.rounds[0];

    if (!round) {
      throw new AppError(500, "ROUND_NOT_FOUND", "No active round exists.");
    }

    if (round.status !== "ACTIVE") {
      throw new AppError(409, "ROUND_REVEALED", "Votes are already revealed.");
    }

    await this.prisma.$transaction(async (transaction) => {
      const repo = this.repository(transaction);
      await repo.touchParticipant(authorized.participantId);
      await repo.upsertVote(round.id, authorized.participantId, value);
    });
  }

  async setRoundTicket(roomCode: string, participantToken: string, jiraTicketKey: string | null): Promise<void> {
    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);

    if (authorized.role !== ParticipantRole.MODERATOR) {
      throw new AppError(403, "FORBIDDEN", "Only moderators can update the Jira ticket.");
    }

    const round = authorized.room.rounds[0];
    if (!round) {
      throw new AppError(500, "ROUND_NOT_FOUND", "No active round exists.");
    }

    await this.prisma.$transaction(async (transaction) => {
      const repo = this.repository(transaction);
      await repo.touchParticipant(authorized.participantId);
      await repo.updateRoundTicket(round.id, jiraTicketKey?.trim() || null);
    });
  }

  async revealRound(roomCode: string, participantToken: string): Promise<void> {
    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);

    if (authorized.role !== ParticipantRole.MODERATOR) {
      throw new AppError(403, "FORBIDDEN", "Only moderators can reveal a round.");
    }

    const round = authorized.room.rounds[0];
    if (!round) {
      throw new AppError(500, "ROUND_NOT_FOUND", "No active round exists.");
    }

    await this.prisma.$transaction(async (transaction) => {
      const repo = this.repository(transaction);
      await repo.touchParticipant(authorized.participantId);
      await repo.revealRound(round.id);
    });
  }

  async resetRound(roomCode: string, participantToken: string): Promise<void> {
    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);

    if (authorized.role !== ParticipantRole.MODERATOR) {
      throw new AppError(403, "FORBIDDEN", "Only moderators can reset a round.");
    }

    await this.prisma.$transaction(async (transaction) => {
      const repo = this.repository(transaction);
      await repo.touchParticipant(authorized.participantId);
      await repo.createRound({
        roomId: authorized.room.id
      });
    });
  }
}
