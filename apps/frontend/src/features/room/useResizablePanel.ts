import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizablePanelOptions {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function useResizablePanel({
  defaultWidth,
  minWidth,
  maxWidth,
  storageKey,
}: UseResizablePanelOptions) {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = Number(stored);
          if (!Number.isNaN(parsed)) {
            return clamp(parsed, minWidth, maxWidth);
          }
        }
      } catch {
        // localStorage may be unavailable
      }
    }
    return defaultWidth;
  });

  const dragging = useRef(false);
  const originX = useRef(0);
  const originWidth = useRef(defaultWidth);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault();
      dragging.current = true;
      originX.current = event.clientX;
      originWidth.current = width;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragging.current) return;
      const delta = event.clientX - originX.current;
      setWidth(clamp(originWidth.current + delta, minWidth, maxWidth));
    },
    [minWidth, maxWidth]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragging.current) return;
      dragging.current = false;
      event.currentTarget.releasePointerCapture(event.pointerId);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (storageKey) {
        const delta = event.clientX - originX.current;
        const finalWidth = clamp(originWidth.current + delta, minWidth, maxWidth);
        try {
          localStorage.setItem(storageKey, String(Math.round(finalWidth)));
        } catch {
          // localStorage may be unavailable
        }
      }
    },
    [storageKey, minWidth, maxWidth]
  );

  const onDoubleClick = useCallback(() => {
    setWidth(defaultWidth);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // localStorage may be unavailable
      }
    }
  }, [defaultWidth, storageKey]);

  return {
    width,
    handleProps: {
      onDoubleClick,
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
