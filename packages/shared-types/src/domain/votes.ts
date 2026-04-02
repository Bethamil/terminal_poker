export const VOTING_DECK = ["0", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?"] as const;

export type VoteValue = (typeof VOTING_DECK)[number];

export interface VoteCardMeta {
  value: VoteValue;
  label: string;
  shortcut: string;
}

export const VOTE_CARD_META: VoteCardMeta[] = [
  { value: "0", label: "Nothing", shortcut: "1" },
  { value: "1", label: "Trivial", shortcut: "2" },
  { value: "2", label: "Small", shortcut: "3" },
  { value: "3", label: "Medium", shortcut: "4" },
  { value: "5", label: "Standard", shortcut: "5" },
  { value: "8", label: "Large", shortcut: "6" },
  { value: "13", label: "Complex", shortcut: "7" },
  { value: "20", label: "XL", shortcut: "8" },
  { value: "40", label: "Epic", shortcut: "9" },
  { value: "100", label: "Huge", shortcut: "0" },
  { value: "?", label: "Unknown", shortcut: "/" }
];

export const isVoteValue = (value: string): value is VoteValue =>
  VOTING_DECK.includes(value as VoteValue);

