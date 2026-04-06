import React from "react";
import { Box, Text } from "ink";
import type { RoundSnapshot } from "@terminal-poker/shared-types";
import { isNonEstimateVoteValue } from "@terminal-poker/shared-types";

interface RoundInfoProps {
  round: RoundSnapshot;
  votedCount: number;
  totalCount: number;
}

function formatAverage(avg: number | null): string {
  if (avg === null) return "—";
  return Number.isInteger(avg) ? String(avg) : avg.toFixed(1);
}

export function RoundInfo({ round, votedCount, totalCount }: RoundInfoProps) {
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

      {round.status === "revealed" && summary && (
        <Box flexDirection="column" marginTop={1}>
          {/* Top vote or split */}
          <Box gap={1}>
            <Text color="gray">{summary.consensus ? "Top vote:" : "Result:"}</Text>
            <Text color={summary.consensus ? "green" : "yellow"} bold>
              {summary.consensus ?? "SPLIT"}
            </Text>
          </Box>

          {/* Stats row: AVG | RANGE | VOTES */}
          <Box gap={2} marginTop={1}>
            <Box gap={1}>
              <Text color="gray">Avg</Text>
              <Text color="cyan" bold>{formatAverage(summary.average)}</Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">Range</Text>
              <Text color="white" bold>{rangeLabel}</Text>
            </Box>
            <Box gap={1}>
              <Text color="gray">Votes</Text>
              <Text color="white" bold>{votedCount}/{totalCount}</Text>
            </Box>
          </Box>

          {/* Distribution */}
          {Object.keys(summary.counts).length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">Distribution</Text>
              <Box gap={2} flexWrap="wrap">
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
