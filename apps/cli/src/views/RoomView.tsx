import React from "react";
import { Box, Text } from "ink";
import type { RoomSnapshot } from "@terminal-poker/shared-types";
import { Participants } from "../components/Participants.js";
import { RoundInfo } from "../components/RoundInfo.js";
import { VotingDeck } from "../components/VotingDeck.js";

type ConnectionStatus = "connecting" | "sync" | "live" | "disconnected";

interface RoomViewProps {
  snapshot: RoomSnapshot;
  connectionStatus: ConnectionStatus;
  termWidth?: number;
}

const STATUS_DISPLAY: Record<ConnectionStatus, { label: string; color: string }> = {
  connecting: { label: "● connecting", color: "yellow" },
  sync: { label: "● sync", color: "yellow" },
  live: { label: "● live", color: "green" },
  disconnected: { label: "○ disconnected", color: "red" },
};

export function RoomView({ snapshot, connectionStatus, termWidth = 80 }: RoomViewProps) {
  const { room, round, participants, viewer } = snapshot;

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
          <Text color={STATUS_DISPLAY[connectionStatus].color}>
            {STATUS_DISPLAY[connectionStatus].label}
          </Text>
        </Box>
        <Text color="gray">{"─".repeat(termWidth)}</Text>
      </Box>

      {/* Main content: round info + participants side by side */}
      <Box gap={4}>
        <Box flexDirection="column" flexGrow={1} gap={1}>
          <RoundInfo round={round} />

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
      <Text color="gray">{"─".repeat(termWidth)}</Text>
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
