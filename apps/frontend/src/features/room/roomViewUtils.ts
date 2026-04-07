import type { ParticipantRole, ParticipantSnapshot } from "@terminal-poker/shared-types";

export const countOnlineParticipants = (participants: ParticipantSnapshot[]) =>
  participants.filter((participant) => participant.presence === "online").length;

/** Returns true for roles that can vote (moderator + participant). */
export const isVotingRole = (role: ParticipantRole) => role !== "observer";

/** Splits participants into voters (moderator + participant) and observers. */
export const groupParticipantsByVotingRole = (participants: ParticipantSnapshot[]) => ({
  voters: participants.filter((p) => isVotingRole(p.role)),
  observers: participants.filter((p) => p.role === "observer")
});

export const formatAverage = (average: number | null) => {
  if (average === null) {
    return "n/a";
  }

  return Number.isInteger(average) ? String(average) : average.toFixed(1).replace(/\.0$/, "");
};

export const formatVoteShortcutHint = (shortcuts: string[]) => {
  const normalizedShortcuts = shortcuts.map((shortcut) => shortcut.toUpperCase());
  const numericShortcuts = normalizedShortcuts.filter((shortcut) => /^\d$/.test(shortcut));
  const extraShortcuts = normalizedShortcuts.filter((shortcut) => !/^\d$/.test(shortcut));

  if (numericShortcuts.length === 0) {
    return `[${extraShortcuts.join(" ")}] VOTE`;
  }

  const numericHint = numericShortcuts.includes("0")
    ? "1-0"
    : `1-${numericShortcuts[numericShortcuts.length - 1]}`;

  return extraShortcuts.length > 0
    ? `[${numericHint} ${extraShortcuts.join(" ")}] VOTE`
    : `[${numericHint}] VOTE`;
};
