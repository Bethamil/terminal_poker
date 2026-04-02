import { describe, expect, it } from "vitest";

import {
  DEFAULT_VOTING_DECK_ID,
  VOTE_CARD_META,
  VOTING_DECK,
  VOTING_DECK_OPTIONS,
  getVoteCardMeta,
  getVotingDeck,
  isVoteValue,
  isVotingDeckId
} from "./votes";

describe("vote deck", () => {
  it("keeps the default modified fibonacci deck order", () => {
    expect(VOTING_DECK).toEqual(["0", "0.5", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?"]);
    expect(DEFAULT_VOTING_DECK_ID).toBe("modified-fibonacci");
  });

  it("exposes keyboard hints for each card", () => {
    expect(VOTE_CARD_META).toHaveLength(VOTING_DECK.length);
    expect(VOTE_CARD_META[1]).toMatchObject({ value: "0.5", shortcut: "2" });
    expect(isVoteValue("?")).toBe(true);
    expect(isVoteValue("XL")).toBe(true);
    expect(isVoteValue("coffee")).toBe(false);
  });

  it("supports the common deck presets", () => {
    expect(VOTING_DECK_OPTIONS.map((deck) => deck.id)).toEqual([
      "modified-fibonacci",
      "fibonacci",
      "powers-of-two",
      "tshirt"
    ]);
    expect(getVotingDeck("fibonacci")).toContain("21");
    expect(getVoteCardMeta("tshirt")[0]).toMatchObject({ value: "XS", shortcut: "1" });
    expect(isVotingDeckId("powers-of-two")).toBe(true);
    expect(isVotingDeckId("coffee")).toBe(false);
  });
});
