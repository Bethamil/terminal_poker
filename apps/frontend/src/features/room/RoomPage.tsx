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
  onInvite,
  roundStatus,
  roomCode,
  roomName,
  roomLinkStatus,
  participants
}: {
  currentParticipantId: string;
  onInvite: () => void;
  roundStatus: "active" | "revealed";
  roomCode: string;
  roomName: string;
  roomLinkStatus: "idle" | "copied" | "error";
  participants: ParticipantSnapshot[];
}) => (
  <aside
    className="card card--rail grid h-full min-h-[420px] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-5 border-white/5 p-5 lg:sticky lg:top-5 lg:h-[calc(100vh-7.25rem)]"
    style={{ background: "var(--rail-panel-bg)" }}
  >
    <div className="grid gap-1">
      <h2
        className="font-['JetBrains_Mono'] text-sm uppercase tracking-[0.18em]"
        style={{ color: "var(--rail-title)" }}
      >
        {roomName.replace(/\s+/g, "_")}
      </h2>
      <span
        className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.14em]"
        style={{ color: "var(--rail-meta)" }}
      >
        ID: {roomCode}
      </span>
    </div>

    <div className="grid gap-2">
      <div
        className="bg-white/[0.05] px-4 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.14em]"
        style={{
          borderLeft: "1px solid var(--rail-accent)",
          color: "var(--rail-accent-text)"
        }}
      >
        ACTIVE ({participants.length})
      </div>
    </div>

    <div className="participant-list min-h-0 overflow-y-auto pr-1">
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

    <div className="grid gap-3">
      <Button
        className="w-full justify-center"
        onClick={onInvite}
        style={{
          background: "var(--action-accent-bg)",
          color: "var(--action-accent-text)"
        }}
      >
        {roomLinkStatus === "copied"
          ? "LINK COPIED"
          : roomLinkStatus === "error"
          ? "COPY FAILED"
          : "INVITE_DEV"}
      </Button>
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

