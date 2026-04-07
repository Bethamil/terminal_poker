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
    if (a.role === "participant" && b.role === "observer") return -1;
    if (b.role === "participant" && a.role === "observer") return 1;
    return a.name.localeCompare(b.name);
  });
  const voters = sorted.filter((participant) => participant.role !== "observer");
  const observers = sorted.filter((participant) => participant.role === "observer");

  const onlineCount = participants.filter((p) => p.presence === "online").length;

  return (
    <Box flexDirection="column">
      <Text bold color="white">
        Participants ({onlineCount}/{participants.length})
      </Text>
      <Text color="gray">{"─".repeat(38)}</Text>
      <Box flexDirection="column" marginTop={1} gap={1}>
        <ParticipantGroup
          label={`Voters (${voters.length})`}
          participants={voters}
          roundStatus={roundStatus}
          viewerId={viewerId}
        />
        {observers.length > 0 && (
          <ParticipantGroup
            label={`Observers (${observers.length})`}
            participants={observers}
            roundStatus={roundStatus}
            viewerId={viewerId}
          />
        )}
      </Box>
    </Box>
  );
}

interface ParticipantGroupProps {
  label: string;
  participants: ParticipantSnapshot[];
  roundStatus: RoundStatus;
  viewerId: string;
}

function ParticipantGroup({
  label,
  participants,
  roundStatus,
  viewerId,
}: ParticipantGroupProps) {
  return (
    <Box flexDirection="column" gap={0}>
      <Text color="gray">{label}</Text>
      {participants.map((participant) => {
        const isYou = participant.id === viewerId;
        const presenceDot = participant.presence === "online" ? "●" : "○";
        const presenceColor = participant.presence === "online" ? "green" : "gray";
        let voteDisplay: string;
        let voteColor = "gray";
        if (participant.role === "observer") {
          voteDisplay = "obs";
          voteColor = "magenta";
        } else if (roundStatus === "revealed" && participant.revealedVote) {
          voteDisplay = participant.revealedVote;
          voteColor = "cyan";
        } else if (participant.hasVoted) {
          voteDisplay = "✓";
          voteColor = "green";
        } else {
          voteDisplay = "–";
        }

        return (
          <Box key={participant.id} gap={1}>
            <Text color={presenceColor}>{presenceDot}</Text>
            <Text color={isYou ? "cyan" : "white"} bold={isYou}>
              {participant.name}
              {isYou ? " (you)" : ""}
            </Text>
            {participant.role === "moderator" && <Text color="yellow">[HOST]</Text>}
            <Box flexGrow={1} />
            <Text color={voteColor} bold={roundStatus === "revealed" && !!participant.revealedVote}>
              [{voteDisplay}]
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
