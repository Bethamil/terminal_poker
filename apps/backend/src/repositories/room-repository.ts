import { ParticipantRole, Prisma, PrismaClient, RoundStatus } from "@prisma/client";

export type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export class RoomRepository {
  constructor(private readonly db: DatabaseClient) {}

  async isRoomCodeTaken(code: string): Promise<boolean> {
    const room = await this.db.room.findUnique({
      where: { code },
      select: { id: true }
    });

    return Boolean(room);
  }

  async createRoom(data: {
    code: string;
    jiraBaseUrl: string | null;
    votingDeckId: string;
    joinPasscodeHash: string | null;
  }) {
    return this.db.room.create({
      data
    });
  }

  async createParticipant(data: {
    roomId: string;
    name: string;
    role: ParticipantRole;
    sessionTokenHash: string;
  }) {
    return this.db.participant.create({
      data
    });
  }

  async createRound(data: { roomId: string; jiraTicketKey?: string | null }) {
    return this.db.round.create({
      data: {
        roomId: data.roomId,
        jiraTicketKey: data.jiraTicketKey ?? null
      }
    });
  }

  async getRoomAggregateByCode(code: string) {
    return this.db.room.findUnique({
      where: { code },
      include: {
        participants: {
          orderBy: { createdAt: "asc" }
        },
        rounds: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            votes: true
          }
        }
      }
    });
  }

  async touchParticipant(participantId: string) {
    return this.db.participant.update({
      where: { id: participantId },
      data: { lastSeenAt: new Date() }
    });
  }

  async updateRoundTicket(roundId: string, jiraTicketKey: string | null) {
    return this.db.round.update({
      where: { id: roundId },
      data: { jiraTicketKey }
    });
  }

  async updateRoomSettings(data: {
    roomId: string;
    jiraBaseUrl: string | null;
    votingDeckId: string;
    joinPasscodeHash: string | null;
  }) {
    return this.db.room.update({
      where: { id: data.roomId },
      data: {
        jiraBaseUrl: data.jiraBaseUrl,
        votingDeckId: data.votingDeckId,
        joinPasscodeHash: data.joinPasscodeHash
      }
    });
  }

  async revealRound(roundId: string) {
    return this.db.round.update({
      where: { id: roundId },
      data: {
        status: RoundStatus.REVEALED,
        revealedAt: new Date()
      }
    });
  }

  async unrevealRound(roundId: string) {
    return this.db.round.update({
      where: { id: roundId },
      data: {
        status: RoundStatus.ACTIVE,
        revealedAt: null
      }
    });
  }

  async upsertVote(roundId: string, participantId: string, value: string) {
    return this.db.vote.upsert({
      where: {
        roundId_participantId: {
          roundId,
          participantId
        }
      },
      create: {
        roundId,
        participantId,
        value
      },
      update: {
        value
      }
    });
  }

  async removeParticipant(participantId: string) {
    return this.db.participant.delete({
      where: { id: participantId }
    });
  }
}
