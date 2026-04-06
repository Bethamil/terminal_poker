import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  roomCode?: string;
  roomName?: string;
  role?: string;
  connected?: boolean;
}

export function Header({ roomCode, roomName, role, connected }: HeaderProps) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="green">
          {">"} terminal-poker
        </Text>
        {roomCode && (
          <>
            <Text color="gray"> / </Text>
            <Text bold color="cyan">
              {roomCode}
            </Text>
            {roomName && (
              <Text color="gray"> ({roomName})</Text>
            )}
          </>
        )}
        {role && (
          <>
            <Text color="gray"> / </Text>
            <Text color={role === "moderator" ? "yellow" : "white"}>
              {role}
            </Text>
          </>
        )}
        <Box flexGrow={1} />
        {roomCode && (
          <Text color={connected ? "green" : "red"}>
            {connected ? "● connected" : "○ disconnected"}
          </Text>
        )}
      </Box>
      <Text color="gray">{"─".repeat(80)}</Text>
    </Box>
  );
}
