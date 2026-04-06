export function parseRoomInput(input: string): { code: string; serverUrl?: string } {
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

export type CommandContext = "home" | "room" | "both" | "moderator";

export interface CommandDef {
  name: string;
  args?: string;
  description: string;
  context: CommandContext;
}

export const COMMANDS: CommandDef[] = [
  { name: "create", description: "Create a new room", context: "home" },
  { name: "join", args: "CODE|URL", description: "Join or rejoin a room by code or URL", context: "home" },
  { name: "server", args: "URL", description: "Set or show server URL", context: "home" },
  { name: "name", args: "NAME", description: "Set or show display name", context: "home" },
  { name: "recent", description: "Show recent rooms", context: "home" },
  { name: "vote", args: "VALUE", description: "Cast a vote (or just type the value)", context: "room" },
  { name: "reveal", description: "Reveal all votes", context: "moderator" },
  { name: "unreveal", description: "Hide votes again", context: "moderator" },
  { name: "next", description: "Start next round", context: "moderator" },
  { name: "ticket", args: "KEY", description: "Set Jira ticket for round", context: "moderator" },
  { name: "jira", args: "URL|clear", description: "Set or clear Jira base URL", context: "moderator" },
  { name: "deck", args: "N", description: "Change voting deck (no arg to list options)", context: "moderator" },
  { name: "passcode", args: "VALUE|clear", description: "Set or clear join passcode", context: "moderator" },
  { name: "kick", args: "NAME", description: "Remove a participant", context: "moderator" },
  { name: "leave", description: "Leave the room", context: "room" },
  { name: "quit", description: "Exit terminal-poker", context: "both" },
];

export function getCommandsForContext(inRoom: boolean, isModerator: boolean): CommandDef[] {
  return COMMANDS.filter((cmd) => {
    if (cmd.context === "both") return true;
    if (cmd.context === "home") return !inRoom;
    if (cmd.context === "room") return inRoom;
    if (cmd.context === "moderator") return inRoom && isModerator;
    return false;
  });
}
