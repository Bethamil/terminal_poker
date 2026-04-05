export interface VoteCardMeta<TValue extends string = string> {
  value: TValue;
  label: string;
  shortcut: string;
}

export const UNKNOWN_VOTE_VALUE = "?" as const;
export const COFFEE_VOTE_VALUE = "COFFEE" as const;

export const VOTING_DECK_IDS = ["modified-fibonacci", "fibonacci", "powers-of-two", "tshirt"] as const;

export type VotingDeckId = (typeof VOTING_DECK_IDS)[number];

interface VotingDeckDefinition {
  name: string;
  description: string;
  cards: readonly VoteCardMeta[];
}

export const VOTING_DECK_PRESETS = {
  "modified-fibonacci": {
    name: "Modified Fibonacci",
    description: "Most common planning-poker deck with rounded larger values and a 0.5 card.",
    cards: [
      { value: "0", label: "No effort", shortcut: "1" },
      { value: "0.5", label: "Tiny", shortcut: "2" },
      { value: "1", label: "Trivial", shortcut: "3" },
      { value: "2", label: "Small", shortcut: "4" },
      { value: "3", label: "Medium", shortcut: "5" },
      { value: "5", label: "Standard", shortcut: "6" },
      { value: "8", label: "Large", shortcut: "7" },
      { value: "13", label: "Complex", shortcut: "8" },
      { value: "20", label: "XL", shortcut: "9" },
      { value: "40", label: "Epic", shortcut: "0" },
      { value: "100", label: "Huge", shortcut: "-" },
      { value: UNKNOWN_VOTE_VALUE, label: "Unknown", shortcut: "/" },
      { value: COFFEE_VOTE_VALUE, label: "Coffee", shortcut: "c" }
    ]
  },
  fibonacci: {
    name: "Fibonacci",
    description: "Classic Fibonacci progression for teams that prefer exact sequence steps.",
    cards: [
      { value: "0", label: "No effort", shortcut: "1" },
      { value: "1", label: "Trivial", shortcut: "2" },
      { value: "2", label: "Small", shortcut: "3" },
      { value: "3", label: "Medium", shortcut: "4" },
      { value: "5", label: "Standard", shortcut: "5" },
      { value: "8", label: "Large", shortcut: "6" },
      { value: "13", label: "Complex", shortcut: "7" },
      { value: "21", label: "XL", shortcut: "8" },
      { value: "34", label: "Epic", shortcut: "9" },
      { value: "55", label: "Huge", shortcut: "0" },
      { value: "89", label: "Massive", shortcut: "-" },
      { value: UNKNOWN_VOTE_VALUE, label: "Unknown", shortcut: "/" },
      { value: COFFEE_VOTE_VALUE, label: "Coffee", shortcut: "c" }
    ]
  },
  "powers-of-two": {
    name: "Powers of Two",
    description: "Simple doubling scale for teams that want larger gaps with easier mental math.",
    cards: [
      { value: "0", label: "No effort", shortcut: "1" },
      { value: "1", label: "Tiny", shortcut: "2" },
      { value: "2", label: "Small", shortcut: "3" },
      { value: "4", label: "Medium", shortcut: "4" },
      { value: "8", label: "Large", shortcut: "5" },
      { value: "16", label: "XL", shortcut: "6" },
      { value: "32", label: "Epic", shortcut: "7" },
      { value: "64", label: "Huge", shortcut: "8" },
      { value: UNKNOWN_VOTE_VALUE, label: "Unknown", shortcut: "/" },
      { value: COFFEE_VOTE_VALUE, label: "Coffee", shortcut: "c" }
    ]
  },
  tshirt: {
    name: "T-Shirt Sizes",
    description: "Rough sizing deck for early-stage estimation when relative size matters most.",
    cards: [
      { value: "XS", label: "Extra small", shortcut: "1" },
      { value: "S", label: "Small", shortcut: "2" },
      { value: "M", label: "Medium", shortcut: "3" },
      { value: "L", label: "Large", shortcut: "4" },
      { value: "XL", label: "Extra large", shortcut: "5" },
      { value: "XXL", label: "Oversized", shortcut: "6" },
      { value: UNKNOWN_VOTE_VALUE, label: "Unknown", shortcut: "/" },
      { value: COFFEE_VOTE_VALUE, label: "Coffee", shortcut: "c" }
    ]
  }
} as const satisfies Record<VotingDeckId, VotingDeckDefinition>;

export type VoteValue = {
  [DeckId in VotingDeckId]: (typeof VOTING_DECK_PRESETS)[DeckId]["cards"][number]["value"];
}[VotingDeckId];

export interface VotingDeckOption {
  id: VotingDeckId;
  name: string;
  description: string;
}

export const DEFAULT_VOTING_DECK_ID: VotingDeckId = "modified-fibonacci";

export const VOTING_DECK_OPTIONS: VotingDeckOption[] = VOTING_DECK_IDS.map((id) => ({
  id,
  name: VOTING_DECK_PRESETS[id].name,
  description: VOTING_DECK_PRESETS[id].description
}));

const ALL_VOTE_VALUES = VOTING_DECK_IDS.flatMap((id) => VOTING_DECK_PRESETS[id].cards.map((card) => card.value));
const ALL_VOTE_VALUES_SET = new Set<string>(ALL_VOTE_VALUES);

export const getVoteCardMeta = (deckId: VotingDeckId): VoteCardMeta<VoteValue>[] =>
  [...VOTING_DECK_PRESETS[deckId].cards] as VoteCardMeta<VoteValue>[];

export const getVotingDeck = (deckId: VotingDeckId): VoteValue[] =>
  getVoteCardMeta(deckId).map((card) => card.value as VoteValue);

export const getVotingDeckName = (deckId: VotingDeckId): string => VOTING_DECK_PRESETS[deckId].name;

export const resolveVotingDeckId = (value: string | null | undefined): VotingDeckId =>
  isVotingDeckId(value) ? value : DEFAULT_VOTING_DECK_ID;

export const VOTING_DECK = getVotingDeck(DEFAULT_VOTING_DECK_ID);

export const VOTE_CARD_META = getVoteCardMeta(DEFAULT_VOTING_DECK_ID);

export const isVoteValue = (value: string): value is VoteValue =>
  ALL_VOTE_VALUES_SET.has(value);

export const isVotingDeckId = (value: string | null | undefined): value is VotingDeckId =>
  Boolean(value && VOTING_DECK_IDS.includes(value as VotingDeckId));
