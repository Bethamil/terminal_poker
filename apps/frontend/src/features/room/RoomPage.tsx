import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  VOTING_DECK_OPTIONS,
  getVoteCardMeta,
  getVotingDeckName,
  type ParticipantSnapshot,
  type UpdateRoomSettingsPayload
} from "@terminal-poker/shared-types";

import { AppHeader } from "../../components/AppHeader";
import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { SelectField } from "../../components/SelectField";
import { StatusChip } from "../../components/StatusChip";
import { apiClient, ApiError } from "../../lib/api/client";
import { sessionStorageStore } from "../../lib/storage";
import { useRoomConnection } from "./useRoomConnection";

const ParticipantRail = ({
  currentParticipantId,
  roundStatus,
  participants
}: {
  currentParticipantId: string;
  roundStatus: "active" | "revealed";
  participants: ParticipantSnapshot[];
}) => (
  <aside className="participant-rail card card--rail">
    <div className="participant-rail__header">
      <div>
        <div className="rail-kicker">PLAYERS</div>
        <h2>{participants.length} connected</h2>
      </div>
    </div>
    <div className="participant-list">
      {participants?.map((participant) => (
        <div
          className={`participant-row ${
            roundStatus === "revealed" ? "participant-row--revealed" : ""
          } ${
            participant.id === currentParticipantId ? "participant-row--active" : ""
          }`}
          key={participant.id}
        >
          <div className={`presence-dot presence-dot--${participant.presence}`} />
          <div className="participant-row__identity">
            <strong>{participant.name}</strong>
            <span>
              {participant.role === "moderator" ? "HOST" : participant.hasVoted ? "VOTED" : "WAITING"}
            </span>
          </div>
          <div
            className={`participant-row__vote ${
              participant.revealedVote ? "participant-row__vote--revealed" : ""
            }`}
          >
            {participant.revealedVote ? participant.revealedVote : participant.hasVoted ? "●" : "·"}
          </div>
        </div>
      ))}
    </div>
  </aside>
);

const RoomModal = ({
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
}) => (
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
        <div>
          <StatusChip tone="accent">{label}</StatusChip>
          <h2 id={titleId}>{title}</h2>
        </div>
        <Button
          aria-label={`Close ${label.toLowerCase()} dialog`}
          className="room-modal__close"
          onClick={onClose}
          variant="ghost"
        >
          X
        </Button>
      </div>
      <div className="room-modal__body">{children}</div>
      {actions ? <div className="room-modal__footer">{actions}</div> : null}
    </section>
  </div>
);

