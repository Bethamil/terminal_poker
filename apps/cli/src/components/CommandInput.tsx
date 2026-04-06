import React, { useMemo } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface CommandDef {
  name: string;
  description: string;
  context: "home" | "room" | "both" | "moderator";
}

const COMMANDS: CommandDef[] = [
  { name: "create", description: "Create a new room", context: "home" },
  { name: "join", description: "Join or rejoin a room by code", context: "home" },
  { name: "server", description: "Set or show server URL", context: "home" },
  { name: "name", description: "Set or show display name", context: "home" },
  { name: "recent", description: "Show recent rooms", context: "home" },
  { name: "vote", description: "Cast a vote by value", context: "room" },
  { name: "reveal", description: "Reveal all votes", context: "moderator" },
  { name: "unreveal", description: "Hide votes again", context: "moderator" },
  { name: "next", description: "Start next round", context: "moderator" },
  { name: "ticket", description: "Set Jira ticket for round", context: "moderator" },
  { name: "leave", description: "Leave the room", context: "room" },
  { name: "help", description: "Show help", context: "both" },
  { name: "quit", description: "Exit terminal-poker", context: "both" },
];

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  prompt?: string;
  placeholder?: string;
  inRoom?: boolean;
  isModerator?: boolean;
}

export function CommandInput({
  value,
  onChange,
  onSubmit,
  prompt = ">",
  placeholder,
  inRoom = false,
  isModerator = false,
}: CommandInputProps) {
  const suggestions = useMemo(() => {
    if (!value.startsWith("/") || value.includes(" ")) return [];
    const query = value.slice(1).toLowerCase();
    return COMMANDS.filter((cmd) => {
      // Filter by context
      if (cmd.context === "home" && inRoom) return false;
      if (cmd.context === "room" && !inRoom) return false;
      if (cmd.context === "moderator" && (!inRoom || !isModerator)) return false;
      // Filter by query
      return cmd.name.startsWith(query);
    });
  }, [value, inRoom, isModerator]);

  return (
    <Box flexDirection="column-reverse">
      <Box>
        <Text color="green" bold>
          {prompt}{" "}
        </Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
        />
      </Box>
      {suggestions.length > 0 && (
        <Box flexDirection="column">
          {suggestions.map((cmd) => (
            <Box key={cmd.name} gap={1}>
              <Text color="cyan">/{cmd.name}</Text>
              <Text color="gray" dimColor>{cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
