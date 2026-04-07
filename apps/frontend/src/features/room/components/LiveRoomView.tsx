import type { ParticipantSnapshot, RoomSnapshot, VoteValue } from "@terminal-poker/shared-types";

import { StatusChip } from "../../../components/StatusChip";
import { ParticipantRail } from "./RoomParticipants";
import { RoomHero } from "./RoomHero";
import { RoomVotingSection } from "./RoomVotingSection";

interface LiveRoomViewProps {
  areRealtimeActionsDisabled: boolean;
  castVote: (value: VoteValue) => void;
  error: string | null;
  hasTicketChanged: boolean;
  isModerator: boolean;
  isObserver: boolean;
  joinError: string | null;
  observers: ParticipantSnapshot[];
  onInvite: () => void;
  onResetRound: () => void;
  onRevealToggle: () => void;
  onTicketDraftChange: (value: string) => void;
  onUpdateTicket: () => void;
  roomLinkStatus: "idle" | "copied" | "error";
  snapshot: RoomSnapshot;
  ticketDraft: string;
  voters: ParticipantSnapshot[];
}

export const LiveRoomView = ({
  areRealtimeActionsDisabled,
  castVote,
  error,
  hasTicketChanged,
  isModerator,
  isObserver,
  joinError,
  observers,
  onInvite,
  onResetRound,
  onRevealToggle,
  onTicketDraftChange,
  onUpdateTicket,
  roomLinkStatus,
  snapshot,
  ticketDraft,
  voters
}: LiveRoomViewProps) => {
  const votedCount = voters.filter((participant) => participant.hasVoted).length;
  const voterCount = voters.length;

  return (
    <>
      <div className="hidden lg:grid">
        <ParticipantRail
          currentParticipantId={snapshot.viewer.participantId}
          observers={observers}
          onInvite={onInvite}
          roomCode={snapshot.room.code}
          roomLinkStatus={roomLinkStatus}
          roomName={snapshot.room.name}
          roundStatus={snapshot.round.status}
          voters={voters}
        />
      </div>

      <section className="order-1 grid gap-4 lg:order-2">
        <RoomHero snapshot={snapshot} voterCount={voterCount} votedCount={votedCount} />
        {isObserver ? (
          <div className="deck-card mx-auto w-full max-w-[82rem]">
            <div className="section-header">
              <StatusChip>OBSERVER</StatusChip>
              <h2>Observing this session</h2>
            </div>
            <p className="mono-muted">
              You are watching this round. Observers do not vote and are not counted in vote progress.
            </p>
          </div>
        ) : (
          <RoomVotingSection
            areRealtimeActionsDisabled={areRealtimeActionsDisabled}
            castVote={castVote}
            hasTicketChanged={hasTicketChanged}
            isModerator={isModerator}
            observers={observers}
            onResetRound={onResetRound}
            onRevealToggle={onRevealToggle}
            onTicketDraftChange={onTicketDraftChange}
            onUpdateTicket={onUpdateTicket}
            snapshot={snapshot}
            ticketDraft={ticketDraft}
            voterCount={voterCount}
            votedCount={votedCount}
            voters={voters}
          />
        )}
        {error || joinError ? <div className="notice notice--error">{error ?? joinError}</div> : null}
      </section>
    </>
  );
};
