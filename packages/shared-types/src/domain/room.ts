import type { VoteValue, VotingDeckId } from "./votes";

export type ParticipantRole = "moderator" | "participant" | "observer";

/** Roles available in the join form (moderator is assigned only at room creation). */
export type JoinableRole = "participant" | "observer";

export const JOINABLE_ROLES: ReadonlyArray<{ value: JoinableRole; label: string }> = [
  { value: "participant", label: "VOTER" },
  { value: "observer", label: "OBSERVER" }
];
export type PresenceState = "online" | "away";
export type RoundStatus = "active" | "revealed";

export interface ParticipantSnapshot {
  id: string;
  name: string;
  role: ParticipantRole;
  presence: PresenceState;
  hasVoted: boolean;
  revealedVote: VoteValue | null;
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
    hostVotes: boolean;
    createdAt: string;
  };
  round: RoundSnapshot;
  participants: ParticipantSnapshot[];
  viewer: ViewerSnapshot;
  votingDeck: VoteValue[];
}
