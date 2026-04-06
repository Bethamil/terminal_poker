import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getRecentRooms } from "../lib/store.js";

interface RecentViewProps {
  onSelect: (code: string, serverUrl: string) => void;
  onBack: () => void;
}

export function RecentView({ onSelect, onBack }: RecentViewProps) {
  const recent = getRecentRooms();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((ch, key) => {
    if (recent.length === 0) return;

    if (key.upArrow) {
      setSelectedIndex((i) => (i === 0 ? recent.length - 1 : i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => (i === recent.length - 1 ? 0 : i + 1));
    }
    if (key.return) {
      const room = recent[selectedIndex];
      if (room) onSelect(room.code, room.serverUrl);
    }
    if (key.escape || (ch === "q" && !key.ctrl)) {
      onBack();
    }
  });

  if (recent.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="white">Recent rooms</Text>
        <Text color="gray" dimColor>  No recent rooms</Text>
        <Text color="gray" dimColor>  Press Esc to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="white">Recent rooms</Text>
      <Text color="gray" dimColor>  ↑↓ navigate — Enter to join — Esc to go back</Text>
      <Text>{""}</Text>
      {recent.map((r, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={r.code} gap={1}>
            <Text color={isSelected ? "green" : "gray"} bold={isSelected}>
              {isSelected ? "  ›" : "   "}
            </Text>
            <Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
              {r.code}
            </Text>
            <Text color="gray">—</Text>
            <Text color={isSelected ? "white" : "gray"}>{r.name}</Text>
            <Text color="gray" dimColor>
              ({new Date(r.lastVisited).toLocaleDateString()})
            </Text>
            <Text color="gray" dimColor>{r.serverUrl}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
