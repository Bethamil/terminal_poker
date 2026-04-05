import { COFFEE_VOTE_VALUE, getVoteCardMeta, getVotingDeckName, type RoomSnapshot, type VoteValue } from "@terminal-poker/shared-types";

import { Button } from "../../../components/Button";
import { CoffeeVote } from "../../../components/CoffeeVote";
import { Field } from "../../../components/Field";
import { StatusChip } from "../../../components/StatusChip";
import { MobileParticipantStrip } from "./RoomParticipants";

interface RoomVotingSectionProps {
  areRealtimeActionsDisabled: boolean;
  castVote: (value: VoteValue) => void;
  hasTicketChanged: boolean;
  isModerator: boolean;
  onResetRound: () => void;
  onRevealToggle: () => void;
  onTicketDraftChange: (value: string) => void;
  onUpdateTicket: () => void;
  snapshot: RoomSnapshot;
  ticketDraft: string;
  votedCount: number;
}

export const RoomVotingSection = ({
  areRealtimeActionsDisabled,
  castVote,
  hasTicketChanged,
  isModerator,
  onResetRound,
  onRevealToggle,
  onTicketDraftChange,
  onUpdateTicket,
  snapshot,
  ticketDraft,
  votedCount
}: RoomVotingSectionProps) => {
  const isVotingClosed = snapshot.round.status === "revealed";
  const voteCardMeta = getVoteCardMeta(snapshot.room.votingDeckId);

  return (
    <section
      className={`deck-card mx-auto w-full max-w-[82rem] ${isModerator ? "deck-card--moderator" : ""}`.trim()}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="section-header">
          <StatusChip tone="success">DECK</StatusChip>
          <h2>{getVotingDeckName(snapshot.room.votingDeckId)}</h2>
        </div>
        <div className="mono-muted">{votedCount}/{snapshot.participants.length} VOTED</div>
      </div>
      <MobileParticipantStrip
        currentParticipantId={snapshot.viewer.participantId}
        participants={snapshot.participants}
        roundStatus={snapshot.round.status}
      />
      {isModerator ? (
        <div className="flex flex-wrap items-stretch gap-3 border-b border-white/6 pb-3">
          <div className="flex min-w-[18rem] flex-[1_1_30rem] items-stretch gap-2">
            <div className="min-w-0 flex-1">
              <Field
                aria-label="Ticket"
                value={ticketDraft}
                onChange={(event) => onTicketDraftChange(event.target.value.toUpperCase())}
                placeholder="PROJ-123"
              />
            </div>
            <Button
              disabled={areRealtimeActionsDisabled || !hasTicketChanged}
              onClick={onUpdateTicket}
              style={{ minHeight: "3rem", padding: "0.7rem 0.9rem" }}
              variant="secondary"
            >
              SYNC
            </Button>
          </div>
          <div className="flex items-stretch gap-3">
            <span
              aria-hidden="true"
              className="hidden w-px lg:block"
              style={{ background: "var(--shell-footer-border)" }}
            />
            <Button
              disabled={areRealtimeActionsDisabled}
              onClick={onRevealToggle}
              style={{
                background: "var(--action-accent-bg)",
                color: "var(--action-accent-text)",
                minHeight: "3rem",
                padding: "0.7rem 1rem"
              }}
              variant="primary"
            >
              {snapshot.round.status === "revealed" ? "UNREVEAL" : "REVEAL"}
            </Button>
            <Button
              disabled={areRealtimeActionsDisabled}
              onClick={onResetRound}
              style={{ minHeight: "3rem", padding: "0.7rem 0.9rem" }}
              variant="ghost"
            >
              NEXT
            </Button>
          </div>
        </div>
      ) : null}
      <div className={`deck-card__body ${isVotingClosed ? "deck-card__body--closed" : ""}`.trim()}>
        <div className="vote-grid">
          {voteCardMeta.map((card) => {
            const isSelected = snapshot.viewer.selectedVote === card.value;
            const isCoffeeCard = card.value === COFFEE_VOTE_VALUE;

            return (
              <button
                aria-label={isCoffeeCard ? card.label : undefined}
                disabled={areRealtimeActionsDisabled || isVotingClosed}
                className={`vote-tile ${isSelected ? "vote-tile--selected" : ""} ${
                  isCoffeeCard ? "vote-tile--coffee" : ""
                } ${
                  isVotingClosed ? "vote-tile--locked" : ""
                }`.trim()}
                key={card.value}
                onClick={() => castVote(card.value)}
                type="button"
              >
                {isCoffeeCard ? <CoffeeVote variant="tile" /> : null}
                {!isCoffeeCard ? <strong className="vote-tile__value">{card.value}</strong> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
