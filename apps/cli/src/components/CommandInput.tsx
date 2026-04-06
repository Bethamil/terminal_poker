import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
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
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  useEffect(() => {
    if (suggestions.length === 0) {
      setSelectedSuggestionIndex(0);
      return;
    }

    setSelectedSuggestionIndex((currentIndex) =>
      Math.min(currentIndex, suggestions.length - 1),
    );
  }, [suggestions]);

  useInput((_, key) => {
    if (suggestions.length === 0) {
      return;
    }

    if (key.upArrow) {
      setSelectedSuggestionIndex((currentIndex) =>
        currentIndex === 0 ? suggestions.length - 1 : currentIndex - 1,
      );
    }

    if (key.downArrow) {
      setSelectedSuggestionIndex((currentIndex) =>
        currentIndex === suggestions.length - 1 ? 0 : currentIndex + 1,
      );
    }
  });

  const handleSubmit = (submittedValue: string) => {
    const selectedSuggestion = suggestions[selectedSuggestionIndex];
    onSubmit(selectedSuggestion ? `/${selectedSuggestion.name}` : submittedValue);
  };

  return (
    <Box flexDirection="column-reverse">
      <Box>
        <Text color="green" bold>
          {prompt}{" "}
        </Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={handleSubmit}
          placeholder={placeholder}
        />
      </Box>
      {suggestions.length > 0 && (
        <Box flexDirection="column">
          {suggestions.map((cmd, index) => {
            const isSelected = index === selectedSuggestionIndex;

            return (
            <Box key={cmd.name} gap={1}>
              <Text color={isSelected ? "green" : "cyan"} bold={isSelected}>
                {isSelected ? "›" : " "} /{cmd.name}
                {cmd.args ? ` ${cmd.args}` : ""}
              </Text>
              <Text color={isSelected ? "white" : "gray"} dimColor={!isSelected}>
                {cmd.description}
              </Text>
            </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
