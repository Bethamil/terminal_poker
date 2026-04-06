import React from "react";
import { Box, Text } from "ink";
import type { RoundSnapshot } from "@terminal-poker/shared-types";

interface RoundInfoProps {
  round: RoundSnapshot;
}

export function RoundInfo({ round }: RoundInfoProps) {
  const statusColor = round.status === "revealed" ? "yellow" : "green";
  const statusLabel = round.status === "revealed" ? "REVEALED" : "VOTING";

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text bold color="white">Round</Text>
        <Text color={statusColor}>[{statusLabel}]</Text>
      </Box>

      {round.jiraTicketKey && (
        <Box gap={1}>
          <Text color="gray">Ticket:</Text>
          <Text color="cyan" bold>{round.jiraTicketKey}</Text>
          {round.jiraTicketUrl && (
            <Text color="gray" dimColor> {round.jiraTicketUrl}</Text>
          )}
        </Box>
      )}

      {round.status === "revealed" && round.summary && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="yellow">Results</Text>
          {round.summary.average !== null && (
            <Box gap={1}>
              <Text color="gray">Average:</Text>
              <Text color="white" bold>
                {Number.isInteger(round.summary.average)
                  ? round.summary.average
                  : round.summary.average.toFixed(1)}
              </Text>
            </Box>
          )}
          {round.summary.consensus && (
            <Box gap={1}>
              <Text color="gray">Consensus:</Text>
              <Text color="green" bold>{round.summary.consensus}</Text>
            </Box>
          )}
          {Object.keys(round.summary.counts).length > 0 && (
            <Box gap={1}>
              <Text color="gray">Votes:</Text>
              <Text color="white">
                {Object.entries(round.summary.counts)
                  .map(([val, count]) => `${val}×${count}`)
                  .join("  ")}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
