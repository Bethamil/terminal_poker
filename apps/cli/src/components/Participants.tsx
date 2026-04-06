import React from "react";
import { Box, Text } from "ink";
import type { ParticipantSnapshot, RoundStatus } from "@terminal-poker/shared-types";

interface ParticipantsProps {
  participants: ParticipantSnapshot[];
  roundStatus: RoundStatus;
  viewerId: string;
}

export function Participants({ participants, roundStatus, viewerId }: ParticipantsProps) {
  const sorted = [...participants].sort((a, b) => {
    if (a.role === "moderator" && b.role !== "moderator") return -1;
    if (b.role === "moderator" && a.role !== "moderator") return 1;
    return a.name.localeCompare(b.name);
  });

  const onlineCount = participants.filter((p) => p.presence === "online").length;

  return (
    <Box flexDirection="column">
      <Text bold color="white">
        Participants ({onlineCount}/{participants.length})
      </Text>
      <Text color="gray">{"─".repeat(38)}</Text>
      <Box flexDirection="column" marginTop={1} gap={0}>
        {sorted.map((p) => {
          const isYou = p.id === viewerId;
          const presenceDot = p.presence === "online" ? "●" : "○";
          const presenceColor = p.presence === "online" ? "green" : "gray";
          const roleBadge = p.role === "moderator" ? " ★" : "";

          let voteDisplay: string;
          if (roundStatus === "revealed" && p.revealedVote) {
            voteDisplay = p.revealedVote;
          } else if (p.hasVoted) {
            voteDisplay = "✓";
          } else {
            voteDisplay = "–";
          }

          const voteColor =
            roundStatus === "revealed" && p.revealedVote
              ? "cyan"
              : p.hasVoted
                ? "green"
                : "gray";

          return (
            <Box key={p.id} gap={1}>
              <Text color={presenceColor}>{presenceDot}</Text>
              <Text color={isYou ? "cyan" : "white"} bold={isYou}>
                {p.name}{isYou ? " (you)" : ""}{roleBadge}
              </Text>
              <Box flexGrow={1} />
              <Text color={voteColor} bold={roundStatus === "revealed" && !!p.revealedVote}>
                [{voteDisplay}]
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
