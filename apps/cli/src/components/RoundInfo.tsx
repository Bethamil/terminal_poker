import React from "react";
import { Box, Text } from "ink";
import type { RoundSnapshot } from "@terminal-poker/shared-types";
import { isNonEstimateVoteValue } from "@terminal-poker/shared-types";

interface RoundInfoProps {
  round: RoundSnapshot;
  votedCount: number;
  voterCount: number;
}

function formatAverage(avg: number | null): string {
  if (avg === null) return "—";
  return Number.isInteger(avg) ? String(avg) : avg.toFixed(1);
}

export function RoundInfo({ round, votedCount, voterCount }: RoundInfoProps) {
  const statusColor = round.status === "revealed" ? "yellow" : "green";
  const statusLabel = round.status === "revealed" ? "REVEALED" : "VOTING";

  const summary = round.summary;

  // Compute range from revealed votes
  const rangeLabel = (() => {
    if (!summary) return "—";
    const numericVotes = Object.entries(summary.counts)
      .filter(([val, count]) => !isNonEstimateVoteValue(val) && (count ?? 0) > 0)
      .map(([val]) => val);
    if (numericVotes.length === 0) return "—";
    if (numericVotes.length === 1) return numericVotes[0]!;
    return `${numericVotes[0]}–${numericVotes[numericVotes.length - 1]}`;
  })();

  return (
    <Box flexDirection="column" gap={1}>
      {/* Round status */}
      <Box gap={1}>
        <Text bold color="white">Round</Text>
        <Text color={statusColor}>[{statusLabel}]</Text>
        {round.status === "active" && (
          <Text color="gray" dimColor>
            {votedCount}/{voterCount} voted
          </Text>
        )}
      </Box>

      {/* Ticket */}
      {round.jiraTicketKey && (
        <Box flexDirection="column">
          <Text color="gray" dimColor>TICKET</Text>
          <Text color="cyan" bold>{round.jiraTicketKey}</Text>
          {round.jiraTicketUrl && (
            <Text color="gray" dimColor>{round.jiraTicketUrl}</Text>
          )}
        </Box>
      )}

      {/* Results — revealed */}
      {round.status === "revealed" && summary && (
        <Box flexDirection="column" gap={1}>
          {/* Hero: top vote */}
          <Box flexDirection="column">
            <Text color="gray" dimColor>
              {summary.consensus ? "TOP VOTE" : "RESULT"}
            </Text>
            <Text color={summary.consensus ? "green" : "yellow"} bold>
              {"  "}
              {summary.consensus ?? "SPLIT"}
            </Text>
          </Box>

          {/* Stats */}
          <Box gap={4}>
            <Box flexDirection="column">
              <Text color="gray" dimColor>AVG</Text>
              <Text color="cyan" bold>{"  "}{formatAverage(summary.average)}</Text>
            </Box>
            <Box flexDirection="column">
              <Text color="gray" dimColor>RANGE</Text>
              <Text color="white" bold>{"  "}{rangeLabel}</Text>
            </Box>
            <Box flexDirection="column">
              <Text color="gray" dimColor>VOTES</Text>
              <Text color="white" bold>{"  "}{votedCount}/{voterCount}</Text>
            </Box>
          </Box>

          {/* Distribution */}
          {Object.keys(summary.counts).length > 0 && (
            <Box flexDirection="column">
              <Text color="gray" dimColor>DISTRIBUTION</Text>
              <Box gap={3} flexWrap="wrap">
                {Object.entries(summary.counts)
                  .filter(([, count]) => (count ?? 0) > 0)
                  .map(([val, count]) => (
                    <Box key={val} gap={1}>
                      <Text color="cyan" bold>{val}</Text>
                      <Text color="gray">×{count}</Text>
                    </Box>
                  ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
