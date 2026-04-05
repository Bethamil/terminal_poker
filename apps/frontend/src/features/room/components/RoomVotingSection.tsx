import { COFFEE_VOTE_VALUE, getVoteCardMeta, getVotingDeckName, type RoomSnapshot, type VoteValue } from "@terminal-poker/shared-types";

import { Button } from "../../../components/Button";
import { Field } from "../../../components/Field";
import { NextRoundIcon, RevealToggleIcon, CoffeeVote } from "../../../components/icons";
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
  const revealButtonLabel = isVotingClosed ? "UNREVEAL" : "REVEAL";
  const iconActionButtonStyle = {
    height: "4.15rem",
    width: "4.15rem",
    padding: 0
  } as const;

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
        <div className="flex flex-nowrap items-stretch gap-2 border-b border-white/6 pb-3 sm:flex-wrap sm:gap-3">
          <div className="flex min-w-0 flex-[1_1_auto] items-stretch gap-2 sm:min-w-[18rem] sm:flex-[1_1_30rem]">
            <div className="min-w-0 flex-1">
              <Field
                aria-label="Ticket"
                className="h-[4.15rem]"
                value={ticketDraft}
                onChange={(event) => onTicketDraftChange(event.target.value.toUpperCase())}
                placeholder="PROJ-123"
              />
            </div>
            <Button
              className="shrink-0"
              disabled={areRealtimeActionsDisabled || !hasTicketChanged}
              onClick={onUpdateTicket}
              style={{ minHeight: "3rem", padding: "0.7rem 0.9rem" }}
              variant="secondary"
            >
              SYNC
            </Button>
          </div>
          <div className="flex shrink-0 items-stretch gap-2 sm:gap-3">
            <span
              aria-hidden="true"
              className="hidden w-px lg:block"
              style={{ background: "var(--shell-footer-border)" }}
            />
            <Button
              className="shrink-0 rounded-[18px]"
              disabled={areRealtimeActionsDisabled}
              onClick={onRevealToggle}
              style={{
                background: "var(--action-accent-bg)",
                color: "var(--action-accent-text)",
                ...iconActionButtonStyle
              }}
              variant="primary"
            >
              <span className="inline-flex items-center justify-center leading-none">
                <RevealToggleIcon isRevealed={isVotingClosed} />
                <span className="sr-only">{revealButtonLabel}</span>
              </span>
            </Button>
            <Button
              className="shrink-0 rounded-[18px]"
              disabled={areRealtimeActionsDisabled}
              onClick={onResetRound}
              style={iconActionButtonStyle}
              variant="ghost"
            >
              <span className="inline-flex items-center justify-center leading-none">
                <NextRoundIcon className="font-['JetBrains_Mono'] text-[1.7rem] font-bold leading-none tracking-[-0.18em]" />
                <span className="sr-only">NEXT</span>
              </span>
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
