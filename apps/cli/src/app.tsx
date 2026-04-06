import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useApp, useStdout } from "ink";
import type { RoomSnapshot, VoteValue } from "@terminal-poker/shared-types";
import { VOTING_DECK_PRESETS, VOTING_DECK_IDS } from "@terminal-poker/shared-types";
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
import { HomeView } from "./views/HomeView.js";
import { RecentView } from "./views/RecentView.js";
import { RoomView } from "./views/RoomView.js";

type Screen = "home" | "room" | "recent" | "creating" | "joining";

function parseRoomInput(input: string): { code: string; serverUrl?: string } {
  // Handle full URLs like https://poker.bloem.dev/room/ABC12
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/room\/([A-Za-z0-9]+)/);
    if (match) {
      return {
        code: match[1]!.toUpperCase(),
        serverUrl: url.origin,
      };
    }
  } catch {
    // Not a URL, treat as room code
  }
  return { code: input.toUpperCase() };
}

type ConnectionStatus = "connecting" | "sync" | "live" | "disconnected";

interface RoomSession {
  roomCode: string;
  participantToken: string;
  serverUrl: string;
}

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
}

export function App({ initialJoin }: AppProps) {
  const { exit } = useApp();
  const { width: termWidth, height: termHeight } = useTerminalSize();

  const [screen, setScreen] = useState<Screen>("home");
  const [input, setInput] = useState("");
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inputMode, setInputMode] = useState<null | "create-name" | "create-room" | "join-code" | "join-name" | "join-passcode">(null);
  const [pendingData, setPendingData] = useState<Record<string, string>>({});

  const socketRef = useRef<RoomSocket | null>(null);
  const apiRef = useRef<ApiClient>(createApiClient(getDefaultServer()));
  const roundIdRef = useRef<string | null>(null);

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
    (roomCode: string, participantToken: string, serverUrl: string, snap: RoomSnapshot) => {
      // Disconnect existing
      socketRef.current?.disconnect();

      // Sync state: we have the snapshot from API but socket is not yet live
      setSnapshot(snap);
      setSession({ roomCode, participantToken, serverUrl });
      setScreen("room");
      setConnectionStatus("connecting");
      roundIdRef.current = snap.round.id;

      const socket = createRoomSocket(serverUrl);
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnectionStatus("sync");
        socket.emit(
          "room:joinRealtime",
          { roomCode, participantToken },
          (result) => {
            if (result && "ok" in result && result.ok) {
              setConnectionStatus("live");
            } else {
              const err = result && "error" in result ? result.error : null;
              log(`Failed to join realtime: ${err?.message ?? "unknown"}`, "red");
            }
          },
        );
      });

      socket.on("disconnect", () => {
        setConnectionStatus("disconnected");
        log("Disconnected", "yellow");
      });

      socket.on("room:snapshot", (newSnapshot) => {
        if (roundIdRef.current && roundIdRef.current !== newSnapshot.round.id) {
          setLogs([{ text: "New round started", color: "green" }]);
        }
        roundIdRef.current = newSnapshot.round.id;
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
    },
    [log],
  );

  const disconnectAndGoHome = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnectionStatus("disconnected");
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

          case "create":
            startCreate();
            return;

          case "join":
            if (args) {
              const parsed = parseRoomInput(args);
              if (parsed.serverUrl) {
                setDefaultServer(parsed.serverUrl);
                apiRef.current = createApiClient(parsed.serverUrl);
                log(`Server set to ${parsed.serverUrl}`, "green");
              }
              startJoin(parsed.code);
            } else {
              setInputMode("join-code");
              log("Enter room code or URL:", "cyan");
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
            setScreen("recent");
            return;
          }

          // In-room commands — require live connection
          case "vote": {
            if (!session || !snapshot) {
              log("Not in a room", "red");
              return;
            }
            if (connectionStatus !== "live") {
              log("Not connected — waiting for live session", "yellow");
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
            setSnapshot((prev) => prev ? {
              ...prev,
              viewer: { ...prev.viewer, selectedVote: args as VoteValue },
            } : prev);
            log(`✓ Voted: ${args}`, "green");
            return;
          }

          case "reveal": {
            if (!session || connectionStatus !== "live") {
              log(session ? "Not connected — waiting for live session" : "Not in a room", session ? "yellow" : "red");
              return;
            }
            socketRef.current?.emit("round:reveal", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
            });
            log("Revealing votes...", "yellow");
            return;
          }

          case "unreveal": {
            if (!session || connectionStatus !== "live") {
              log(session ? "Not connected — waiting for live session" : "Not in a room", session ? "yellow" : "red");
              return;
            }
            socketRef.current?.emit("round:unreveal", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
            });
            log("Hiding votes...", "yellow");
            return;
          }

          case "next":
          case "reset": {
            if (!session || connectionStatus !== "live") {
              log(session ? "Not connected — waiting for live session" : "Not in a room", session ? "yellow" : "red");
              return;
            }
            socketRef.current?.emit("round:reset", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
            });
            log("Starting next round...", "yellow");
            return;
          }

          case "ticket": {
            if (!session || connectionStatus !== "live") {
              log(session ? "Not connected — waiting for live session" : "Not in a room", session ? "yellow" : "red");
              return;
            }
            socketRef.current?.emit("round:setTicket", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
              jiraTicketKey: args || null,
            });
            log(args ? `Ticket set: ${args}` : "Ticket cleared", "cyan");
            return;
          }

          case "jira": {
            if (!session || !snapshot || connectionStatus !== "live") {
              log(session ? "Not connected — waiting for live session" : "Not in a room", session ? "yellow" : "red");
              return;
            }
            const jiraUrl = args === "clear" || !args ? null : args;
            socketRef.current?.emit("room:updateSettings", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
              jiraBaseUrl: jiraUrl,
              votingDeckId: snapshot.room.votingDeckId,
              joinPasscode: null,
              joinPasscodeMode: "keep",
            });
            log(jiraUrl ? `Jira URL set to ${jiraUrl}` : "Jira URL cleared", "cyan");
            return;
          }

          case "deck": {
            if (!session || !snapshot || connectionStatus !== "live") {
              log(session ? "Not connected — waiting for live session" : "Not in a room", session ? "yellow" : "red");
              return;
            }
            const deckList = VOTING_DECK_IDS.map((id, i) => ({
              id,
              name: VOTING_DECK_PRESETS[id].name,
              index: i + 1,
            }));
            const resolved = deckList.find((d) => String(d.index) === args);
            if (!args || !resolved) {
              const options = deckList.map(
                (d) => `${d.index}=${d.name}${d.id === snapshot.room.votingDeckId ? "*" : ""}`,
              ).join("  ");
              log(`/deck N — ${options}`, "gray");
              return;
            }
            socketRef.current?.emit("room:updateSettings", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
              jiraBaseUrl: snapshot.room.jiraBaseUrl,
              votingDeckId: resolved.id,
              joinPasscode: null,
              joinPasscodeMode: "keep",
            });
            log(`Deck changed to ${resolved.name}`, "cyan");
            return;
          }

          case "passcode": {
            if (!session || !snapshot || connectionStatus !== "live") {
              log(session ? "Not connected — waiting for live session" : "Not in a room", session ? "yellow" : "red");
              return;
            }
            const isClear = args === "clear" || !args;
            socketRef.current?.emit("room:updateSettings", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
              jiraBaseUrl: snapshot.room.jiraBaseUrl,
              votingDeckId: snapshot.room.votingDeckId,
              joinPasscode: isClear ? null : args,
              joinPasscodeMode: isClear ? "clear" : "set",
            });
            log(isClear ? "Passcode cleared" : "Passcode updated", "cyan");
            return;
          }

          case "kick": {
            if (!session || !snapshot || connectionStatus !== "live") {
              log(session ? "Not connected — waiting for live session" : "Not in a room", session ? "yellow" : "red");
              return;
            }
            if (!args) {
              log("Usage: /kick NAME", "red");
              return;
            }
            const target = snapshot.participants.find(
              (p) => p.name.toLowerCase() === args.toLowerCase() && p.role !== "moderator" && p.id !== snapshot.viewer.participantId,
            );
            if (!target) {
              const names = snapshot.participants
                .filter((p) => p.role !== "moderator" && p.id !== snapshot.viewer.participantId)
                .map((p) => p.name);
              log(names.length ? `No such participant: ${args}. Options: ${names.join(", ")}` : "No participants to kick", "red");
              return;
            }
            socketRef.current?.emit("room:kickParticipant", {
              roomCode: session.roomCode,
              participantToken: session.participantToken,
              participantId: target.id,
            });
            log(`Kicked ${target.name}`, "yellow");
            return;
          }

          case "leave": {
            if (!session) {
              log("Not in a room", "red");
              return;
            }
            if (connectionStatus !== "live") {
              log("Not connected — waiting for live session", "yellow");
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

          default:
            log(`Unknown command: /${cmd}. Type / to see commands.`, "red");
            return;
        }
      }

      // If in room, treat as a quick vote attempt
      if (session && snapshot) {
        const cards = VOTING_DECK_PRESETS[snapshot.room.votingDeckId].cards;
        const card = cards.find(
          (c) => c.value.toLowerCase() === trimmed.toLowerCase(),
        );
        if (card) {
          if (snapshot.round.status !== "active") {
            log("Votes already revealed", "yellow");
            return;
          }
          if (connectionStatus !== "live") {
            log("Not connected — waiting for live session", "yellow");
            return;
          }
          socketRef.current?.emit("vote:cast", {
            roomCode: session.roomCode,
            participantToken: session.participantToken,
            value: card.value as VoteValue,
          });
          setSnapshot((prev) => prev ? {
            ...prev,
            viewer: { ...prev.viewer, selectedVote: card.value as VoteValue },
          } : prev);
          log(`✓ Voted: ${card.value}`, "green");
          return;
        }
      }

      log(`Unknown input. Type / to see commands.`, "gray");
    },
    [screen, session, snapshot, connectionStatus, inputMode, connectToRoom, disconnectAndGoHome, exit, log],
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
          connectToRoom(saved.roomCode, saved.participantToken, saved.serverUrl, snap);
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
            const currentServer = getDefaultServer();
            connectToRoom(
              result.roomCode,
              result.participantToken,
              currentServer,
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

        case "join-code": {
          const parsed = parseRoomInput(value);
          if (parsed.serverUrl) {
            setDefaultServer(parsed.serverUrl);
            apiRef.current = createApiClient(parsed.serverUrl);
            log(`Server set to ${parsed.serverUrl}`, "green");
          }
          startJoin(parsed.code);
          break;
        }

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
        const joinServer = getDefaultServer();
        saveSession({
          roomCode: result.roomCode,
          participantToken: result.participantToken,
          roomName: result.snapshot.room.name,
          userName: name,
          serverUrl: joinServer,
          joinedAt: new Date().toISOString(),
        });
        log(`Joined room: ${result.roomCode}`, "green");
        connectToRoom(
          result.roomCode,
          result.participantToken,
          joinServer,
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
      startJoin(parsed.code);
    }
  }, [initialJoin, startJoin]);

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

  let placeholder = "Type / for commands";
  if (inputMode === "create-name" || inputMode === "join-name")
    placeholder = "Your display name";
  else if (inputMode === "create-room") placeholder = "Room name";
  else if (inputMode === "join-code") placeholder = "e.g. ABC12";
  else if (inputMode === "join-passcode") placeholder = "Room passcode";
  else if (session) placeholder = "Vote or type / for commands";

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
              startJoin(code);
            }}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "room" && snapshot && (
          <RoomView snapshot={snapshot} connectionStatus={connectionStatus} termWidth={termWidth - 2} />
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
        inRoom={!!session}
        isModerator={snapshot?.viewer.role === "moderator"}
      />
    </Box>
  );
}
