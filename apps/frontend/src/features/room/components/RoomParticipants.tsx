import type { ParticipantSnapshot } from "@terminal-poker/shared-types";
import { COFFEE_VOTE_VALUE } from "@terminal-poker/shared-types";

import { Button } from "../../../components/Button";
import { CoffeeVote } from "../../../components/icons";
import { countOnlineParticipants } from "../roomViewUtils";

export interface RoomParticipantStatusProps {
  currentParticipantId: string;
  participants: ParticipantSnapshot[];
  roundStatus: "active" | "revealed";
}

interface ParticipantRailProps extends RoomParticipantStatusProps {
  onInvite: () => void;
  roomCode: string;
  roomLinkStatus: "idle" | "copied" | "error";
  roomName: string;
}

export const ParticipantRail = ({
  currentParticipantId,
  onInvite,
  participants,
  roomCode,
  roomLinkStatus,
  roomName,
  roundStatus
}: ParticipantRailProps) => {
  const onlineParticipantCount = countOnlineParticipants(participants);

  return (
    <aside
      className="room-sidebar card card--rail order-2 grid min-h-0 gap-4 border-white/5 px-4 py-4 lg:order-1 lg:h-full lg:min-h-[420px] lg:grid-rows-[auto_auto_minmax(0,1fr)_auto] lg:gap-5 lg:px-5 lg:py-5"
      style={{ background: "var(--rail-panel-bg)" }}
    >
      <div className="grid gap-1">
        <h2
          className="font-['JetBrains_Mono'] text-sm uppercase tracking-[0.18em]"
          style={{ color: "var(--rail-title)" }}
        >
          {roomName.replace(/\s+/g, "_")}
        </h2>
        <span
          className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.14em]"
          style={{ color: "var(--rail-meta)" }}
        >
          ID: {roomCode}
        </span>
      </div>

      <div className="grid gap-2">
        <div
          className="bg-white/[0.05] px-4 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.14em]"
          style={{
            borderLeft: "1px solid var(--rail-accent)",
            color: "var(--rail-accent-text)"
          }}
        >
          ACTIVE ({onlineParticipantCount}/{participants.length})
        </div>
      </div>

      <div className="participant-list min-h-0 max-h-[min(40vh,18rem)] overflow-y-auto pr-1 lg:max-h-none">
        {participants.map((participant) => (
          <div
            className={`participant-row ${
              roundStatus === "revealed" ? "participant-row--revealed" : ""
            } ${
              participant.id === currentParticipantId ? "participant-row--active" : ""
            }`}
            key={participant.id}
          >
            <div className={`presence-dot presence-dot--${participant.presence}`} />
            <div className="participant-row__identity">
              <strong>{participant.name}</strong>
              <span>
                {participant.role === "moderator" ? "HOST" : participant.hasVoted ? "VOTED" : "WAITING"}
              </span>
            </div>
            <div
              className={`participant-row__vote ${
                participant.revealedVote ? "participant-row__vote--revealed" : ""
              }`}
            >
              {participant.revealedVote
                ? participant.revealedVote === COFFEE_VOTE_VALUE
                  ? <CoffeeVote />
                  : participant.revealedVote
                : participant.hasVoted
                  ? "●"
                  : "·"}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 pt-3">
        <Button
          className="w-full justify-center"
          onClick={onInvite}
          style={{
            background: "var(--action-accent-bg)",
            color: "var(--action-accent-text)"
          }}
        >
          {roomLinkStatus === "copied"
            ? "LINK COPIED"
            : roomLinkStatus === "error"
              ? "COPY FAILED"
              : "INVITE_DEV"}
        </Button>
      </div>
    </aside>
  );
};

export const MobileParticipantStrip = ({
  currentParticipantId,
  participants,
  roundStatus
}: RoomParticipantStatusProps) => (
  <div className="-mx-[var(--shell-pad)] flex gap-2 overflow-x-auto px-[var(--shell-pad)] pb-1 lg:hidden">
    {participants.map((participant) => {
      const isCurrent = participant.id === currentParticipantId;
      const voteState =
        roundStatus === "revealed"
          ? participant.revealedVote
            ? participant.revealedVote === COFFEE_VOTE_VALUE
              ? <CoffeeVote variant="mobile" />
              : participant.revealedVote
            : "·"
          : participant.hasVoted
            ? "●"
            : "·";

      return (
        <div
          className={`grid min-w-[8.2rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[999px] border px-3 py-2 ${
            isCurrent
              ? "border-[color:var(--participant-active-border)] bg-[color:var(--participant-active-bg)]"
              : "border-[color:var(--outline)] bg-[color:var(--panel-bg)]"
          }`}
          key={participant.id}
        >
          <div className={`presence-dot presence-dot--${participant.presence}`} />
          <strong className="truncate text-[0.8rem]">{participant.name}</strong>
          <div
            className={`flex min-w-[2.25rem] items-center justify-end text-right font-['JetBrains_Mono'] text-[0.72rem] uppercase tracking-[0.12em] ${
              roundStatus === "revealed" && participant.revealedVote
                ? "font-['Space_Grotesk'] text-[1rem] tracking-[-0.04em] text-[color:var(--text)]"
                : "text-[color:var(--muted)]"
            }`}
          >
            {voteState}
          </div>
        </div>
      );
    })}
  </div>
);
