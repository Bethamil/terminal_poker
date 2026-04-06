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

  const votedCount = participants.filter((p) => p.hasVoted).length;
  const totalCount = participants.length;

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

      {/* Main content */}
      <Box gap={4} flexGrow={1}>
        {/* Left: round info, voting, status */}
        <Box flexDirection="column" flexGrow={1} gap={1} paddingTop={1}>
          <RoundInfo round={round} votedCount={votedCount} totalCount={totalCount} />

          <Box marginTop={1}>
            <VotingDeck
              deckId={room.votingDeckId}
              selectedVote={viewer.selectedVote}
              roundStatus={round.status}
            />
          </Box>

          {/* Your vote */}
          {viewer.selectedVote && (
            <Box marginTop={1}>
              <Text color="cyan" bold>Your vote: {viewer.selectedVote}</Text>
            </Box>
          )}

          {/* Moderator hints */}
          {viewer.role === "moderator" && round.status === "active" && (
            <Box marginTop={1}>
              <Text color="gray">
                <Text color="yellow" bold>/reveal</Text> to show votes
              </Text>
            </Box>
          )}
          {viewer.role === "moderator" && round.status === "revealed" && (
            <Box marginTop={1}>
              <Text color="gray">
                <Text color="yellow" bold>/next</Text> for next round
              </Text>
            </Box>
          )}
        </Box>

        {/* Right: participants */}
        <Box flexDirection="column" width={40} paddingTop={1}>
          <Participants
            participants={participants}
            roundStatus={round.status}
            viewerId={viewer.participantId}
          />
        </Box>
      </Box>
    </Box>
  );
}
