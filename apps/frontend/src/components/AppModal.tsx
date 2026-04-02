import { ReactNode, useEffect } from "react";

import { Button } from "./Button";
import { StatusChip } from "./StatusChip";

export const AppModal = ({
  actions,
  children,
  label,
  onClose,
  title,
  titleId,
  wide = false
}: {
  actions?: ReactNode;
  children: ReactNode;
  label: string;
  onClose: () => void;
  title: string;
  titleId: string;
  wide?: boolean;
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="room-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={`card room-modal__dialog ${wide ? "room-modal__dialog--wide" : ""}`.trim()}
        role="dialog"
      >
        <div className="section-header room-modal__header">
          <div className="room-modal__heading">
            <StatusChip tone="accent">{label}</StatusChip>
            <h2 id={titleId}>{title}</h2>
          </div>
          <Button
            aria-label={`Close ${label.toLowerCase()} dialog`}
            className="room-modal__close"
            onClick={onClose}
            variant="ghost"
          >
            Close
          </Button>
        </div>
        <div className="room-modal__body">{children}</div>
        {actions ? <div className="room-modal__footer">{actions}</div> : null}
      </section>
    </div>
  );
};
