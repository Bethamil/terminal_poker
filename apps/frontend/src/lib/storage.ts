const keyForRoom = (roomCode: string) => `terminal-poker/session/${roomCode.toUpperCase()}`;
const themeKey = "terminal-poker/theme";

export type ThemeMode = "dark" | "light";

const isThemeMode = (value: string | null): value is ThemeMode => value === "dark" || value === "light";

export const sessionStorageStore = {
  getParticipantToken(roomCode: string): string | null {
    return window.localStorage.getItem(keyForRoom(roomCode));
  },
  setParticipantToken(roomCode: string, token: string) {
    window.localStorage.setItem(keyForRoom(roomCode), token);
  },
  clearParticipantToken(roomCode: string) {
    window.localStorage.removeItem(keyForRoom(roomCode));
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
