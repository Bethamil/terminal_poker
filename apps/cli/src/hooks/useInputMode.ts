import { useState, useCallback, type MutableRefObject } from "react";
import type { JoinableRole, RoomSnapshot } from "@terminal-poker/shared-types";
import { VOTING_DECK_PRESETS, VOTING_DECK_IDS, DEFAULT_VOTING_DECK_ID } from "@terminal-poker/shared-types";
import { createApiClient, ApiError } from "../lib/api.js";
import type { ApiClient } from "../lib/api.js";
import { parseRoomInput } from "../lib/commands.js";
import {
  getDefaultServer,
  getDefaultName,
  setDefaultServer,
  setDefaultName,
  getSession,
  saveSession,
  clearSession,
} from "../lib/store.js";

export type InputMode =
  | null
  | "create-name"
  | "create-room"
  | "create-deck"
  | "create-jira"
  | "create-passcode"
  | "join-code"
  | "join-observer-code"
  | "join-name"
  | "join-passcode";

interface UseInputModeOptions {
  log: (text: string, color?: string) => void;
  connectToRoom: (roomCode: string, participantToken: string, serverUrl: string, snap: RoomSnapshot) => void;
  apiRef: MutableRefObject<ApiClient>;
}

export function useInputMode({ log, connectToRoom, apiRef }: UseInputModeOptions) {
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [pendingData, setPendingData] = useState<Record<string, string>>({});

  const clear = useCallback(() => {
    setInputMode(null);
    setPendingData({});
  }, []);

  const doJoin = useCallback(
    async (
      code: string,
      name: string,
      role: JoinableRole = "participant",
      passcode?: string,
    ) => {
      setInputMode(null);
      log(role === "observer" ? `Observing ${code}...` : `Joining ${code}...`, "cyan");
      try {
        const result = await apiRef.current.joinRoom(code, {
          name,
          joinPasscode: passcode ?? null,
          role,
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
        log(
          role === "observer"
            ? `Joined room as observer: ${result.roomCode}`
            : `Joined room: ${result.roomCode}`,
          "green",
        );
        connectToRoom(result.roomCode, result.participantToken, joinServer, result.snapshot);
      } catch (err) {
        if (err instanceof ApiError && err.code === "PASSCODE_REQUIRED") {
          setPendingData((prev) => ({ ...prev, roomCode: code, userName: name, joinRole: role }));
          setInputMode("join-passcode");
          log("Room requires a passcode:", "yellow");
          return;
        }
        const msg = err instanceof ApiError ? err.message : "Failed to join room";
        log(msg, "red");
        setPendingData({});
      }
    },
    [connectToRoom, log, apiRef],
  );

  const startJoin = useCallback(
    async (code: string, requestedRole: JoinableRole = "participant") => {
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

      const name = getDefaultName();
      setPendingData({ roomCode: code, joinRole: requestedRole });
      if (name) {
        setPendingData((prev) => ({ ...prev, userName: name }));
        doJoin(code, name, requestedRole);
      } else {
        setInputMode("join-name");
        log(
          requestedRole === "observer"
            ? `Observing ${code}. Enter your display name:`
            : `Joining ${code}. Enter your display name:`,
          "cyan",
        );
      }
    },
    [log, connectToRoom, apiRef, doJoin],
  );

  const startJoinPrompt = useCallback((role: JoinableRole = "participant") => {
    setPendingData({ joinRole: role });
    setInputMode(role === "observer" ? "join-observer-code" : "join-code");
    log(
      role === "observer" ? "Enter room code or URL to observe:" : "Enter room code or URL:",
      "cyan",
    );
  }, [log]);

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

  const handleInput = useCallback(
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
          setInputMode("create-deck");
          const deckOptions = VOTING_DECK_IDS.map(
            (id, i) => `${i + 1}=${VOTING_DECK_PRESETS[id].name}`,
          ).join("  ");
          log(`Voting deck — ${deckOptions}:`, "cyan");
          break;
        }

        case "create-deck": {
          const deckList = VOTING_DECK_IDS.map((id, i) => ({ id, index: i + 1 }));
          const picked = deckList.find((d) => String(d.index) === value.trim());
          if (!picked) {
            const deckOptions = VOTING_DECK_IDS.map(
              (id, i) => `${i + 1}=${VOTING_DECK_PRESETS[id].name}`,
            ).join("  ");
            log(`Pick a number — ${deckOptions}:`, "red");
            break;
          }
          setPendingData((prev) => ({ ...prev, votingDeckId: picked.id }));
          setInputMode("create-jira");
          log("Jira base URL (enter to skip):", "cyan");
          break;
        }

        case "create-jira":
          setPendingData((prev) => ({ ...prev, jiraBaseUrl: value.trim() }));
          setInputMode("create-passcode");
          log("Join passcode (enter to skip):", "cyan");
          break;

        case "create-passcode": {
          const passcode = value.trim();
          const userName = pendingData.userName ?? getDefaultName() ?? "";
          const roomName = pendingData.roomName ?? "";
          const jiraBaseUrl = pendingData.jiraBaseUrl || null;
          const votingDeckId =
            (pendingData.votingDeckId as (typeof VOTING_DECK_IDS)[number]) ??
            DEFAULT_VOTING_DECK_ID;
          setInputMode(null);
          log("Creating room...", "cyan");
          try {
            const result = await apiRef.current.createRoom({
              name: userName,
              roomName,
              jiraBaseUrl,
              votingDeckId,
              joinPasscode: passcode || null,
            });
            saveSession({
              roomCode: result.roomCode,
              participantToken: result.participantToken,
              roomName,
              userName,
              serverUrl: getDefaultServer(),
              joinedAt: new Date().toISOString(),
            });
            log(`Room created: ${result.roomCode}`, "green");
            connectToRoom(
              result.roomCode,
              result.participantToken,
              getDefaultServer(),
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
          startJoin(parsed.code, parsed.role ?? "participant");
          break;
        }

        case "join-observer-code": {
          const parsed = parseRoomInput(value);
          if (parsed.serverUrl) {
            setDefaultServer(parsed.serverUrl);
            apiRef.current = createApiClient(parsed.serverUrl);
            log(`Server set to ${parsed.serverUrl}`, "green");
          }
          startJoin(parsed.code, parsed.role ?? "observer");
          break;
        }

        case "join-name":
          setPendingData((prev) => ({ ...prev, userName: value }));
          setDefaultName(value);
          doJoin(
            pendingData.roomCode!,
            value,
            (pendingData.joinRole as JoinableRole | undefined) ?? "participant",
          );
          break;

        case "join-passcode":
          doJoin(
            pendingData.roomCode!,
            pendingData.userName!,
            (pendingData.joinRole as JoinableRole | undefined) ?? "participant",
            value,
          );
          break;
      }
    },
    [inputMode, pendingData, connectToRoom, log, apiRef, startJoin, doJoin],
  );

  return {
    inputMode,
    startCreate,
    startJoin,
    startJoinPrompt,
    handleInput,
    clear,
  };
}
