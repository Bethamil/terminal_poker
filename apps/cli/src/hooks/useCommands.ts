import { useCallback, type MutableRefObject } from "react";
import type { RoomSnapshot, VoteValue, VotingDeckId, JoinPasscodeMode } from "@terminal-poker/shared-types";
import { VOTING_DECK_PRESETS, VOTING_DECK_IDS } from "@terminal-poker/shared-types";
import { createApiClient } from "../lib/api.js";
import type { ApiClient } from "../lib/api.js";
import { parseRoomInput } from "../lib/commands.js";
import {
  getDefaultServer,
  getDefaultName,
  setDefaultServer,
  setDefaultName,
  clearSession,
} from "../lib/store.js";
import type { ConnectionStatus, RoomSession } from "./useRoomConnection.js";
import type { InputMode } from "./useInputMode.js";

interface RoomActions {
  vote: (value: VoteValue) => void;
  reveal: () => void;
  unreveal: () => void;
  reset: () => void;
  setTicket: (key: string | null) => void;
  updateSettings: (settings: {
    jiraBaseUrl?: string | null;
    votingDeckId?: VotingDeckId;
    joinPasscode?: string | null;
    joinPasscodeMode?: JoinPasscodeMode;
  }) => void;
  kickParticipant: (participantId: string) => void;
}

interface FlowActions {
  startCreate: () => void;
  startJoin: (code: string) => void;
  startJoinPrompt: () => void;
  handleInput: (value: string) => void;
}

interface UseCommandsDeps {
  session: RoomSession | null;
  snapshot: RoomSnapshot | null;
  connectionStatus: ConnectionStatus;
  inputMode: InputMode;
  log: (text: string, color?: string) => void;
  showRecent: () => void;
  exit: () => void;
  apiRef: MutableRefObject<ApiClient>;
  goHome: () => void;
  room: RoomActions;
  flow: FlowActions;
}

export function useCommands(deps: UseCommandsDeps) {
  const {
    session, snapshot, connectionStatus, inputMode,
    log, showRecent, exit, apiRef, goHome, room, flow,
  } = deps;

  const handleCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();

      // Handle input mode (multi-step forms)
      if (inputMode) {
        await flow.handleInput(trimmed);
        return;
      }

      if (!trimmed) return;

      // Slash commands
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
            flow.startCreate();
            return;

          case "join":
            if (args) {
              const parsed = parseRoomInput(args);
              if (parsed.serverUrl) {
                setDefaultServer(parsed.serverUrl);
                apiRef.current = createApiClient(parsed.serverUrl);
                log(`Server set to ${parsed.serverUrl}`, "green");
              }
              flow.startJoin(parsed.code);
            } else {
              flow.startJoinPrompt();
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

          case "recent":
            showRecent();
            return;

          // In-room commands
          case "vote": {
            if (!requireLive()) return;
            if (!args) {
              log("Usage: /vote VALUE", "red");
              return;
            }
            room.vote(args as VoteValue);
            log(`✓ Voted: ${args}`, "green");
            return;
          }

          case "reveal": {
            if (!requireLive()) return;
            room.reveal();
            log("Revealing votes...", "yellow");
            return;
          }

          case "unreveal": {
            if (!requireLive()) return;
            room.unreveal();
            log("Hiding votes...", "yellow");
            return;
          }

          case "next":
          case "reset": {
            if (!requireLive()) return;
            room.reset();
            log("Starting next round...", "yellow");
            return;
          }

          case "ticket": {
            if (!requireLive()) return;
            room.setTicket(args || null);
            log(args ? `Ticket set: ${args}` : "Ticket cleared", "cyan");
            return;
          }

          case "jira": {
            if (!requireLive()) return;
            const jiraUrl = args === "clear" || !args ? null : args;
            room.updateSettings({ jiraBaseUrl: jiraUrl });
            log(jiraUrl ? `Jira URL set to ${jiraUrl}` : "Jira URL cleared", "cyan");
            return;
          }

          case "deck": {
            if (!requireLive() || !snapshot) return;
            const deckList = VOTING_DECK_IDS.map((id, i) => ({
              id,
              name: VOTING_DECK_PRESETS[id].name,
              index: i + 1,
            }));
            const resolved = deckList.find((d) => String(d.index) === args);
            if (!args || !resolved) {
              const options = deckList
                .map(
                  (d) =>
                    `${d.index}=${d.name}${d.id === snapshot.room.votingDeckId ? "*" : ""}`,
                )
                .join("  ");
              log(`/deck N — ${options}`, "gray");
              return;
            }
            room.updateSettings({ votingDeckId: resolved.id });
            log(`Deck changed to ${resolved.name}`, "cyan");
            return;
          }

          case "passcode": {
            if (!requireLive()) return;
            const isClear = args === "clear" || !args;
            room.updateSettings({
              joinPasscode: isClear ? null : args,
              joinPasscodeMode: isClear ? "clear" : "set",
            });
            log(isClear ? "Passcode cleared" : "Passcode updated", "cyan");
            return;
          }

          case "kick": {
            if (!requireLive() || !snapshot) return;
            if (!args) {
              log("Usage: /kick NAME", "red");
              return;
            }
            const target = snapshot.participants.find(
              (p) =>
                p.name.toLowerCase() === args.toLowerCase() &&
                p.role !== "moderator" &&
                p.id !== snapshot.viewer.participantId,
            );
            if (!target) {
              const names = snapshot.participants
                .filter(
                  (p) =>
                    p.role !== "moderator" &&
                    p.id !== snapshot.viewer.participantId,
                )
                .map((p) => p.name);
              log(
                names.length
                  ? `No such participant: ${args}. Options: ${names.join(", ")}`
                  : "No participants to kick",
                "red",
              );
              return;
            }
            room.kickParticipant(target.id);
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
            goHome();
            return;
          }

          default:
            log(`Unknown command: /${cmd}. Type / to see commands.`, "red");
            return;
        }
      }

      // Quick vote: type a card value directly
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
          room.vote(card.value as VoteValue);
          log(`✓ Voted: ${card.value}`, "green");
          return;
        }
      }

      log("Unknown input. Type / to see commands.", "gray");
    },
    [session, snapshot, connectionStatus, inputMode, log, showRecent, exit, apiRef, goHome, room, flow],
  );

  function requireLive(): boolean {
    if (!session) {
      log("Not in a room", "red");
      return false;
    }
    if (connectionStatus !== "live") {
      log("Not connected — waiting for live session", "yellow");
      return false;
    }
    return true;
  }

  return handleCommand;
}
