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
    <Box flexDirection="column" gap={1}>
      <Text color="gray" dimColor>VOTE <Text color="gray">(type value + Enter)</Text></Text>
      <Box gap={1} flexWrap="wrap">
        {cards.map((card) => {
          const isSelected = selectedVote === card.value;
          const label = ` ${card.value} `;
          return (
            <Box key={card.value}>
              <Text
                color={isSelected ? "black" : "black"}
                backgroundColor={isSelected ? "cyan" : "white"}
                bold
              >
                {label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
