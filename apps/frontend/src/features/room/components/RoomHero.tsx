import {
  COFFEE_VOTE_VALUE,
  UNKNOWN_VOTE_VALUE,
  isNonEstimateVoteValue,
  type RoomSnapshot
} from "@terminal-poker/shared-types";

import { CoffeeVote } from "../../../components/icons";
import { StatusChip } from "../../../components/StatusChip";
import { formatAverage } from "../roomViewUtils";

const isRangeVote = (value: string) => !isNonEstimateVoteValue(value);

interface RoomHeroProps {
  snapshot: RoomSnapshot;
  voterCount: number;
  votedCount: number;
}

export const RoomHero = ({ snapshot, voterCount, votedCount }: RoomHeroProps) => {
  const roundStatusTone = snapshot.round.status === "revealed" ? "success" : "accent";
  const roundStatusLabel = snapshot.round.status === "revealed" ? "REVEALED" : "IN PROGRESS";
  const roundSummary = snapshot.round.summary;
  const hasRoundSummary = Boolean(roundSummary);
  const formattedAverage = formatAverage(roundSummary?.average ?? null);
  const topVoteLabel = roundSummary?.consensus ?? "SPLIT";
  const hasTopVote = roundSummary?.consensus !== null;
  const revealedValuesInOrder = snapshot.votingDeck.filter(
    (value) => isRangeVote(value) && (roundSummary?.counts[value] ?? 0) > 0
  );
  const hasUnknownVotes = (roundSummary?.counts[UNKNOWN_VOTE_VALUE] ?? 0) > 0;
  const rangeLabel =
    revealedValuesInOrder.length > 1
      ? `${revealedValuesInOrder[0]}-${revealedValuesInOrder[revealedValuesInOrder.length - 1]}`
      : revealedValuesInOrder[0] ?? (hasUnknownVotes ? UNKNOWN_VOTE_VALUE : "—");
  const summaryLabel = hasTopVote ? "TOP VOTE" : "RESULT";
  const summaryPrimaryValue =
    hasTopVote
      ? topVoteLabel === COFFEE_VOTE_VALUE
        ? <CoffeeVote variant="hero" />
        : topVoteLabel
      : "SPLIT";

  return (
    <div className="grid gap-3 px-2 py-2 text-center max-[720px]:gap-2 max-[720px]:px-1 max-[720px]:py-1 lg:px-6 lg:py-4">
      <div className="inline-flex justify-center">
        <StatusChip tone={roundStatusTone}>{roundStatusLabel}</StatusChip>
      </div>
      <div className="grid gap-2">
        <div className="hero-card__ticket items-center justify-items-center gap-3">
          <span className="hero-card__label">CURRENT TICKET</span>
          <h1 className="ticket-title text-[clamp(3.1rem,11vw,8rem)] max-[720px]:text-[clamp(2.6rem,10vw,4.6rem)]">
            {snapshot.round.jiraTicketKey ?? "ROUND_OPEN"}
          </h1>
          {snapshot.round.jiraTicketUrl ? (
            <a
              className="ticket-link ticket-link--jira mt-3 inline-flex justify-self-center rounded-none px-5 py-3 no-underline transition"
              href={snapshot.round.jiraTicketUrl}
              rel="noreferrer"
              target="_blank"
            >
              OPEN_IN_JIRA
            </a>
          ) : null}
        </div>
      </div>

      {hasRoundSummary ? (
        <div className="mx-auto w-full max-w-[44rem]">
          <div
            className="grid gap-4 rounded-[24px] border px-4 py-4 text-left shadow-[0_24px_70px_rgba(0,0,0,0.12)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6 md:px-5"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--card-bg) 90%, var(--surface-high) 10%), color-mix(in srgb, var(--card-bg) 96%, transparent))",
              borderColor: "var(--outline)"
            }}
          >
            <div className="grid gap-1.5">
              <span className="hero-card__label">{summaryLabel}</span>
              <strong
                className="inline-flex min-h-[1em] items-center font-['Space_Grotesk'] text-[clamp(2.6rem,5vw,4.5rem)] leading-[0.88] tracking-[-0.08em] uppercase"
                style={{ color: hasTopVote ? "var(--primary)" : "var(--text)" }}
              >
                {summaryPrimaryValue}
              </strong>
            </div>

            <div
              className="grid grid-cols-3 gap-4 border-t pt-4 md:min-w-[19rem] md:border-l md:border-t-0 md:pl-6 md:pt-0"
              style={{ borderColor: "color-mix(in srgb, var(--outline) 76%, transparent)" }}
            >
              {[
                { label: "AVG", value: formattedAverage, accent: true },
                { label: "RANGE", value: rangeLabel, accent: false },
                { label: "VOTES", value: `${votedCount}/${voterCount}`, accent: false }
              ].map((stat) => (
                <div
                  className="grid content-start gap-1 border-l pl-4 first:border-l-0 first:pl-0"
                  key={stat.label}
                  style={{ borderColor: "color-mix(in srgb, var(--outline) 76%, transparent)" }}
                >
                  <span className="hero-card__label">{stat.label}</span>
                  <strong
                    className="font-['Space_Grotesk'] text-[clamp(1.3rem,2.6vw,2rem)] leading-none tracking-[-0.06em] uppercase"
                    style={{ color: stat.accent ? "var(--primary)" : "var(--text)" }}
                  >
                    {stat.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
