import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useApp } from "ink";
import type { RoomSnapshot, VoteValue } from "@terminal-poker/shared-types";
import { VOTING_DECK_PRESETS } from "@terminal-poker/shared-types";
import { createApiClient, ApiError } from "./lib/api.js";
import type { ApiClient } from "./lib/api.js";
import { createRoomSocket } from "./lib/socket.js";
import type { RoomSocket } from "./lib/socket.js";
import {
  getDefaultServer,
  getDefaultName,
  setDefaultServer,
  setDefaultName,
  getSession,
  saveSession,
  clearSession,
  getRecentRooms,
} from "./lib/store.js";
import { CommandInput } from "./components/CommandInput.js";
import { HelpText } from "./components/HelpText.js";
import { HomeView } from "./views/HomeView.js";
import { RoomView } from "./views/RoomView.js";

type Screen = "home" | "room" | "help" | "creating" | "joining";

interface RoomSession {
  roomCode: string;
  participantToken: string;
}

interface LogEntry {
  text: string;
  color: string;
}

export function App() {
  const { exit } = useApp();

  const [screen, setScreen] = useState<Screen>("home");
  const [input, setInput] = useState("");
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inputMode, setInputMode] = useState<null | "create-name" | "create-room" | "join-code" | "join-name" | "join-passcode">(null);
  const [pendingData, setPendingData] = useState<Record<string, string>>({});

  const socketRef = useRef<RoomSocket | null>(null);
  const apiRef = useRef<ApiClient>(createApiClient(getDefaultServer()));

  const log = useCallback((text: string, color = "gray") => {
    setLogs((prev) => [...prev.slice(-20), { text, color }]);
  }, []);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Connect socket to room
  const connectToRoom = useCallback(
    (roomCode: string, participantToken: string, snap: RoomSnapshot) => {
      // Disconnect existing
      socketRef.current?.disconnect();

      const serverUrl = getDefaultServer();
      const socket = createRoomSocket(serverUrl);
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit(
          "room:joinRealtime",
          { roomCode, participantToken },
          (result) => {
            if (result && "ok" in result && result.ok) {
              setConnected(true);
              log("Connected to room", "green");
            } else {
              const err = result && "error" in result ? result.error : null;
              log(`Failed to join realtime: ${err?.message ?? "unknown"}`, "red");
            }
          },
        );
      });

      socket.on("disconnect", () => {
        setConnected(false);
        log("Disconnected", "yellow");
      });

      socket.on("room:snapshot", (newSnapshot) => {
        setSnapshot(newSnapshot);
      });

      socket.on("round:updated", (newSnapshot) => {
        setSnapshot(newSnapshot);
      });

      socket.on("vote:status", (payload) => {
        setSnapshot((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.id === payload.participantId
                ? { ...p, hasVoted: payload.hasVoted }
                : p,
            ),
          };
        });
      });

      socket.on("room:error", (payload) => {
        log(`Error: ${payload.message}`, "red");
        if (
          payload.code === "ROOM_CLOSED" ||
          payload.code === "KICKED" ||
          payload.code === "INVALID_SESSION"
        ) {
          disconnectAndGoHome();
          log("Session ended. Returning home.", "yellow");
        }
      });

      socket.connect();
      setSnapshot(snap);
      setSession({ roomCode, participantToken });
      setScreen("room");
    },
    [log],
  );

  const disconnectAndGoHome = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnected(false);
    setSnapshot(null);
    setSession(null);
    setScreen("home");
    setInputMode(null);
    setPendingData({});
  }, []);

  // Process commands
  const handleCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      // Handle input mode (multi-step forms)
      if (inputMode) {
        await handleInputMode(trimmed);
        return;
      }

      // Parse slash commands
      if (trimmed.startsWith("/")) {
        const parts = trimmed.slice(1).split(/\s+/);
        const cmd = parts[0]!.toLowerCase();
        const args = parts.slice(1).join(" ");

        switch (cmd) {
          case "quit":
          case "exit":
          case "q":
            if (session) {
              try {
                await apiRef.current.leaveRoom(
                  session.roomCode,
                  session.participantToken,
                );
              } catch {
                // Best effort
              }
              clearSession(session.roomCode);
            }
            exit();
            return;

          case "help":
          case "h":
            setScreen(screen === "room" ? "room" : "help");
            if (screen === "room") {
              log("Commands: /vote, /reveal, /next, /ticket, /leave, /help, /quit", "gray");
            } else {
              setScreen("help");
            }
            return;

          case "create":
            startCreate();
            return;

          case "join":
            if (args) {
              startJoin(args.toUpperCase());
            } else {
              setInputMode("join-code");
              log("Enter room code:", "cyan");
            }
            return;

          case "server": {
            if (!args) {
              log(`Current server: ${getDefaultServer()}`, "gray");
              return;
            }
            setDefaultServer(args);
            apiRef.current = createApiClient(args);
            log(`Server set to ${args}`, "green");
            return;
          }

          case "name": {
            if (!args) {
              const n = getDefaultName();
              log(n ? `Default name: ${n}` : "No default name set", "gray");
              return;
            }
            setDefaultName(args);
            log(`Default name set to "${args}"`, "green");
            return;
          }

          case "recent": {
            const recent = getRecentRooms();
            if (recent.length === 0) {
              log("No recent rooms", "gray");
            } else {
              recent.forEach((r) =>
                log(`  ${r.code} — ${r.name}`, "cyan"),
              );
            }
            return;
          }

          // In-room commands
          case "vote": {
            if (!session || !snapshot) {
              log("Not in a room", "red");
              return;
            }
            if (!args) {
              log("Usage: /vote VALUE", "red");
              return;
            }
            socketRef.current?.emit("vote:cast", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
              value: args as VoteValue,
            });
            log(`Voted: ${args}`, "cyan");
            return;
          }

          case "reveal": {
            if (!session) return;
            socketRef.current?.emit("round:reveal", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
            });
            log("Revealing votes...", "yellow");
            return;
          }

          case "unreveal": {
            if (!session) return;
            socketRef.current?.emit("round:unreveal", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
            });
            log("Hiding votes...", "yellow");
            return;
          }

          case "next":
          case "reset": {
            if (!session) return;
            socketRef.current?.emit("round:reset", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
            });
            log("Starting next round...", "yellow");
            return;
          }

          case "ticket": {
            if (!session) return;
            socketRef.current?.emit("round:setTicket", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
              jiraTicketKey: args || null,
            });
            log(args ? `Ticket set: ${args}` : "Ticket cleared", "cyan");
            return;
          }

          case "leave": {
            if (!session) {
              log("Not in a room", "red");
              return;
            }
            try {
              await apiRef.current.leaveRoom(
                session.roomCode,
                session.participantToken,
              );
              clearSession(session.roomCode);
              log("Left room", "yellow");
            } catch {
              log("Error leaving room", "red");
            }
            disconnectAndGoHome();
            return;
          }

          case "back": {
            if (screen === "help") {
              setScreen(session ? "room" : "home");
            }
            return;
          }

          default:
            log(`Unknown command: /${cmd}. Type /help for commands.`, "red");
            return;
        }
      }

      // If in room and not a command, treat as a quick vote attempt
      if (session && snapshot && snapshot.round.status === "active") {
        const cards = VOTING_DECK_PRESETS[snapshot.room.votingDeckId].cards;
        const card = cards.find(
          (c) => c.value.toLowerCase() === trimmed.toLowerCase(),
        );
        if (card) {
          socketRef.current?.emit("vote:cast", {
            roomCode: session.roomCode,
            participantToken: session.participantToken,
            value: card.value as VoteValue,
          });
          log(`Voted: ${card.value}`, "cyan");
          return;
        }
      }

      log(`Unknown input. Type /help for commands.`, "gray");
    },
    [screen, session, snapshot, inputMode, connectToRoom, disconnectAndGoHome, exit, log],
  );

  // Multi-step create flow
  const startCreate = useCallback(() => {
    const name = getDefaultName();
    if (name) {
      setPendingData({ userName: name });
      setInputMode("create-room");
      log(`Using name: ${name}. Enter room name:`, "cyan");
    } else {
      setInputMode("create-name");
      log("Enter your display name:", "cyan");
    }
  }, [log]);

  // Multi-step join flow (tries to rejoin saved session first)
  const startJoin = useCallback(
    async (code: string) => {
      // Try rejoin from saved session first
      const saved = getSession(code);
      if (saved) {
        log(`Rejoining ${code}...`, "cyan");
        try {
          apiRef.current = createApiClient(saved.serverUrl);
          const { snapshot: snap } = await apiRef.current.getRoomState(
            saved.roomCode,
            saved.participantToken,
          );
          connectToRoom(saved.roomCode, saved.participantToken, snap);
          return;
        } catch {
          log("Saved session expired, joining fresh...", "yellow");
          clearSession(code);
        }
      }

      // Fall through to normal join
      const name = getDefaultName();
      setPendingData({ roomCode: code });
      if (name) {
        setPendingData((prev) => ({ ...prev, userName: name }));
        doJoin(code, name);
      } else {
        setInputMode("join-name");
        log(`Joining ${code}. Enter your display name:`, "cyan");
      }
    },
    [log, connectToRoom],
  );

  const handleInputMode = useCallback(
    async (value: string) => {
      switch (inputMode) {
        case "create-name":
          setPendingData((prev) => ({ ...prev, userName: value }));
          setDefaultName(value);
          setInputMode("create-room");
          log("Enter room name:", "cyan");
          break;

        case "create-room": {
          setPendingData((prev) => ({ ...prev, roomName: value }));
          setInputMode(null);
          const userName = pendingData.userName ?? getDefaultName();
          log("Creating room...", "cyan");
          try {
            const result = await apiRef.current.createRoom({
              name: userName,
              roomName: value,
            });
            saveSession({
              roomCode: result.roomCode,
              participantToken: result.participantToken,
              roomName: value,
              userName,
              serverUrl: getDefaultServer(),
              joinedAt: new Date().toISOString(),
            });
            log(`Room created: ${result.roomCode}`, "green");
            connectToRoom(
              result.roomCode,
              result.participantToken,
              result.snapshot,
            );
          } catch (err) {
            const msg =
              err instanceof ApiError ? err.message : "Failed to create room";
            log(msg, "red");
          }
          setPendingData({});
          break;
        }

        case "join-code":
          startJoin(value.toUpperCase());
          break;

        case "join-name":
          setPendingData((prev) => ({ ...prev, userName: value }));
          setDefaultName(value);
          doJoin(pendingData.roomCode!, value);
          break;

        case "join-passcode":
          doJoin(
            pendingData.roomCode!,
            pendingData.userName!,
            value,
          );
          break;
      }
    },
    [inputMode, pendingData, connectToRoom, log, startJoin],
  );

  const doJoin = useCallback(
    async (code: string, name: string, passcode?: string) => {
      setInputMode(null);
      log(`Joining ${code}...`, "cyan");
      try {
        const result = await apiRef.current.joinRoom(code, {
          name,
          joinPasscode: passcode ?? null,
        });
        saveSession({
          roomCode: result.roomCode,
          participantToken: result.participantToken,
          roomName: result.snapshot.room.name,
          userName: name,
          serverUrl: getDefaultServer(),
          joinedAt: new Date().toISOString(),
        });
        log(`Joined room: ${result.roomCode}`, "green");
        connectToRoom(
          result.roomCode,
          result.participantToken,
          result.snapshot,
        );
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.code === "PASSCODE_REQUIRED"
        ) {
          setPendingData((prev) => ({ ...prev, roomCode: code, userName: name }));
          setInputMode("join-passcode");
          log("Room requires a passcode:", "yellow");
          return;
        }
        const msg =
          err instanceof ApiError ? err.message : "Failed to join room";
        log(msg, "red");
        setPendingData({});
      }
    },
    [connectToRoom, log],
  );

  const handleSubmit = useCallback(
    (value: string) => {
      setInput("");
      handleCommand(value);
    },
    [handleCommand],
  );

  // Determine prompt text
  let prompt = ">";
  if (inputMode === "create-name" || inputMode === "join-name") prompt = "name >";
  else if (inputMode === "create-room") prompt = "room >";
  else if (inputMode === "join-code") prompt = "code >";
  else if (inputMode === "join-passcode") prompt = "passcode >";
  else if (session) prompt = `${session.roomCode} >`;

  let placeholder = "Type /help for commands";
  if (inputMode === "create-name" || inputMode === "join-name")
    placeholder = "Your display name";
  else if (inputMode === "create-room") placeholder = "Room name";
  else if (inputMode === "join-code") placeholder = "e.g. ABC12";
  else if (inputMode === "join-passcode") placeholder = "Room passcode";
  else if (session) placeholder = "Vote or type /help";

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Main content area */}
      <Box flexDirection="column" flexGrow={1}>
        {screen === "home" && <HomeView />}
        {screen === "help" && (
          <HelpText
            isModerator={snapshot?.viewer.role === "moderator"}
            inRoom={!!session}
          />
        )}
        {screen === "room" && snapshot && (
          <RoomView snapshot={snapshot} connected={connected} />
        )}
      </Box>

      {/* Log messages */}
      {logs.length > 0 && (
        <Box flexDirection="column">
          {logs.slice(-5).map((entry, i) => (
            <Text key={i} color={entry.color}>
              {entry.text}
            </Text>
          ))}
        </Box>
      )}

      {/* Input line */}
      <Box>
        <Text color="gray">{"─".repeat(80)}</Text>
      </Box>
      <CommandInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        prompt={prompt}
        placeholder={placeholder}
      />
    </Box>
  );
}
