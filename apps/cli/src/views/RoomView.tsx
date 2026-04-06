import React from "react";
import { Box, Text } from "ink";
import type { RoomSnapshot } from "@terminal-poker/shared-types";
import { Participants } from "../components/Participants.js";
import { RoundInfo } from "../components/RoundInfo.js";
import { VotingDeck } from "../components/VotingDeck.js";

interface RoomViewProps {
  snapshot: RoomSnapshot;
  connected: boolean;
}

export function RoomView({ snapshot, connected }: RoomViewProps) {
  const { room, round, participants, viewer } = snapshot;

  const votedCount = participants.filter((p) => p.hasVoted).length;
  const totalCount = participants.length;
  const progressPct =
    totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

  return (
    <Box flexDirection="column" gap={1}>
      {/* Room header */}
      <Box flexDirection="column">
        <Box gap={1}>
          <Text bold color="green">{">"} terminal-poker</Text>
          <Text color="gray">/</Text>
          <Text bold color="cyan">{room.code}</Text>
          <Text color="gray">({room.name})</Text>
          <Text color="gray">/</Text>
          <Text color={viewer.role === "moderator" ? "yellow" : "white"}>
            {viewer.role}
          </Text>
          <Box flexGrow={1} />
          <Text color={connected ? "green" : "red"}>
            {connected ? "● connected" : "○ disconnected"}
          </Text>
        </Box>
        <Text color="gray">{"─".repeat(80)}</Text>
      </Box>

      {/* Main content: round info + participants side by side */}
      <Box gap={4}>
        <Box flexDirection="column" flexGrow={1} gap={1}>
          <RoundInfo round={round} />

          {/* Progress bar */}
          {round.status === "active" && (
            <Box flexDirection="column">
              <Box gap={1}>
                <Text color="gray">Progress:</Text>
                <Text color="white" bold>
                  {votedCount}/{totalCount}
                </Text>
                <Text color="gray">({progressPct}%)</Text>
              </Box>
              <Text color="green">
                {"█".repeat(Math.floor(progressPct / 5))}
                <Text color="gray">
                  {"░".repeat(20 - Math.floor(progressPct / 5))}
                </Text>
              </Text>
            </Box>
          )}

          {/* Voting deck */}
          <VotingDeck
            deckId={room.votingDeckId}
            selectedVote={viewer.selectedVote}
            roundStatus={round.status}
          />
        </Box>

        <Box flexDirection="column" width={40}>
          <Participants
            participants={participants}
            roundStatus={round.status}
            viewerId={viewer.participantId}
          />
        </Box>
      </Box>

      {/* Status line */}
      <Text color="gray">{"─".repeat(80)}</Text>
      <Box gap={2}>
        {viewer.selectedVote ? (
          <Text color="cyan">Your vote: <Text bold>{viewer.selectedVote}</Text></Text>
        ) : (
          <Text color="gray" dimColor>No vote cast</Text>
        )}
        {viewer.role === "moderator" && round.status === "active" && (
          <Text color="gray">
            <Text color="yellow" bold>/reveal</Text> to show votes
          </Text>
        )}
        {viewer.role === "moderator" && round.status === "revealed" && (
          <Text color="gray">
            <Text color="yellow" bold>/next</Text> for next round
          </Text>
        )}
      </Box>
    </Box>
  );
}
