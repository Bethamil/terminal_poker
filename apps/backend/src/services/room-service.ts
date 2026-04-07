import { ParticipantRole, Prisma, PrismaClient, RoundStatus } from "@prisma/client";
import {
  CreateRoomRequest,
  DEFAULT_VOTING_DECK_ID,
  JoinRoomRequest,
  RoomSessionResponse,
  RoomStateResponse,
  VoteValue,
  getVotingDeck,
  normalizeJiraBaseUrl
} from "@terminal-poker/shared-types";
import type { JoinPasscodeMode, UpdateRoomSettingsPayload } from "@terminal-poker/shared-types";
import { resolveVotingDeckId } from "@terminal-poker/shared-types";

import { AppError } from "../http/errors";
import { RoomRepository } from "../repositories/room-repository";
import type { RoomAggregate } from "./room-snapshot";
import { buildRoomSnapshot } from "./room-snapshot";
import {
  createParticipantToken,
  generateRoomCode,
  hashPasscode,
  hashSessionToken,
  verifyPasscode
} from "./security";
import type { IssueLinkProvider } from "./jira-provider";

const sanitizeName = (name: string): string => name.trim().replace(/\s+/g, " ");

export class RoomService {
  constructor(private readonly prisma: PrismaClient, private readonly issueLinkProvider: IssueLinkProvider) {}

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

  private validateRoomName(name: string): string {
    const sanitized = sanitizeName(name);

    if (!sanitized || sanitized.length < 2 || sanitized.length > 60) {
      throw new AppError(400, "INVALID_ROOM_NAME", "Room name must be between 2 and 60 characters.");
    }

    return sanitized;
  }

  private canCreateNextRound(round: RoomAggregate["rounds"][number] | undefined): boolean {
    if (!round) {
      return false;
    }

    return round.status === RoundStatus.REVEALED || round.votes.length > 0 || Boolean(round.jiraTicketKey);
  }

  private async getAuthorizedRoom(
    roomCode: string,
    participantToken: string,
    client: PrismaClient | Prisma.TransactionClient = this.prisma
  ): Promise<{
    room: RoomAggregate;
    participantId: string;
    role: ParticipantRole;
  }> {
    const room = await this.repository(client).getRoomAggregateByCode(roomCode.toUpperCase());

    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Room not found.");
    }

    const tokenHash = hashSessionToken(participantToken);
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
    const roomName = this.validateRoomName(input.roomName);
    const jiraBaseUrl = normalizeJiraBaseUrl(input.jiraBaseUrl);
    const votingDeckId = input.votingDeckId ?? DEFAULT_VOTING_DECK_ID;
    const joinPasscodeHash = input.joinPasscode?.trim() ? hashPasscode(input.joinPasscode.trim()) : null;
    const roomCode = await this.generateUniqueCode();
    const participantToken = createParticipantToken();
    const participantTokenHash = hashSessionToken(participantToken);

