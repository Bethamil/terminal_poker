import React from "react";
import { Box, Text } from "ink";
import type { ParticipantRole } from "@terminal-poker/shared-types";
import { getCommandsForContext } from "../lib/commands.js";

interface HelpTextProps {
  inRoom: boolean;
  viewerRole?: ParticipantRole | null;
}

export function HelpText({ inRoom, viewerRole = null }: HelpTextProps) {
  const commands = getCommandsForContext(inRoom, viewerRole);

  return (
    <Box flexDirection="column">
      <Text bold color="green">Terminal Poker Commands</Text>
      <Text color="gray">{"─".repeat(40)}</Text>
      {commands.map((cmd) => (
        <Text key={cmd.name}>
          <Text color={cmd.context === "moderator" ? "yellow" : "cyan"} bold>
            /{cmd.name}{cmd.args ? ` ${cmd.args}` : ""}
          </Text>
          <Text color="gray"> — {cmd.description}</Text>
        </Text>
      ))}
    </Box>
  );
}
