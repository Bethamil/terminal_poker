import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  prompt?: string;
  placeholder?: string;
}

export function CommandInput({
  value,
  onChange,
  onSubmit,
  prompt = ">",
  placeholder,
}: CommandInputProps) {
  return (
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
  );
}
