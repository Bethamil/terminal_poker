import React from "react";
import { Box, Text } from "ink";
import type { VoteCardMeta, VoteValue, VotingDeckId } from "@terminal-poker/shared-types";
import { VOTING_DECK_PRESETS } from "@terminal-poker/shared-types";

interface VotingDeckProps {
  deckId: VotingDeckId;
  selectedVote: VoteValue | null;
  roundStatus: string;
}

export function VotingDeck({ deckId, selectedVote, roundStatus }: VotingDeckProps) {
  const cards = VOTING_DECK_PRESETS[deckId].cards as readonly VoteCardMeta<VoteValue>[];

  if (roundStatus === "revealed") {
    return (
      <Box>
        <Text color="gray" dimColor>Votes revealed.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text bold color="white">Vote</Text>
        <Text color="gray" dimColor>(type value + Enter)</Text>
      </Box>
      <Box gap={1} flexWrap="wrap">
        {cards.map((card) => {
          const isSelected = selectedVote === card.value;
          return (
            <Box key={card.value}>
              <Text
                color={isSelected ? "black" : "white"}
                backgroundColor={isSelected ? "cyan" : undefined}
                bold={isSelected}
              >
                {card.value}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
