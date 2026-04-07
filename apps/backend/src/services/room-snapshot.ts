import { ParticipantRole, Prisma, RoundStatus } from "@prisma/client";
import {
  RoomSnapshot,
  VoteValue,
  getVotingDeck,
  isNonEstimateVoteValue,
  resolveVotingDeckId
} from "@terminal-poker/shared-types";

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

const mapParticipantRole = (role: ParticipantRole): "moderator" | "participant" | "observer" =>
  role === ParticipantRole.MODERATOR ? "moderator" : role === ParticipantRole.OBSERVER ? "observer" : "participant";

const mapRoundStatus = (status: RoundStatus): "active" | "revealed" =>
  status === RoundStatus.REVEALED ? "revealed" : "active";

const toNumericVote = (value: VoteValue): number | null => {
  if (isNonEstimateVoteValue(value)) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const buildSummary = (votes: VoteValue[], votingDeck: VoteValue[]) => {
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

  for (const value of votingDeck) {
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
  activeParticipantIds: ReadonlySet<string>
): RoomSnapshot => {
  const activeRound = room.rounds[0];
  const votesByParticipantId = new Map(activeRound?.votes.map((vote) => [vote.participantId, vote.value as VoteValue]));
  const viewer = room.participants.find((participant) => participant.id === viewerParticipantId);

  if (!activeRound || !viewer) {
    throw new Error("Room snapshot requested without an active round or viewer.");
  }

  const observerIds = new Set(
    room.participants
      .filter((p) => p.role === ParticipantRole.OBSERVER)
      .map((p) => p.id)
  );
  const roundVotes = activeRound.votes
    .filter((vote) => !observerIds.has(vote.participantId))
    .map((vote) => vote.value as VoteValue);
  const isRevealed = activeRound.status === RoundStatus.REVEALED;
  const votingDeckId = resolveVotingDeckId(room.votingDeckId);
  const votingDeck = getVotingDeck(votingDeckId);

  return {
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      jiraBaseUrl: room.jiraBaseUrl,
      votingDeckId,
      hasJoinPasscode: Boolean(room.joinPasscodeHash),
      createdAt: room.createdAt.toISOString()
    },
    round: {
      id: activeRound.id,
      status: mapRoundStatus(activeRound.status),
      jiraTicketKey: activeRound.jiraTicketKey,
      jiraTicketUrl: issueLinkProvider.buildIssueUrl(room.jiraBaseUrl, activeRound.jiraTicketKey),
      revealedAt: activeRound.revealedAt?.toISOString() ?? null,
      summary: isRevealed ? buildSummary(roundVotes, votingDeck) : null
    },
    participants: room.participants.map((participant) => {
      const isObserver = participant.role === ParticipantRole.OBSERVER;
      return {
        id: participant.id,
        name: participant.name,
        role: mapParticipantRole(participant.role),
        presence: activeParticipantIds.has(participant.id) ? "online" : "away",
        hasVoted: isObserver ? false : votesByParticipantId.has(participant.id),
        revealedVote: isObserver ? null : (isRevealed ? votesByParticipantId.get(participant.id) ?? null : null)
      };
    }),
    viewer: {
      participantId: viewer.id,
      name: viewer.name,
      role: mapParticipantRole(viewer.role),
      selectedVote: viewer.role === ParticipantRole.OBSERVER
        ? null
        : (votesByParticipantId.get(viewer.id) ?? null) as VoteValue | null
    },
    votingDeck
  };
};
