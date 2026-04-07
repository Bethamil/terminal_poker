import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useApp, useStdout } from "ink";
import type { JoinableRole } from "@terminal-poker/shared-types";
import { createApiClient } from "./lib/api.js";
import type { ApiClient } from "./lib/api.js";
import { parseRoomInput } from "./lib/commands.js";
import {
  getDefaultServer,
  setDefaultServer,
} from "./lib/store.js";
import { useRoomConnection } from "./hooks/useRoomConnection.js";
import { useInputMode } from "./hooks/useInputMode.js";
import { useCommands } from "./hooks/useCommands.js";
import { CommandInput } from "./components/CommandInput.js";
import { HomeView } from "./views/HomeView.js";
import { RecentView } from "./views/RecentView.js";
import { RoomView } from "./views/RoomView.js";

type Screen = "home" | "room" | "recent";

interface LogEntry {
  text: string;
  color: string;
}

function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    width: stdout?.columns ?? 80,
    height: stdout?.rows ?? 24,
  });

  useEffect(() => {
    const onResize = () => {
      setSize({
        width: stdout?.columns ?? 80,
        height: stdout?.rows ?? 24,
      });
    };
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
}

interface AppProps {
  initialJoin?: string;
  initialJoinRole?: JoinableRole;
}

export function App({ initialJoin, initialJoinRole = "participant" }: AppProps) {
  const { exit } = useApp();
  const { width: termWidth, height: termHeight } = useTerminalSize();

  const [screen, setScreen] = useState<Screen>("home");
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const apiRef = useRef<ApiClient>(createApiClient(getDefaultServer()));

  const log = useCallback((text: string, color = "gray") => {
    setLogs((prev) => [...prev.slice(-20), { text, color }]);
  }, []);

  const goHome = useCallback(() => {
    room.disconnect();
    flow.clear();
    setScreen("home");
  }, []);

  const room = useRoomConnection({
    log,
    onNewRound: () => setLogs([{ text: "New round started", color: "green" }]),
    onSessionEnded: () => {
      flow.clear();
      setScreen("home");
    },
  });

  const flow = useInputMode({
    log,
    connectToRoom: (...args) => {
      room.connectToRoom(...args);
      setScreen("room");
    },
    apiRef,
  });

  const handleCommand = useCommands({
    session: room.session,
    snapshot: room.snapshot,
    connectionStatus: room.connectionStatus,
    inputMode: flow.inputMode,
    log,
    showRecent: () => setScreen("recent"),
    exit,
    apiRef,
    goHome,
    room,
    flow,
  });

  // Auto-join from --join flag
  const initialJoinDone = useRef(false);
  useEffect(() => {
    if (initialJoin && !initialJoinDone.current) {
      initialJoinDone.current = true;
      const parsed = parseRoomInput(initialJoin);
      if (parsed.serverUrl) {
        setDefaultServer(parsed.serverUrl);
        apiRef.current = createApiClient(parsed.serverUrl);
      }
      flow.startJoin(parsed.code, parsed.role ?? initialJoinRole);
    }
  }, [initialJoin, initialJoinRole, flow.startJoin]);

  const handleSubmit = useCallback(
    (value: string) => {
      setInput("");
      handleCommand(value);
    },
    [handleCommand],
  );

  // Derive prompt and placeholder from current state
  let prompt = ">";
  let placeholder = "Type / for commands";

  if (flow.inputMode) {
    switch (flow.inputMode) {
      case "create-name":
      case "join-name":
        prompt = "name >";
        placeholder = "Your display name";
        break;
      case "create-room":
        prompt = "room >";
        placeholder = "Room name";
        break;
      case "create-deck":
        prompt = "deck >";
        placeholder = "1–4";
        break;
      case "create-jira":
        prompt = "jira >";
        placeholder = "https://... or enter to skip";
        break;
      case "create-passcode":
        prompt = "passcode >";
        placeholder = "optional or enter to skip";
        break;
      case "join-code":
      case "join-observer-code":
        prompt = "code >";
        placeholder = "e.g. ABC12";
        break;
      case "join-passcode":
        prompt = "passcode >";
        placeholder = "Room passcode";
        break;
    }
  } else if (room.session) {
    prompt = `${room.session.roomCode} >`;
    placeholder =
      room.snapshot?.viewer.role === "observer"
        ? "Observing only. Type / for commands"
        : "Vote or type / for commands";
  }

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight} paddingX={1}>
      {/* Main content area */}
      <Box flexDirection="column" flexGrow={1}>
        {screen === "home" && <HomeView />}
        {screen === "recent" && (
          <RecentView
            onSelect={(code, serverUrl) => {
              setDefaultServer(serverUrl);
              apiRef.current = createApiClient(serverUrl);
              flow.startJoin(code);
            }}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "room" && room.snapshot && (
          <RoomView
            snapshot={room.snapshot}
            connectionStatus={room.connectionStatus}
            termWidth={termWidth - 2}
          />
        )}
      </Box>

      {/* Log — last message only */}
      {logs.length > 0 && (
        <Box>
          <Text color={logs[logs.length - 1]!.color}>
            {logs[logs.length - 1]!.text}
          </Text>
        </Box>
      )}

      {/* Input line */}
      <Box>
        <Text color="gray">{"─".repeat(Math.max(termWidth - 2, 0))}</Text>
      </Box>
      <CommandInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        prompt={prompt}
        placeholder={placeholder}
        inRoom={!!room.session}
        viewerRole={room.snapshot?.viewer.role}
      />
    </Box>
  );
}
