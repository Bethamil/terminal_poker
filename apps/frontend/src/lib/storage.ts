const keyForRoom = (roomCode: string) => `terminal-poker/session/${roomCode.toUpperCase()}`;
const themeKey = "terminal-poker/theme";
const previousRoomsKey = "terminal-poker/previous-rooms";
const maxPreviousRooms = 8;

export type ThemeMode = "dark" | "light";
export interface StoredRoomRecord {
  roomCode: string;
  roomName: string;
  lastVisitedAt: string;
}

const isThemeMode = (value: string | null): value is ThemeMode => value === "dark" || value === "light";

const isStoredRoomRecord = (value: unknown): value is StoredRoomRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<StoredRoomRecord>;
  return (
    typeof record.roomCode === "string" &&
    typeof record.roomName === "string" &&
    typeof record.lastVisitedAt === "string"
  );
};

const readPreviousRooms = (): StoredRoomRecord[] => {
  const rawValue = window.localStorage.getItem(previousRoomsKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isStoredRoomRecord)
      .map((record) => ({
        roomCode: record.roomCode.toUpperCase(),
        roomName: record.roomName,
        lastVisitedAt: record.lastVisitedAt
      }))
      .sort((left, right) => right.lastVisitedAt.localeCompare(left.lastVisitedAt));
  } catch {
    return [];
  }
};

const writePreviousRooms = (rooms: StoredRoomRecord[]) => {
  window.localStorage.setItem(previousRoomsKey, JSON.stringify(rooms.slice(0, maxPreviousRooms)));
};

export const sessionStorageStore = {
  getParticipantToken(roomCode: string): string | null {
    return window.localStorage.getItem(keyForRoom(roomCode));
  },
  setParticipantToken(roomCode: string, token: string) {
    window.localStorage.setItem(keyForRoom(roomCode), token);
  },
  clearParticipantToken(roomCode: string) {
    window.localStorage.removeItem(keyForRoom(roomCode));
  },
  getPreviousRooms(): StoredRoomRecord[] {
    return readPreviousRooms();
  },
  rememberRoom(roomCode: string, roomName: string) {
    const normalizedRoomCode = roomCode.toUpperCase();
    const nextRooms = readPreviousRooms().filter((room) => room.roomCode !== normalizedRoomCode);

    nextRooms.unshift({
      roomCode: normalizedRoomCode,
      roomName,
      lastVisitedAt: new Date().toISOString()
    });

    writePreviousRooms(nextRooms);
  },
  forgetRoom(roomCode: string) {
    const normalizedRoomCode = roomCode.toUpperCase();
    const nextRooms = readPreviousRooms().filter((room) => room.roomCode !== normalizedRoomCode);
    writePreviousRooms(nextRooms);
  }
};

export const preferencesStorage = {
  getTheme(): ThemeMode | null {
    const value = window.localStorage.getItem(themeKey);
    return isThemeMode(value) ? value : null;
  },
  setTheme(theme: ThemeMode) {
    window.localStorage.setItem(themeKey, theme);
  }
};
