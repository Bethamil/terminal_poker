import { useEffect } from "react";

import type { RoomSnapshot, VoteValue } from "@terminal-poker/shared-types";

interface UseRoomShortcutsOptions {
  availableShortcuts: Map<string, VoteValue>;
  emitRoundAction: (eventName: "round:reveal" | "round:unreveal" | "round:reset") => void;
  emitVote: (value: VoteValue) => void;
  isRealtimeReady: boolean;
  participantToken: string | null;
  snapshot: RoomSnapshot | null;
}

export const useRoomShortcuts = ({
  availableShortcuts,
  emitRoundAction,
  emitVote,
  isRealtimeReady,
  participantToken,
  snapshot
}: UseRoomShortcutsOptions) => {
  useEffect(() => {
    if (!snapshot || !participantToken || !isRealtimeReady) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const hasModifierKey = event.metaKey || event.ctrlKey || event.altKey;

      if (isTypingContext || hasModifierKey) {
        return;
      }

      const normalizedKey = event.key.toLowerCase();
      const vote = availableShortcuts.get(normalizedKey);

      if (vote) {
        event.preventDefault();
        emitVote(vote);
      }

      if (snapshot.viewer.role === "moderator" && normalizedKey === "r") {
        event.preventDefault();
        emitRoundAction(snapshot.round.status === "revealed" ? "round:unreveal" : "round:reveal");
      }

      if (snapshot.viewer.role === "moderator" && normalizedKey === "n") {
        event.preventDefault();
        emitRoundAction("round:reset");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [availableShortcuts, emitRoundAction, emitVote, isRealtimeReady, participantToken, snapshot]);
};
