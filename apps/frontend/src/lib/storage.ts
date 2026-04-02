const keyForRoom = (roomCode: string) => `terminal-poker/session/${roomCode.toUpperCase()}`;

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