const formatAverage = (average: number | null) => {
  if (average === null) {
    return "n/a";
  }

  return Number.isInteger(average) ? String(average) : average.toFixed(1).replace(/\.0$/, "");
};

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
  const roundSummary = snapshot.round.summary;
  const formattedAverage = formatAverage(roundSummary?.average ?? null);
  const consensusLabel = roundSummary?.consensus ?? "split";
  const hasConsensus = roundSummary?.consensus !== null;
  const revealActionLabel = snapshot.round.status === "revealed" ? "UNREVEAL" : "REVEAL VOTES";
  const waitingVotes = Math.max(snapshot.participants.length - votedCount, 0);
  return (
    <div className="shell shell--room relative overflow-hidden pb-20">
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
      />

      <main className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <ParticipantRail
          currentParticipantId={snapshot.viewer.participantId}
          onInvite={() => void copyRoomLink()}
          roundStatus={snapshot.round.status}
          roomCode={snapshot.room.code}
          roomLinkStatus={roomLinkStatus}
          roomName={snapshot.room.name}
          participants={snapshot.participants}
        />

        <section className="grid gap-4">
          <div className="grid gap-3 px-2 py-2 text-center lg:px-6 lg:py-4">
            <div className="inline-flex justify-center">
              <StatusChip tone={snapshot.round.status === "revealed" ? "success" : "accent"}>
                {snapshot.round.status === "revealed" ? "REVEALED" : "IN PROGRESS"}
              </StatusChip>
            </div>
            <div className="grid gap-2">
              <div className="hero-card__ticket items-center justify-items-center gap-2">
                <span className="hero-card__label">CURRENT TICKET</span>
                <h1 className="ticket-title text-[clamp(3.8rem,10vw,8rem)]">
                  {snapshot.round.jiraTicketKey ?? "ROUND_OPEN"}
                </h1>
                {snapshot.round.jiraTicketUrl ? (
                  <a
                    className="ticket-link inline-flex rounded-none border border-[#8c67ff]/50 px-5 py-3 text-[#d7c7ff] no-underline transition hover:bg-[#8c67ff]/10"
                    href={snapshot.round.jiraTicketUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    OPEN_IN_JIRA
                  </a>
                ) : null}
              </div>
            </div>

            {roundSummary ? (
              <div className="mx-auto flex min-h-[2.25rem] flex-wrap items-center justify-center gap-3">
                <span className="hero-card__terminal-line">
                  <strong>{`AVG ${formattedAverage}`}</strong>
                </span>
                <span
                  className={`hero-card__terminal-line ${hasConsensus ? "hero-card__terminal-line--match" : ""}`.trim()}
                >
                  <strong>{consensusLabel}</strong>
                </span>
              </div>
            ) : null}
          </div>

          <section
            className={`deck-card mx-auto w-full max-w-[82rem] ${isModerator ? "deck-card--moderator" : ""}`.trim()}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="section-header">
                <StatusChip tone="success">DECK</StatusChip>
                <h2>{getVotingDeckName(snapshot.room.votingDeckId)}</h2>
              </div>
              <div className="mono-muted">{votedCount}/{snapshot.participants.length} VOTED</div>
            </div>
            {isModerator ? (
              <div className="flex flex-wrap items-stretch gap-3 border-b border-white/6 pb-3">
                <div className="flex min-w-[18rem] flex-[1_1_30rem] items-stretch gap-2">
                  <div className="min-w-0 flex-1">
                    <Field
                      aria-label="Ticket"
                      value={ticketDraft}
                      onChange={(event) => setTicketDraft(event.target.value.toUpperCase())}
                      placeholder="PROJ-123"
                    />
                  </div>
                  <Button
                    disabled={!hasTicketChanged}
                    onClick={() => updateTicket(normalizedTicketDraft || null)}
                    style={{ minHeight: "3rem", padding: "0.7rem 0.9rem" }}
                    variant="secondary"
                  >
                    SYNC
                  </Button>
                </div>
                <div className="flex items-stretch gap-3">
                  <span
                    aria-hidden="true"
                    className="hidden w-px lg:block"
                    style={{ background: "var(--shell-footer-border)" }}
                  />
                  <Button
                    onClick={snapshot.round.status === "revealed" ? unrevealRound : revealRound}
                    style={{
                      background: "var(--action-accent-bg)",
                      color: "var(--action-accent-text)",
                      minHeight: "3rem",
                      padding: "0.7rem 1rem"
                    }}
                    variant="primary"
                  >
                    {snapshot.round.status === "revealed" ? "UNREVEAL" : "REVEAL"}
                  </Button>
                  <Button
                    onClick={resetRound}
                    style={{ minHeight: "3rem", padding: "0.7rem 0.9rem" }}
                    variant="ghost"
                  >
                    RESET
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="deck-card__body">
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
                      <strong className="vote-tile__value">{card.value}</strong>
                      <span className="vote-tile__label">{card.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {error || joinError ? <div className="notice notice--error">{error ?? joinError}</div> : null}
        </section>
      </main>

      <footer
        className="fixed inset-x-0 bottom-0 z-20 flex h-10 items-center justify-between px-4 font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.16em] backdrop-blur-xl"
        style={{
          background: "var(--shell-footer-bg)",
          borderTop: "1px solid var(--shell-footer-border)",
          color: "var(--shell-footer-text)"
        }}
      >
        <div className="flex items-center gap-4">
          <span>V2.4.0-STABLE</span>
          <span>[1-8] VOTE</span>
          <span>[R] REVEAL</span>
          <span>[N] NEXT</span>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: isRealtimeReady ? "var(--shell-footer-dot)" : "var(--shell-footer-text)" }}
          />
          <span>{isRealtimeReady ? "CONNECTION_STABLE" : "SYNCING"}</span>
        </div>
      </footer>

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
