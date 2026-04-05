import { useEffect } from "react";

import type { VoteValue } from "@terminal-poker/shared-types";

interface UseRoomShortcutsOptions {
  availableShortcuts: Map<string, VoteValue>;
  enabled: boolean;
  emitRoundAction: (eventName: "round:reveal" | "round:unreveal" | "round:reset") => void;
  emitVote: (value: VoteValue) => void;
  isModerator: boolean;
  isRoundRevealed: boolean;
}

export const useRoomShortcuts = ({
  availableShortcuts,
  enabled,
  emitRoundAction,
  emitVote,
  isModerator,
  isRoundRevealed
}: UseRoomShortcutsOptions) => {
  useEffect(() => {
    if (!enabled) {
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

      if (isModerator && normalizedKey === "r") {
        event.preventDefault();
        emitRoundAction(isRoundRevealed ? "round:unreveal" : "round:reveal");
      }

      if (isModerator && normalizedKey === "n") {
        event.preventDefault();
        emitRoundAction("round:reset");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [availableShortcuts, enabled, emitRoundAction, emitVote, isModerator, isRoundRevealed]);
};
