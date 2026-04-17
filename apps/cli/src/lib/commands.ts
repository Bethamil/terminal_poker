import type { JoinableRole, ParticipantRole } from "@terminal-poker/shared-types";

export function parseRoomInput(input: string): {
  code: string;
  serverUrl?: string;
  role?: JoinableRole;
} {
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/room\/([A-Za-z0-9]+)/);
    if (match) {
      const roleParam = url.searchParams.get("role");
      return {
        code: match[1]!.toUpperCase(),
        serverUrl: url.origin,
        role: roleParam === "observer" ? "observer" : undefined,
      };
    }
  } catch {
    // Not a URL, treat as room code
  }
  return { code: input.toUpperCase() };
}

export type CommandContext = "home" | "room" | "both" | "voter" | "moderator";

export interface CommandDef {
  name: string;
  args?: string;
  description: string;
  context: CommandContext;
}

export const COMMANDS: CommandDef[] = [
  { name: "create", description: "Create a new room", context: "home" },
  { name: "join", args: "CODE|URL", description: "Join or rejoin a room by code or URL", context: "home" },
  { name: "observe", args: "CODE|URL", description: "Join or rejoin a room as an observer", context: "home" },
  { name: "server", args: "URL", description: "Set or show server URL", context: "home" },
  { name: "name", args: "NAME", description: "Set or show display name", context: "home" },
  { name: "recent", description: "Show recent rooms", context: "home" },
  { name: "vote", args: "VALUE", description: "Cast a vote (or just type the value)", context: "voter" },
  { name: "reveal", description: "Reveal all votes", context: "moderator" },
  { name: "unreveal", description: "Hide votes again", context: "moderator" },
  { name: "next", description: "Start next round", context: "moderator" },
  { name: "ticket", args: "KEY", description: "Set Jira ticket for round", context: "moderator" },
  { name: "jira", args: "URL|clear", description: "Set or clear Jira base URL", context: "moderator" },
  { name: "deck", args: "N", description: "Change voting deck (no arg to list options)", context: "moderator" },
  { name: "passcode", args: "VALUE|clear", description: "Set or clear join passcode", context: "moderator" },
  { name: "facilitator", args: "on|off", description: "Toggle facilitator mode (host doesn't vote)", context: "moderator" },
  { name: "kick", args: "NAME", description: "Remove a participant", context: "moderator" },
  { name: "voter", args: "NAME", description: "Make someone a voter", context: "moderator" },
  { name: "observer", args: "NAME", description: "Make someone an observer", context: "moderator" },
  { name: "host", args: "NAME", description: "Transfer host role", context: "moderator" },
  { name: "leave", description: "Leave the room", context: "room" },
  { name: "quit", description: "Exit terminal-poker", context: "both" },
];

const isVotingRole = (role: ParticipantRole | null | undefined) =>
  role === "moderator" || role === "participant";

export function getCommandsForContext(
  inRoom: boolean,
  viewerRole: ParticipantRole | null | undefined,
): CommandDef[] {
  const isModerator = viewerRole === "moderator";

  return COMMANDS.filter((cmd) => {
    if (cmd.context === "both") return true;
    if (cmd.context === "home") return !inRoom;
    if (cmd.context === "room") return inRoom;
    if (cmd.context === "voter") return inRoom && isVotingRole(viewerRole);
    if (cmd.context === "moderator") return inRoom && isModerator;
    return false;
  });
}
