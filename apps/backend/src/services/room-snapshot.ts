import { ParticipantRole, Prisma, RoundStatus } from "@prisma/client";
import { RoomSnapshot, VOTING_DECK, VoteValue } from "@terminal-poker/shared-types";

import type { IssueLinkProvider } from "./jira-provider";

export type RoomAggregate = Prisma.RoomGetPayload<{
  include: {
    participants: true;
    rounds: {
      take: 1;
      orderBy: { createdAt: "desc" };
      include: { votes: true };
    };
  };
}>;

const mapParticipantRole = (role: ParticipantRole): "moderator" | "participant" =>
  role === ParticipantRole.MODERATOR ? "moderator" : "participant";

const mapRoundStatus = (status: RoundStatus): "active" | "revealed" =>
  status === RoundStatus.REVEALED ? "revealed" : "active";

const toNumericVote = (value: VoteValue): number | null => {
  if (value === "?") {
    return null;
  }

  return Number(value);
};

const buildSummary = (votes: VoteValue[]) => {
  if (votes.length === 0) {
    return null;
  }

  const counts = votes.reduce<Partial<Record<VoteValue, number>>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});

  const numericVotes = votes
    .map(toNumericVote)
    .filter((value): value is number => value !== null);

  const average =
    numericVotes.length > 0
      ? Number((numericVotes.reduce((sum, value) => sum + value, 0) / numericVotes.length).toFixed(1))
      : null;

  let consensus: VoteValue | null = null;
  let highestCount = 0;
  let tie = false;

  for (const value of VOTING_DECK) {
    const currentCount = counts[value] ?? 0;

    if (currentCount > highestCount) {
      consensus = value;
      highestCount = currentCount;
      tie = false;
    } else if (currentCount > 0 && currentCount === highestCount) {
      tie = true;
    }
  }

  return {
    average,
    consensus: tie ? null : consensus,
    counts
  };
};

export const buildRoomSnapshot = (
  room: RoomAggregate,
  viewerParticipantId: string,
  issueLinkProvider: IssueLinkProvider,
  presenceTtlSeconds: number
): RoomSnapshot => {
  const activeRound = room.rounds[0];
  const presenceThreshold = Date.now() - presenceTtlSeconds * 1000;
  const votesByParticipantId = new Map(activeRound?.votes.map((vote) => [vote.participantId, vote.value as VoteValue]));
  const viewer = room.participants.find((participant) => participant.id === viewerParticipantId);

  if (!activeRound || !viewer) {
    throw new Error("Room snapshot requested without an active round or viewer.");
  }

  const roundVotes = activeRound.votes.map((vote) => vote.value as VoteValue);
  const isRevealed = activeRound.status === RoundStatus.REVEALED;

  return {
    room: {
      id: room.id,
      code: room.code,
      jiraBaseUrl: room.jiraBaseUrl,
      hasJoinPasscode: Boolean(room.joinPasscodeHash),
      createdAt: room.createdAt.toISOString()
    },
    round: {
      id: activeRound.id,
      status: mapRoundStatus(activeRound.status),
      jiraTicketKey: activeRound.jiraTicketKey,
      jiraTicketUrl: issueLinkProvider.buildIssueUrl(room.jiraBaseUrl, activeRound.jiraTicketKey),
      revealedAt: activeRound.revealedAt?.toISOString() ?? null,
      summary: isRevealed ? buildSummary(roundVotes) : null
    },
    participants: room.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      role: mapParticipantRole(participant.role),
      presence: participant.lastSeenAt.getTime() >= presenceThreshold ? "online" : "away",
      hasVoted: votesByParticipantId.has(participant.id),
      revealedVote: isRevealed ? votesByParticipantId.get(participant.id) ?? null : null,
      lastSeenAt: participant.lastSeenAt.toISOString()
    })),
    viewer: {
      participantId: viewer.id,
      name: viewer.name,
      role: mapParticipantRole(viewer.role),
      selectedVote: (votesByParticipantId.get(viewer.id) ?? null) as VoteValue | null
    },
    votingDeck: [...VOTING_DECK]
  };
};

