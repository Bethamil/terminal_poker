export type CommandContext = "home" | "room" | "both" | "moderator";

export interface CommandDef {
  name: string;
  args?: string;
  description: string;
  context: CommandContext;
}

export const COMMANDS: CommandDef[] = [
  { name: "create", description: "Create a new room", context: "home" },
  { name: "join", args: "CODE", description: "Join or rejoin a room by code", context: "home" },
  { name: "server", args: "URL", description: "Set or show server URL", context: "home" },
  { name: "name", args: "NAME", description: "Set or show display name", context: "home" },
  { name: "recent", description: "Show recent rooms", context: "home" },
  { name: "vote", args: "VALUE", description: "Cast a vote (or just type the value)", context: "room" },
  { name: "reveal", description: "Reveal all votes", context: "moderator" },
  { name: "unreveal", description: "Hide votes again", context: "moderator" },
  { name: "next", description: "Start next round", context: "moderator" },
  { name: "ticket", args: "KEY", description: "Set Jira ticket for round", context: "moderator" },
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