export const RoomPage = () => {
  const navigate = useNavigate();
  const { roomCode: roomCodeParam } = useParams();
  const roomCode = roomCodeParam?.toUpperCase() ?? "";
  const [participantToken, setParticipantToken] = useState<string | null>(
    roomCode ? sessionStorageStore.getParticipantToken(roomCode) : null
  );
  const [joinName, setJoinName] = useState("");
  const [joinPasscode, setJoinPasscode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [roomLinkStatus, setRoomLinkStatus] = useState<"idle" | "copied" | "error">("idle");
  const [isLeaving, setIsLeaving] = useState(false);
  const [ticketDraft, setTicketDraft] = useState("");
  const [jiraBaseUrlDraft, setJiraBaseUrlDraft] = useState("");
  const [votingDeckIdDraft, setVotingDeckIdDraft] = useState<UpdateRoomSettingsPayload["votingDeckId"]>("modified-fibonacci");
  const [newPasscodeDraft, setNewPasscodeDraft] = useState("");
  const [pendingKickId, setPendingKickId] = useState<string | null>(null);
  const {
    castVote,
    error,
    isLoading,
    leaveRoom,
    isRealtimeReady,
    kickParticipant,
    resetRound,
    revealRound,
    unrevealRound,
    sessionEndedError,
    snapshot,
    isVoteBlocked,
    updateRoomSettings,
    updateTicket
  } = useRoomConnection(roomCode, participantToken);

  useEffect(() => {
    setParticipantToken(roomCode ? sessionStorageStore.getParticipantToken(roomCode) : null);
  }, [roomCode]);

  useEffect(() => {
    if (snapshot) {
      setTicketDraft(snapshot.round.jiraTicketKey ?? "");
      sessionStorageStore.rememberRoom(snapshot.room.code, snapshot.room.name);
    }
  }, [snapshot?.room.code, snapshot?.room.name, snapshot?.round.id, snapshot?.round.jiraTicketKey]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setJiraBaseUrlDraft(snapshot.room.jiraBaseUrl ?? "");
    setVotingDeckIdDraft(snapshot.room.votingDeckId);
    setNewPasscodeDraft("");
  }, [snapshot?.room.id, snapshot?.room.jiraBaseUrl, snapshot?.room.votingDeckId, snapshot?.room.hasJoinPasscode]);

  useEffect(() => {
    if (!sessionEndedError) {
      return;
    }

    sessionStorageStore.clearParticipantToken(roomCode);
    setParticipantToken(null);

    if (sessionEndedError.code === "ROOM_CLOSED") {
      sessionStorageStore.forgetRoom(roomCode);
      navigate("/", { state: { notice: sessionEndedError.message } });
      return;
    }

    if (sessionEndedError.code === "KICKED" || sessionEndedError.code === "LEFT_ROOM") {
      navigate("/", { state: { notice: sessionEndedError.message } });
      return;
    }

    setJoinError(sessionEndedError.message);
  }, [navigate, roomCode, sessionEndedError]);

  useEffect(() => {
    if (!pendingKickId || !snapshot?.participants.some((participant) => participant.id === pendingKickId)) {
      setPendingKickId(null);
    }
  }, [pendingKickId, snapshot?.participants]);

  useEffect(() => {
    if (error) {
      setPendingKickId(null);
    }
  }, [error]);

  useEffect(() => {
    if (!isSettingsOpen && !isShortcutsOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSettingsOpen, isShortcutsOpen]);

  useEffect(() => {
    if (roomLinkStatus === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setRoomLinkStatus("idle"), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [roomLinkStatus]);

  const votedCount = useMemo(
    () => snapshot?.participants.filter((participant) => participant.hasVoted).length ?? 0,
    [snapshot]
  );
  const voteCardMeta = useMemo<ReturnType<typeof getVoteCardMeta>>(
    () => (snapshot ? getVoteCardMeta(snapshot.room.votingDeckId) : []),
    [snapshot]
  );
  const moderatorShortcuts = useMemo(
    () => [
      {
        key: "R",
        label: snapshot?.round.status === "revealed" ? "Unreveal votes" : "Reveal votes"
      },
      {
        key: "N",
        label: "Reset round"
      }
    ],
    [snapshot?.round.status]
  );

  const handleInlineJoin = async (event: FormEvent) => {
    event.preventDefault();
    setJoinError(null);

    try {
      const response = await apiClient.joinRoom(roomCode, {
        name: joinName,
        joinPasscode: joinPasscode || null
      });
      sessionStorageStore.setParticipantToken(response.roomCode, response.participantToken);
      sessionStorageStore.rememberRoom(response.roomCode, response.snapshot.room.name);
      setParticipantToken(response.participantToken);
      setJoinName("");
      setJoinPasscode("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === "ROOM_NOT_FOUND") {
        sessionStorageStore.forgetRoom(roomCode);
        navigate("/", { state: { notice: requestError.message } });
        return;
      }

      setJoinError(requestError instanceof ApiError ? requestError.message : "Unable to join room.");
    }
  };

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setRoomLinkStatus("copied");
    } catch {
      setRoomLinkStatus("error");
    }
  };

  const saveRoomSettings = (
    joinPasscodeMode: UpdateRoomSettingsPayload["joinPasscodeMode"] = "keep"
  ) => {
    const trimmedPasscode = newPasscodeDraft.trim();

    updateRoomSettings({
      jiraBaseUrl: jiraBaseUrlDraft.trim() || null,
      votingDeckId: votingDeckIdDraft,
      joinPasscode: joinPasscodeMode === "set" ? trimmedPasscode : null,
      joinPasscodeMode
    });
  };

  const handleSaveRoomSettings = () => {
    const joinPasscodeMode = newPasscodeDraft.trim() ? "set" : "keep";
    saveRoomSettings(joinPasscodeMode);
  };

  const handleKickParticipant = (participant: ParticipantSnapshot) => {
    if (!window.confirm(`Remove ${participant.name} from room ${roomCode}?`)) {
      return;
    }

    setPendingKickId(participant.id);
    kickParticipant(participant.id);
  };

  const handleLeaveRoom = async () => {
    if (!snapshot) {
      return;
    }

    const confirmationMessage =
      snapshot.viewer.role === "moderator"
        ? `Leave ${snapshot.room.name}? This will delete the room for everyone.`
        : `Leave ${snapshot.room.name}?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setIsLeaving(true);
    setJoinError(null);

    try {
      await leaveRoom();
      sessionStorageStore.clearParticipantToken(roomCode);

      if (snapshot.viewer.role === "moderator") {
        sessionStorageStore.forgetRoom(roomCode);
      }

      navigate("/", {
        state: {
          notice:
            snapshot.viewer.role === "moderator"
              ? `${snapshot.room.name} was deleted.`
              : `You left ${snapshot.room.name}.`
        }
      });
    } catch (requestError) {
      setJoinError(requestError instanceof ApiError ? requestError.message : "Unable to leave room.");
    } finally {
      setIsLeaving(false);
    }
  };

  if (!roomCode) {
    navigate("/");
    return null;
  }

  if (!participantToken) {
    return (
      <div className="shell shell--room">
        <AppHeader>
          <StatusChip tone="accent">ROOM {roomCode}</StatusChip>
        </AppHeader>
        <main className="join-gate">
          <form className="card join-gate__card" onSubmit={handleInlineJoin}>
            <div className="section-header">
              <StatusChip>JOIN</StatusChip>
              <h1>ROOM {roomCode}</h1>
            </div>
            <Field
              label="NAME"
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              placeholder="cyber_punk"
              required
            />
            <Field
              label="PASSCODE"
              value={joinPasscode}
              onChange={(event) => setJoinPasscode(event.target.value)}
              placeholder="only if required"
              type="password"
            />
            <Button stretch type="submit">
              JOIN ROOM
            </Button>
            {joinError ? <div className="notice notice--error">{joinError}</div> : null}
          </form>
        </main>
      </div>
    );
  }

  if (isLoading || !snapshot) {
    return (
      <div className="shell shell--room">
        <div className="loading-state card">
          <StatusChip tone="accent">SYNC</StatusChip>
          <h1>Loading room…</h1>
        </div>
      </div>
    );
  }

  const isModerator = snapshot.viewer.role === "moderator";
  const isVotingClosed = snapshot.round.status === "revealed";
  const normalizedTicketDraft = ticketDraft.trim().toUpperCase();
  const hasTicketChanged = normalizedTicketDraft !== (snapshot.round.jiraTicketKey ?? "");
  const revealActionLabel = snapshot.round.status === "revealed" ? "UNREVEAL" : "REVEAL VOTES";
  const revealActionTitle =
    snapshot.round.status === "revealed" ? "Votes are visible to everyone" : "Reveal when the team is ready";
  const revealActionCopy =
    snapshot.round.status === "revealed"
      ? "Switch back to blind voting if the team wants to adjust estimates before locking the round."
      : "Keep votes hidden while people decide, then reveal everything together to start the discussion.";

  return (
    <div className="shell shell--room">
      <AppHeader
        brandAside={
          <span className={`topbar__live-indicator ${isRealtimeReady ? "topbar__live-indicator--live" : ""}`.trim()}>
            {isRealtimeReady ? "LIVE" : "SYNC"}
          </span>
        }
        actions={
          <>
            {isModerator ? (
              <Button
                aria-expanded={isSettingsOpen}
                aria-haspopup="dialog"
                className="room-topbar__action"
                onClick={() => {
                  setIsSettingsOpen((current) => !current);
                  setIsShortcutsOpen(false);
                }}
                variant="ghost"
              >
                {isSettingsOpen ? "CLOSE" : "SETTINGS"}
              </Button>
            ) : null}
            <Button
              aria-expanded={isShortcutsOpen}
              aria-haspopup="dialog"
              className="room-topbar__action"
              onClick={() => {
                setIsShortcutsOpen((current) => !current);
                setIsSettingsOpen(false);
              }}
              variant="ghost"
            >
              {isShortcutsOpen ? "CLOSE KEYS" : "KEYS"}
            </Button>
            <Button
              className="room-topbar__action"
              disabled={isLeaving}
              onClick={handleLeaveRoom}
              variant={isModerator ? "danger" : "ghost"}
            >
              {isLeaving ? "LEAVING..." : isModerator ? "LEAVE & DELETE" : "LEAVE ROOM"}
            </Button>
          </>
        }
      >
        <div className="room-topbar">
          <span className="room-topbar__label">ROOM</span>
          <div className="room-topbar__name" title={snapshot.room.name}>
            {snapshot.room.name}
          </div>
          <span aria-hidden="true" className="room-topbar__divider">
            /
          </span>
          <div className="room-topbar__code">{snapshot.room.code}</div>
          <button
            aria-live="polite"
            className="room-topbar__copy"
            onClick={copyRoomLink}
            type="button"
          >
            {roomLinkStatus === "copied"
              ? "COPIED"
              : roomLinkStatus === "error"
                ? "ERROR"
                : "COPY LINK"}
          </button>
        </div>
      </AppHeader>

      <main className="room-layout">
        <ParticipantRail
          currentParticipantId={snapshot.viewer.participantId}
          roundStatus={snapshot.round.status}
          participants={snapshot.participants}
        />

        <section className="room-main">
          <div className="card hero-card">
            <div className="hero-card__eyebrow">
              <StatusChip tone={snapshot.round.status === "revealed" ? "success" : "accent"}>
                {snapshot.round.status === "revealed" ? "REVEALED" : "IN PROGRESS"}
              </StatusChip>
              <span className="mono-muted">
                {votedCount}/{snapshot.participants.length} VOTED
              </span>
            </div>
            <div className="ticket-header">
              <h1 className="ticket-title">{snapshot.round.jiraTicketKey ?? "ROUND OPEN"}</h1>
              {snapshot.round.summary ? (
                <div className="ticket-summary" aria-label="Round summary">
                  <div className="ticket-summary__item">
                    <span>AVERAGE</span>
                    <strong>{snapshot.round.summary.average ?? "n/a"}</strong>
                  </div>
                  <div className="ticket-summary__item">
                    <span>CONSENSUS</span>
                    <strong>{snapshot.round.summary.consensus ?? "split"}</strong>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="hero-copy hero-copy--inline">
              {snapshot.round.jiraTicketUrl ? (
                <a className="ticket-link" href={snapshot.round.jiraTicketUrl} rel="noreferrer" target="_blank">
                  OPEN JIRA
                </a>
              ) : null}
            </div>
          </div>

          <div className={`room-content-grid ${isModerator ? "room-content-grid--moderator" : ""}`.trim()}>
            {isModerator ? (
              <section className="card round-card">
                <div className="section-header round-card__header">
                  <div>
                    <StatusChip tone="accent">CONTROL</StatusChip>
                    <h2>Round actions</h2>
                  </div>
                </div>

                <div className="round-card__body">
                  <section className="round-card__panel">
                    <div className="round-card__panel-head">
                      <span className="round-card__panel-label">Ticket</span>
                      <p className="round-card__panel-copy">
                        Point the room at the current Jira issue, or save an empty value to clear it.
                      </p>
                    </div>

                    <div className="ticket-editor round-card__ticket-editor">
                      <Field
                        hint="Use the issue key only."
                        label="TICKET"
                        value={ticketDraft}
                        onChange={(event) => setTicketDraft(event.target.value.toUpperCase())}
                        placeholder="PROJ-123"
                      />
                      <Button
                        disabled={!hasTicketChanged}
                        onClick={() => updateTicket(normalizedTicketDraft || null)}
                        variant="secondary"
                      >
                        SAVE
                      </Button>
                    </div>
                  </section>

                  <section className="round-card__panel round-card__panel--accent">
                    <div className="round-card__panel-head">
                      <span className="round-card__panel-label">Reveal flow</span>
                      <h3 className="round-card__action-title">{revealActionTitle}</h3>
                      <p className="round-card__panel-copy">{revealActionCopy}</p>
                    </div>

                    <div className="action-row round-card__action-row">
                      <Button
                        onClick={snapshot.round.status === "revealed" ? unrevealRound : revealRound}
                        stretch
                        variant={snapshot.round.status === "revealed" ? "danger" : "primary"}
                      >
                        {revealActionLabel}
                      </Button>
                      <Button onClick={resetRound} variant="secondary">
                        RESET
                      </Button>
                    </div>
                  </section>
                </div>

                <div className="waiting-banner round-card__footnote">
                  {snapshot.round.summary
                    ? "Votes are revealed. Reset the round to start the next estimate."
                    : "Votes stay hidden until reveal."}
                </div>
              </section>
            ) : null}

            <section className={`card deck-card ${isModerator ? "deck-card--moderator" : ""}`.trim()}>
              <div className="section-header">
                <StatusChip tone="success">DECK</StatusChip>
                <h2>{getVotingDeckName(snapshot.room.votingDeckId)}</h2>
              </div>
              <div className="deck-card__body">
                {isVoteBlocked ? (
                  <div
                    aria-live="polite"
                    className="deck-card__vote-alert"
                    role="status"
                  >
                    <span className="deck-card__vote-alert-label">Voting closed</span>
                    <strong>{snapshot.viewer.selectedVote ? `Your last vote was ${snapshot.viewer.selectedVote}.` : "This round is already revealed."}</strong>
                  </div>
                ) : null}
                <div className="vote-grid">
                  {voteCardMeta.map((card) => {
                    const isSelected = snapshot.viewer.selectedVote === card.value;
                    return (
                      <button
                        aria-disabled={isVotingClosed}
                        className={`vote-tile ${isSelected ? "vote-tile--selected" : ""} ${
                          isVotingClosed ? "vote-tile--locked" : ""
                        }`.trim()}
                        key={card.value}
                        onClick={() => castVote(card.value)}
                        type="button"
                      >
                        <span className="vote-tile__shortcut">{card.shortcut}</span>
                        <strong>{card.value}</strong>
                        <span>{card.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {error || joinError ? <div className="notice notice--error">{error ?? joinError}</div> : null}
        </section>
      </main>

      {isModerator && isSettingsOpen ? (
        <RoomModal
          label="SETTINGS"
          onClose={() => setIsSettingsOpen(false)}
          title="Room config"
          titleId="room-settings-title"
          wide
        >
          <div className="settings-grid">
            <section className="settings-section">
              <div className="section-header">
                <StatusChip>DEFAULTS</StatusChip>
                <h3>Round setup</h3>
              </div>
              <Field
                label="JIRA URL"
                value={jiraBaseUrlDraft}
                onChange={(event) => setJiraBaseUrlDraft(event.target.value)}
                placeholder="https://jira.example.com"
              />
              <SelectField
                label="DECK"
                value={votingDeckIdDraft}
                onChange={(event) =>
                  setVotingDeckIdDraft(event.target.value as UpdateRoomSettingsPayload["votingDeckId"])
                }
                hint="Changing the deck starts a new round."
              >
                {VOTING_DECK_OPTIONS.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </SelectField>
              <Field
                hint={
                  snapshot.room.hasJoinPasscode
                    ? "Leave blank to keep the current passcode."
                    : "Leave blank to keep the room open."
                }
                label="NEW PASSCODE"
                value={newPasscodeDraft}
                onChange={(event) => setNewPasscodeDraft(event.target.value)}
                placeholder={snapshot.room.hasJoinPasscode ? "••••••••" : "optional"}
                type="password"
              />
              <div className="shortcut-strip settings-strip">
                <span>{snapshot.room.hasJoinPasscode ? "LOCKED" : "OPEN"}</span>
                <span>{snapshot.room.jiraBaseUrl ? "JIRA ON" : "JIRA OFF"}</span>
              </div>
              <div className="action-row">
                <Button onClick={handleSaveRoomSettings} variant="secondary">
                  SAVE
                </Button>
                {snapshot.room.hasJoinPasscode ? (
                  <Button onClick={() => saveRoomSettings("clear")} variant="ghost">
                    CLEAR PASSCODE
                  </Button>
                ) : null}
              </div>
            </section>

            <section className="settings-section">
              <div className="section-header">
                <StatusChip tone="success">ACCESS</StatusChip>
                <h3>Participants</h3>
              </div>
              <div className="settings-list">
                {snapshot.participants.map((participant) => {
                  const isViewer = participant.id === snapshot.viewer.participantId;
                  const canKick = !isViewer && participant.role !== "moderator";

                  return (
                    <div className="settings-user-row" key={participant.id}>
                      <div className="settings-user-row__identity">
                        <strong>{participant.name}</strong>
                        <span>
                          {participant.role === "moderator"
                            ? isViewer
                              ? "HOST / YOU"
                              : "HOST"
                            : participant.hasVoted
                              ? "VOTED"
                              : "WAITING"}
                        </span>
                      </div>
                      {canKick ? (
                        <Button
                          className="settings-user-row__action"
                          disabled={pendingKickId === participant.id}
                          onClick={() => handleKickParticipant(participant)}
                          variant="danger"
                        >
                          {pendingKickId === participant.id ? "REMOVING..." : "REMOVE"}
                        </Button>
                      ) : (
                        <span className="mono-muted">{isViewer ? "YOU" : "LOCKED"}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </RoomModal>
      ) : null}

      {isShortcutsOpen ? (
        <RoomModal
          actions={<div className="mono-muted">SHORTCUTS ONLY WORK WHEN YOU ARE NOT TYPING IN AN INPUT.</div>}
          label="SHORTCUTS"
          onClose={() => setIsShortcutsOpen(false)}
          title={isModerator ? "Moderator controls" : "Keyboard controls"}
          titleId="room-shortcuts-title"
          wide
        >
          <div className="shortcuts-grid">
            <section className="shortcuts-section">
              <span className="shortcuts-section__label">VOTE</span>
              <div className="shortcuts-list">
                {voteCardMeta.map((card) => (
                  <div className="shortcut-item" key={card.value}>
                    <kbd>{card.shortcut.toUpperCase()}</kbd>
                    <div className="shortcut-item__copy">
                      <strong>{card.value}</strong>
                      <span>{card.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {isModerator ? (
              <section className="shortcuts-section">
                <span className="shortcuts-section__label">MODERATOR</span>
                <div className="shortcuts-list">
                  {moderatorShortcuts.map((shortcut) => (
                    <div className="shortcut-item" key={shortcut.key}>
                      <kbd>{shortcut.key}</kbd>
                      <div className="shortcut-item__copy">
                        <strong>{shortcut.label}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </RoomModal>
      ) : null}
    </div>
  );
};
