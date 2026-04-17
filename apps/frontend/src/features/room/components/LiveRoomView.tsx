import type { JoinableRole, ParticipantSnapshot, RoomSnapshot, VoteValue } from "@terminal-poker/shared-types";

import { StatusChip } from "../../../components/StatusChip";
import { useResizablePanel } from "../useResizablePanel";
import { ParticipantRail } from "./RoomParticipants";
import { RoomHero } from "./RoomHero";
import { RoomVotingSection } from "./RoomVotingSection";

interface LiveRoomViewProps {
  areRealtimeActionsDisabled: boolean;
  castVote: (value: VoteValue) => void;
  error: string | null;
  hasTicketChanged: boolean;
  isFacilitator: boolean;
  isModerator: boolean;
  isObserver: boolean;
  joinError: string | null;
  observers: ParticipantSnapshot[];
  onInvite: (role: JoinableRole) => void;
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
  isFacilitator,
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
  const countedVoters = snapshot.room.hostVotes
    ? voters
    : voters.filter((participant) => participant.role !== "moderator");
  const votedCount = countedVoters.filter((participant) => participant.hasVoted).length;
  const voterCount = countedVoters.length;
  const { width: railWidth, handleProps } = useResizablePanel({
    defaultWidth: 240,
    minWidth: 240,
    maxWidth: 480,
    storageKey: "terminal-poker:rail-width",
  });

  return (
    <>
      <div className="relative hidden lg:grid" style={{ width: `${railWidth}px` }}>
        <ParticipantRail
          currentParticipantId={snapshot.viewer.participantId}
          hostVotes={snapshot.room.hostVotes}
          observers={observers}
          onInvite={onInvite}
          roomCode={snapshot.room.code}
          roomLinkStatus={roomLinkStatus}
          roomName={snapshot.room.name}
          roundStatus={snapshot.round.status}
          voters={voters}
        />
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize participants panel"
          className="group absolute -right-[5px] top-0 bottom-0 z-10 flex w-[10px] cursor-col-resize items-center justify-center"
          style={{ touchAction: "none" }}
          {...handleProps}
        >
          <div className="h-8 w-[3px] rounded-full bg-[color:var(--outline)] opacity-40 transition-opacity group-hover:opacity-100" />
        </div>
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
            isFacilitator={isFacilitator}
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
