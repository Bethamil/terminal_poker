import React from "react";
import { Box, Text } from "ink";

interface HelpTextProps {
  isModerator: boolean;
  inRoom: boolean;
}

export function HelpText({ isModerator, inRoom }: HelpTextProps) {
  return (
    <Box flexDirection="column">
      <Text bold color="green">Terminal Poker Commands</Text>
      <Text color="gray">{"─".repeat(40)}</Text>

      {!inRoom && (
        <>
          <Text>
            <Text color="cyan" bold>/create</Text>
            <Text color="gray"> — Create a new room</Text>
          </Text>
          <Text>
            <Text color="cyan" bold>/join CODE</Text>
            <Text color="gray"> — Join a room by code</Text>
          </Text>
          <Text>
            <Text color="cyan" bold>/rejoin CODE</Text>
            <Text color="gray"> — Rejoin a saved session</Text>
          </Text>
          <Text>
            <Text color="cyan" bold>/server URL</Text>
            <Text color="gray"> — Set server URL</Text>
          </Text>
          <Text>
            <Text color="cyan" bold>/name NAME</Text>
            <Text color="gray"> — Set default display name</Text>
          </Text>
          <Text>
            <Text color="cyan" bold>/recent</Text>
            <Text color="gray"> — Show recent rooms</Text>
          </Text>
        </>
      )}

      {inRoom && (
        <>
          <Text>
            <Text color="cyan" bold>1-9, 0, -, /, c</Text>
            <Text color="gray"> — Cast vote (shortcut keys)</Text>
          </Text>
          <Text>
            <Text color="cyan" bold>/vote VALUE</Text>
            <Text color="gray"> — Cast vote by value</Text>
          </Text>
          {isModerator && (
            <>
              <Text>
                <Text color="yellow" bold>/reveal</Text>
                <Text color="gray"> — Reveal all votes (or press </Text>
                <Text color="yellow" bold>r</Text>
                <Text color="gray">)</Text>
              </Text>
              <Text>
                <Text color="yellow" bold>/unreveal</Text>
                <Text color="gray"> — Hide votes again</Text>
              </Text>
              <Text>
                <Text color="yellow" bold>/next</Text>
                <Text color="gray"> — Start next round (or press </Text>
                <Text color="yellow" bold>n</Text>
                <Text color="gray">)</Text>
              </Text>
              <Text>
                <Text color="yellow" bold>/ticket KEY</Text>
                <Text color="gray"> — Set Jira ticket for round</Text>
              </Text>
            </>
          )}
          <Text>
            <Text color="cyan" bold>/leave</Text>
            <Text color="gray"> — Leave the room</Text>
          </Text>
        </>
      )}

      <Text>
        <Text color="cyan" bold>/help</Text>
        <Text color="gray"> — Show this help</Text>
      </Text>
      <Text>
        <Text color="cyan" bold>/quit</Text>
        <Text color="gray"> — Exit terminal-poker</Text>
      </Text>
    </Box>
  );
}
