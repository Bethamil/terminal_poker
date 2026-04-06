import React from "react";
import { Box, Text } from "ink";
import { getRecentRooms, getDefaultServer, getDefaultName } from "../lib/store.js";

export function HomeView() {
  const recent = getRecentRooms();
  const server = getDefaultServer();
  const name = getDefaultName();

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text bold color="green">
          {`  _                      _             _                _             `}
        </Text>
        <Text bold color="green">
          {` | |_ ___ _ _ _ __ (_)_ _  __ _| |  _ __  ___| |_____ _ _ `}
        </Text>
        <Text bold color="green">
          {` |  _/ -_) '_| '  \\| | ' \\/ _\` | | | '_ \\/ _ \\ / / -_) '_|`}
        </Text>
        <Text bold color="green">
          {`  \\__\\___|_| |_|_|_|_|_||_\\__,_|_| | .__/\\___/_\\_\\___|_|  `}
        </Text>
        <Text bold color="green">
          {`                                     |_|                     `}
        </Text>
      </Box>

      <Box flexDirection="column">
        <Text bold color="white">Quick start</Text>
        <Text>  <Text color="cyan">/create</Text>  — Create a new room</Text>
        <Text>  <Text color="cyan">/join CODE</Text> — Join an existing room</Text>
      </Box>

      {recent.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="white">Recent rooms</Text>
          {recent.slice(0, 5).map((r) => (
            <Text key={r.code}>
              <Text color="cyan">  {r.code}</Text>
              <Text color="gray"> — {r.name}</Text>
              <Text color="gray" dimColor>
                {" "}({new Date(r.lastVisited).toLocaleDateString()})
              </Text>
            </Text>
          ))}
        </Box>
      )}

      <Box flexDirection="column">
        <Text bold color="white">Settings</Text>
        <Box gap={1}>
          <Text color="cyan">  /server</Text>
          <Text color="gray">—</Text>
          <Text color="white">{server}</Text>
        </Box>
        <Box gap={1}>
          <Text color="cyan">  /name</Text>
          <Text color="gray">—</Text>
          <Text color={name ? "white" : "gray"} dimColor={!name}>
            {name || "not set"}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
