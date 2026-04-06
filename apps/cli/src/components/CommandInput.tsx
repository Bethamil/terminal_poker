import React, { useMemo } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { getCommandsForContext } from "../lib/commands.js";

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
    return getCommandsForContext(inRoom, isModerator).filter((cmd) =>
      cmd.name.startsWith(query),
    );
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
