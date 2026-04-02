import { describe, expect, it } from "vitest";

import { VOTE_CARD_META, VOTING_DECK, isVoteValue } from "./votes";

describe("vote deck", () => {
  it("keeps the fibonacci deck order", () => {
    expect(VOTING_DECK).toEqual(["0", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?"]);
  });

  it("exposes keyboard hints for each card", () => {
    expect(VOTE_CARD_META).toHaveLength(VOTING_DECK.length);
    expect(VOTE_CARD_META[4]).toMatchObject({ value: "5", shortcut: "5" });
    expect(isVoteValue("?")).toBe(true);
    expect(isVoteValue("coffee")).toBe(false);
  });
});
