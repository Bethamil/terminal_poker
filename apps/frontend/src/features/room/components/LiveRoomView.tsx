import type { RoomSnapshot, VoteValue } from "@terminal-poker/shared-types";

import { ParticipantRail } from "./RoomParticipants";
import { RoomHero } from "./RoomHero";
import { RoomVotingSection } from "./RoomVotingSection";

interface LiveRoomViewProps {
  areRealtimeActionsDisabled: boolean;
  castVote: (value: VoteValue) => void;
  error: string | null;
  hasTicketChanged: boolean;
  isModerator: boolean;
  joinError: string | null;
  onInvite: () => void;
  onResetRound: () => void;
  onRevealToggle: () => void;
  onTicketDraftChange: (value: string) => void;
  onUpdateTicket: () => void;
  roomLinkStatus: "idle" | "copied" | "error";
  snapshot: RoomSnapshot;
  ticketDraft: string;
}

export const LiveRoomView = ({
  areRealtimeActionsDisabled,
  castVote,
  error,
  hasTicketChanged,
  isModerator,
  joinError,
  onInvite,
  onResetRound,
  onRevealToggle,
  onTicketDraftChange,
  onUpdateTicket,
  roomLinkStatus,
  snapshot,
  ticketDraft
}: LiveRoomViewProps) => {
  const votedCount = snapshot.participants.filter((participant) => participant.hasVoted).length;

  return (
    <>
      <div className="hidden lg:grid">
        <ParticipantRail
          currentParticipantId={snapshot.viewer.participantId}
          onInvite={onInvite}
          participants={snapshot.participants}
          roomCode={snapshot.room.code}
          roomLinkStatus={roomLinkStatus}
          roomName={snapshot.room.name}
          roundStatus={snapshot.round.status}
        />
      </div>

      <section className="order-1 grid gap-4 lg:order-2">
        <RoomHero snapshot={snapshot} votedCount={votedCount} />
        <RoomVotingSection
          areRealtimeActionsDisabled={areRealtimeActionsDisabled}
          castVote={castVote}
          hasTicketChanged={hasTicketChanged}
          isModerator={isModerator}
          onResetRound={onResetRound}
          onRevealToggle={onRevealToggle}
          onTicketDraftChange={onTicketDraftChange}
          onUpdateTicket={onUpdateTicket}
          snapshot={snapshot}
          ticketDraft={ticketDraft}
          votedCount={votedCount}
        />
        {error || joinError ? <div className="notice notice--error">{error ?? joinError}</div> : null}
      </section>
    </>
  );
};
