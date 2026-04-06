import Conf from "conf";

interface Session {
  roomCode: string;
  participantToken: string;
  roomName: string;
  userName: string;
  serverUrl: string;
  joinedAt: string;
}

interface StoreSchema {
  defaultServer: string;
  defaultName: string;
  sessions: Record<string, Session>;
  recentRooms: Array<{
    code: string;
    name: string;
    serverUrl: string;
    lastVisited: string;
  }>;
}

const store = new Conf<StoreSchema>({
  projectName: "terminal-poker",
  defaults: {
    defaultServer: "",
    defaultName: "",
    sessions: {},
    recentRooms: [],
  },
});

export function getDefaultServer(): string {
  return store.get("defaultServer");
}

export function setDefaultServer(url: string): void {
  store.store.defaultServer = url;
  store.set("defaultServer", url);
}

export function getDefaultName(): string {
  return store.get("defaultName");
}

export function setDefaultName(name: string): void {
  store.set("defaultName", name);
}

export function getSession(roomCode: string): Session | undefined {
  const sessions = store.get("sessions");
  return sessions[roomCode.toUpperCase()];
}

export function saveSession(session: Session): void {
  const sessions = store.get("sessions");
  sessions[session.roomCode.toUpperCase()] = session;
  store.set("sessions", sessions);

  // Also update recent rooms
  const recent = store.get("recentRooms");
  const filtered = recent.filter(
    (r) => r.code !== session.roomCode.toUpperCase(),
  );
  filtered.unshift({
    code: session.roomCode.toUpperCase(),
    name: session.roomName,
    serverUrl: session.serverUrl,
    lastVisited: new Date().toISOString(),
  });
  store.set("recentRooms", filtered.slice(0, 8));
}

export function clearSession(roomCode: string): void {
  const sessions = store.get("sessions");
  delete sessions[roomCode.toUpperCase()];
  store.set("sessions", sessions);
}

export function getRecentRooms() {
  return store.get("recentRooms");
}
