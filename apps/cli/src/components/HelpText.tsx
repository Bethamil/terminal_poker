import React from "react";
import { Box, Text } from "ink";
import { getCommandsForContext } from "../lib/commands.js";

interface HelpTextProps {
  isModerator: boolean;
  inRoom: boolean;
}

export function HelpText({ isModerator, inRoom }: HelpTextProps) {
  const commands = getCommandsForContext(inRoom, isModerator);

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
