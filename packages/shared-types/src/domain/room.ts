import type { VoteValue, VotingDeckId } from "./votes";

export type ParticipantRole = "moderator" | "participant";
export type PresenceState = "online" | "away";
export type RoundStatus = "active" | "revealed";

export interface ParticipantSnapshot {
  id: string;
  name: string;
  role: ParticipantRole;
  presence: PresenceState;
  hasVoted: boolean;
  revealedVote: VoteValue | null;
  lastSeenAt: string;
}

export interface RoundSummary {
  average: number | null;
  consensus: VoteValue | null;
  counts: Partial<Record<VoteValue, number>>;
}

export interface RoundSnapshot {
  id: string;
  status: RoundStatus;
  jiraTicketKey: string | null;
  jiraTicketUrl: string | null;
  revealedAt: string | null;
  summary: RoundSummary | null;
}

export interface ViewerSnapshot {
  participantId: string;
  name: string;
  role: ParticipantRole;
  selectedVote: VoteValue | null;
}

export interface RoomSnapshot {
  room: {
    id: string;
    code: string;
    name: string;
    jiraBaseUrl: string | null;
    votingDeckId: VotingDeckId;
    hasJoinPasscode: boolean;
    createdAt: string;
  };
  round: RoundSnapshot;
  participants: ParticipantSnapshot[];
  viewer: ViewerSnapshot;
  votingDeck: VoteValue[];
}