    await this.prisma.$transaction(async (transaction) => {
      const repo = this.repository(transaction);
      const room = await repo.createRoom({
        code: roomCode,
        name: roomName,
        jiraBaseUrl,
        votingDeckId,
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
    const participantTokenHash = hashSessionToken(participantToken);

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

      if (!verifyPasscode(input.joinPasscode?.trim(), room.joinPasscodeHash)) {
        throw new AppError(403, "INVALID_PASSCODE", "Join passcode is incorrect.");
      }

      const prismaRole = input.role === "observer" ? ParticipantRole.OBSERVER : ParticipantRole.PARTICIPANT;

      await repo.createParticipant({
        roomId: room.id,
        name,
        role: prismaRole,
        sessionTokenHash: participantTokenHash
      });

      await repo.touchRoomActivity(room.id);
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

    return {
      snapshot: buildRoomSnapshot(authorized.room, authorized.participantId, this.issueLinkProvider, new Set())
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

  buildSnapshotForParticipant(room: RoomAggregate, participantId: string, activeParticipantIds: ReadonlySet<string>) {
    return buildRoomSnapshot(room, participantId, this.issueLinkProvider, activeParticipantIds);
  }

  async joinRealtime(roomCode: string, participantToken: string): Promise<{ participantId: string }> {
    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);
    return { participantId: authorized.participantId };
  }

  async castVote(roomCode: string, participantToken: string, value: VoteValue): Promise<{ isFirstVote: boolean }> {
    return this.prisma.$transaction(async (transaction) => {
      const authorized = await this.getAuthorizedRoom(roomCode, participantToken, transaction);
      const participant = authorized.room.participants.find((p) => p.id === authorized.participantId);

      if (participant?.role === ParticipantRole.OBSERVER) {
        throw new AppError(403, "OBSERVER_CANNOT_VOTE", "Observers cannot cast votes.");
      }

      const round = authorized.room.rounds[0];
      const votingDeck = getVotingDeck(resolveVotingDeckId(authorized.room.votingDeckId));

      if (!votingDeck.includes(value)) {
        throw new AppError(400, "INVALID_VOTE", "Vote value is invalid for this room's deck.");
      }

      if (!round) {
        throw new AppError(500, "ROUND_NOT_FOUND", "No active round exists.");
      }

      if (round.status !== "ACTIVE") {
        throw new AppError(409, "ROUND_REVEALED", "Votes are already revealed.");
      }

      const isFirstVote = !round.votes.some((v) => v.participantId === authorized.participantId);

      const repo = this.repository(transaction);
      await repo.upsertVote(round.id, authorized.participantId, value);
      await repo.touchRoomActivity(authorized.room.id);

      return { isFirstVote };
    });
  }

  async setRoundTicket(roomCode: string, participantToken: string, jiraTicketKey: string | null): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const authorized = await this.getAuthorizedRoom(roomCode, participantToken, transaction);

      if (authorized.role !== ParticipantRole.MODERATOR) {
        throw new AppError(403, "FORBIDDEN", "Only moderators can update the Jira ticket.");
      }

      const round = authorized.room.rounds[0];
      if (!round) {
        throw new AppError(500, "ROUND_NOT_FOUND", "No active round exists.");
      }

      const repo = this.repository(transaction);
      await repo.updateRoundTicket(round.id, jiraTicketKey?.trim() || null);
      await repo.touchRoomActivity(authorized.room.id);
    });
  }

  async updateRoomSettings(
    roomCode: string,
    participantToken: string,
    input: Pick<UpdateRoomSettingsPayload, "jiraBaseUrl" | "votingDeckId" | "joinPasscode" | "joinPasscodeMode">
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const authorized = await this.getAuthorizedRoom(roomCode, participantToken, transaction);

      if (authorized.role !== ParticipantRole.MODERATOR) {
        throw new AppError(403, "FORBIDDEN", "Only moderators can update room settings.");
      }

      const jiraBaseUrl = normalizeJiraBaseUrl(input.jiraBaseUrl);
      const joinPasscode = input.joinPasscode?.trim() || null;
      const joinPasscodeHash = this.resolveJoinPasscodeHash(
        authorized.room.joinPasscodeHash,
        input.joinPasscodeMode,
        joinPasscode
      );
      const nextVotingDeckId = input.votingDeckId;
      const votingDeckChanged = authorized.room.votingDeckId !== nextVotingDeckId;
      const repo = this.repository(transaction);
      await repo.updateRoomSettings({
        roomId: authorized.room.id,
        jiraBaseUrl,
        votingDeckId: nextVotingDeckId,
        joinPasscodeHash
      });

      if (votingDeckChanged) {
        await repo.createRound({
          roomId: authorized.room.id
        });
      }

      await repo.touchRoomActivity(authorized.room.id);
    });
  }

  async changeParticipantRole(
    roomCode: string,
    participantToken: string,
    targetParticipantId: string,
    newRole: "moderator" | "participant" | "observer"
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const authorized = await this.getAuthorizedRoom(roomCode, participantToken, transaction);

      if (authorized.role !== ParticipantRole.MODERATOR) {
        throw new AppError(403, "FORBIDDEN", "Only moderators can change participant roles.");
      }

      if (authorized.participantId === targetParticipantId) {
        throw new AppError(400, "CANNOT_CHANGE_OWN_ROLE", "Moderators cannot change their own role directly.");
      }

      const target = authorized.room.participants.find((p) => p.id === targetParticipantId);

      if (!target) {
        throw new AppError(404, "PARTICIPANT_NOT_FOUND", "Participant not found.");
      }

      const repo = this.repository(transaction);
      const prismaNewRole =
        newRole === "moderator"
          ? ParticipantRole.MODERATOR
          : newRole === "observer"
            ? ParticipantRole.OBSERVER
            : ParticipantRole.PARTICIPANT;

      if (target.role === prismaNewRole) {
        return;
      }

      // Transfer moderator: target becomes moderator, current moderator becomes participant
      if (prismaNewRole === ParticipantRole.MODERATOR) {
        await repo.updateParticipantRole(authorized.participantId, ParticipantRole.PARTICIPANT);
        await repo.updateParticipantRole(targetParticipantId, ParticipantRole.MODERATOR);
      } else {
        await repo.updateParticipantRole(targetParticipantId, prismaNewRole);
      }

      // If changed to observer, remove their vote from the active round
      if (prismaNewRole === ParticipantRole.OBSERVER) {
        const activeRound = authorized.room.rounds[0];

        if (activeRound) {
          await repo.deleteVotesForParticipantInRound(activeRound.id, targetParticipantId);
        }
      }

      await repo.touchRoomActivity(authorized.room.id);
    });
  }

  async kickParticipant(
    roomCode: string,
    participantToken: string,
    targetParticipantId: string
  ): Promise<{ participantId: string; participantName: string }> {
    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);

    if (authorized.role !== ParticipantRole.MODERATOR) {
      throw new AppError(403, "FORBIDDEN", "Only moderators can remove participants.");
    }

    if (authorized.participantId === targetParticipantId) {
      throw new AppError(400, "CANNOT_KICK_SELF", "Moderators cannot remove themselves.");
    }

    const participant = authorized.room.participants.find((entry) => entry.id === targetParticipantId);

    if (!participant) {
      throw new AppError(404, "PARTICIPANT_NOT_FOUND", "Participant not found.");
    }

    if (participant.role === ParticipantRole.MODERATOR) {
      throw new AppError(403, "FORBIDDEN", "Moderators cannot remove other moderators.");
    }

    await this.prisma.$transaction(async (transaction) => {
      const repo = this.repository(transaction);
      await repo.removeParticipant(targetParticipantId);
      await repo.touchRoomActivity(authorized.room.id);
    });

    return {
      participantId: participant.id,
      participantName: participant.name
    };
  }

  async leaveRoom(
    roomCode: string,
    participantToken: string
  ): Promise<{ participantId: string; participantName: string; roomDeleted: boolean }> {
    const authorized = await this.getAuthorizedRoom(roomCode, participantToken);
    const participant = authorized.room.participants.find((entry) => entry.id === authorized.participantId);

    if (!participant) {
      throw new AppError(404, "PARTICIPANT_NOT_FOUND", "Participant not found.");
    }

    await this.prisma.$transaction(async (transaction) => {
      const repo = this.repository(transaction);

      if (authorized.role === ParticipantRole.MODERATOR) {
        await repo.removeRoom(authorized.room.id);
        return;
      }

      await repo.removeParticipant(authorized.participantId);
      await repo.touchRoomActivity(authorized.room.id);
    });

    return {
      participantId: participant.id,
      participantName: participant.name,
      roomDeleted: authorized.role === ParticipantRole.MODERATOR
    };
  }

  private resolveJoinPasscodeHash(
    currentHash: string | null,
    mode: JoinPasscodeMode,
    joinPasscode: string | null
  ): string | null {
    if (mode === "keep") {
      return currentHash;
    }

    if (mode === "clear") {
      return null;
    }

    if (!joinPasscode) {
      throw new AppError(400, "INVALID_PASSCODE", "Join passcode cannot be empty.");
    }

    return hashPasscode(joinPasscode);
  }

  async revealRound(roomCode: string, participantToken: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const authorized = await this.getAuthorizedRoom(roomCode, participantToken, transaction);

      if (authorized.role !== ParticipantRole.MODERATOR) {
        throw new AppError(403, "FORBIDDEN", "Only moderators can reveal a round.");
      }

      const round = authorized.room.rounds[0];
      if (!round) {
        throw new AppError(500, "ROUND_NOT_FOUND", "No active round exists.");
      }

      const repo = this.repository(transaction);
      await repo.revealRound(round.id);
      await repo.touchRoomActivity(authorized.room.id);
    });
  }

  async unrevealRound(roomCode: string, participantToken: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const authorized = await this.getAuthorizedRoom(roomCode, participantToken, transaction);

      if (authorized.role !== ParticipantRole.MODERATOR) {
        throw new AppError(403, "FORBIDDEN", "Only moderators can unreveal a round.");
      }

      const round = authorized.room.rounds[0];
      if (!round) {
        throw new AppError(500, "ROUND_NOT_FOUND", "No active round exists.");
      }

      const repo = this.repository(transaction);
      await repo.unrevealRound(round.id);
      await repo.touchRoomActivity(authorized.room.id);
    });
  }

  async resetRound(roomCode: string, participantToken: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const authorized = await this.getAuthorizedRoom(roomCode, participantToken, transaction);

      if (authorized.role !== ParticipantRole.MODERATOR) {
        throw new AppError(403, "FORBIDDEN", "Only moderators can reset a round.");
      }

      if (!this.canCreateNextRound(authorized.room.rounds[0])) {
        return;
      }

      const repo = this.repository(transaction);
      await repo.touchRoomActivity(authorized.room.id);
      await repo.createRound({
        roomId: authorized.room.id
      });
    });
  }
}
