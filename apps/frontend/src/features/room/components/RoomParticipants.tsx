import { useState } from "react";
import type { JoinableRole, ParticipantSnapshot } from "@terminal-poker/shared-types";
import { COFFEE_VOTE_VALUE } from "@terminal-poker/shared-types";

import { Button } from "../../../components/Button";
import { CoffeeVote } from "../../../components/icons";
import { countOnlineParticipants } from "../roomViewUtils";

export interface RoomParticipantStatusProps {
  currentParticipantId: string;
  voters: ParticipantSnapshot[];
  observers: ParticipantSnapshot[];
  roundStatus: "active" | "revealed";
}

interface ParticipantRailProps extends RoomParticipantStatusProps {
  onInvite: (role: JoinableRole) => void;
  roomCode: string;
  roomLinkStatus: "idle" | "copied" | "error";
  roomName: string;
}

type RailTab = "voters" | "observers";

const getParticipantGroupLabel = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

export const ParticipantRail = ({
  currentParticipantId,
  observers,
  onInvite,
  roomCode,
  roomLinkStatus,
  roomName,
  roundStatus,
  voters
}: ParticipantRailProps) => {
  const [activeTab, setActiveTab] = useState<RailTab>("voters");
  const activeParticipants = activeTab === "voters" ? voters : observers;
  const inviteRole: JoinableRole = activeTab === "observers" ? "observer" : "participant";
  const onlineCount = countOnlineParticipants(activeParticipants);

  return (
    <aside
      className="room-sidebar card card--rail order-2 grid min-h-0 gap-3 border-white/5 px-4 py-4 lg:order-1 lg:h-full lg:min-h-[420px] lg:grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] lg:gap-3 lg:px-5 lg:py-5"
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

      <div
        aria-label="Participant groups"
        className="grid grid-cols-2 gap-2"
        role="tablist"
      >
        {([
          {
            id: "voters" as const,
            label: getParticipantGroupLabel(voters.length, "VOTER", "VOTERS"),
            count: voters.length
          },
          {
            id: "observers" as const,
            label: getParticipantGroupLabel(observers.length, "OBSERVER", "OBSERVERS"),
            count: observers.length
          }
        ]).map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              aria-controls={`rail-panel-${tab.id}`}
              aria-selected={isActive}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border px-3 py-1.5 text-center transition-[border-color,background-color] duration-150 hover:border-[color:var(--button-secondary-border)] hover:bg-[color:var(--panel-strong-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--button-secondary-border)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--card-bg)] ${
                isActive
                  ? "border-[color:var(--button-secondary-border)] bg-[color:var(--button-secondary-bg)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                  : "border-[color:var(--outline)] bg-[color:var(--panel-bg)]"
              }`}
              id={`rail-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              <span className="font-['JetBrains_Mono'] text-[0.62rem] uppercase tracking-[0.08em] text-[color:var(--muted)]">
                {tab.count}
              </span>
              <span className="whitespace-nowrap font-['JetBrains_Mono'] text-[0.68rem] uppercase tracking-[0.06em] text-[color:var(--text)]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="bg-white/[0.05] px-4 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.14em]"
        style={{
          borderLeft: "1px solid var(--rail-accent)",
          color: "var(--rail-accent-text)"
        }}
      >
        ACTIVE ({onlineCount}/{activeParticipants.length})
      </div>

      {activeTab === "voters" ? (
        <div
          aria-labelledby="rail-tab-voters"
          className="participant-list min-h-0 max-h-[min(40vh,18rem)] overflow-y-auto pr-1 lg:max-h-none"
          id="rail-panel-voters"
          role="tabpanel"
        >
          {voters.map((participant) => (
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
      ) : (
        <div
          aria-labelledby="rail-tab-observers"
          className="participant-list min-h-0 max-h-[min(40vh,18rem)] overflow-y-auto pr-1 lg:max-h-none"
          id="rail-panel-observers"
          role="tabpanel"
        >
          {observers.map((participant) => (
            <div
              className={`participant-row ${
                participant.id === currentParticipantId ? "participant-row--active" : ""
              }`}
              key={participant.id}
            >
              <div className={`presence-dot presence-dot--${participant.presence}`} />
              <div className="participant-row__identity">
                <strong>{participant.name}</strong>
                <span>OBSERVER</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 pt-3">
        <Button
          className="w-full justify-center"
          onClick={() => onInvite(inviteRole)}
          style={{
            background: "var(--action-accent-bg)",
            color: "var(--action-accent-text)"
          }}
        >
          {roomLinkStatus === "copied"
            ? "LINK COPIED"
            : roomLinkStatus === "error"
              ? "COPY FAILED"
              : activeTab === "observers"
                ? "INVITE_OBSERVER"
                : "INVITE_DEV"}
        </Button>
      </div>
    </aside>
  );
};

export const MobileParticipantStrip = ({
  currentParticipantId,
  voters,
  roundStatus
}: RoomParticipantStatusProps) => (
  <div className="-mx-[var(--shell-pad)] flex gap-2 overflow-x-auto px-[var(--shell-pad)] pb-1 lg:hidden">
    {voters.map((participant) => {
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
