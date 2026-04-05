import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import {
  COFFEE_VOTE_VALUE,
  UNKNOWN_VOTE_VALUE,
  VOTING_DECK_OPTIONS,
  getVoteCardMeta,
  getVotingDeckName,
  isNonEstimateVoteValue,
  type ParticipantSnapshot,
  type UpdateRoomSettingsPayload
} from "@terminal-poker/shared-types";

import { AppHeader } from "../../components/AppHeader";
import { AppFooter } from "../../components/AppFooter";
import { AppModal } from "../../components/AppModal";
import { Button } from "../../components/Button";
import { CoffeeVote } from "../../components/CoffeeVote";
import { Field } from "../../components/Field";
import { SelectField } from "../../components/SelectField";
import { StatusChip } from "../../components/StatusChip";
import { apiClient, ApiError } from "../../lib/api/client";
import { sessionStorageStore } from "../../lib/storage";
import { useRoomConnection } from "./useRoomConnection";

const countOnlineParticipants = (participants: ParticipantSnapshot[]) =>
  participants.filter((participant) => participant.presence === "online").length;

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
}) => {
  const onlineParticipantCount = countOnlineParticipants(participants);

  return (
    <aside
    className="room-sidebar card card--rail order-2 grid min-h-0 gap-4 border-white/5 px-4 py-4 lg:order-1 lg:h-full lg:min-h-[420px] lg:grid-rows-[auto_auto_minmax(0,1fr)_auto] lg:gap-5 lg:px-5 lg:py-5"
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
        ACTIVE ({onlineParticipantCount}/{participants.length})
      </div>
    </div>

    <div className="participant-list min-h-0 max-h-[min(40vh,18rem)] overflow-y-auto pr-1 lg:max-h-none">
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
            {participant.revealedVote
              ? participant.revealedVote === COFFEE_VOTE_VALUE
                ? <CoffeeVote />
                : participant.revealedVote
              : participant.hasVoted
                ? "●"
                : "·"}
          </div>
        </div>
      ))}
    </div>

    <div className="grid gap-3 pt-3">
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
};

const MobileParticipantStrip = ({
  currentParticipantId,
  participants,
  roundStatus
}: {
  currentParticipantId: string;
  participants: ParticipantSnapshot[];
  roundStatus: "active" | "revealed";
}) => {
  return (
    <div className="-mx-[var(--shell-pad)] flex gap-2 overflow-x-auto px-[var(--shell-pad)] pb-1 lg:hidden">
      {participants.map((participant) => {
        const isCurrent = participant.id === currentParticipantId;
        const voteState =
          roundStatus === "revealed"
            ? participant.revealedVote
              ? participant.revealedVote === COFFEE_VOTE_VALUE
                ? <CoffeeVote variant="mobile" />
                : participant.revealedVote
              : "·"
            : participant.hasVoted
              ? "●"
              : "·";

        return (
          <div
            className={`grid min-w-[8.2rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[999px] border px-3 py-2 ${
              isCurrent
                ? "border-[color:var(--participant-active-border)] bg-[color:var(--participant-active-bg)]"
                : "border-[color:var(--outline)] bg-[color:var(--panel-bg)]"
            }`}
            key={participant.id}
          >
            <div className={`presence-dot presence-dot--${participant.presence}`} />
            <strong className="truncate text-[0.8rem]">{participant.name}</strong>
            <div
              className={`flex min-w-[2.25rem] items-center justify-end text-right font-['JetBrains_Mono'] text-[0.72rem] uppercase tracking-[0.12em] ${
                roundStatus === "revealed" && participant.revealedVote
                  ? "font-['Space_Grotesk'] text-[1rem] tracking-[-0.04em] text-[color:var(--text)]"
                  : "text-[color:var(--muted)]"
              }`}
            >
              {voteState}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const formatAverage = (average: number | null) => {
  if (average === null) {
    return "n/a";
  }

  return Number.isInteger(average) ? String(average) : average.toFixed(1).replace(/\.0$/, "");
};

const isRangeVote = (value: string) => !isNonEstimateVoteValue(value);

const formatVoteShortcutHint = (shortcuts: string[]) => {
  const normalizedShortcuts = shortcuts.map((shortcut) => shortcut.toUpperCase());
  const numericShortcuts = normalizedShortcuts.filter((shortcut) => /^\d$/.test(shortcut));
  const extraShortcuts = normalizedShortcuts.filter((shortcut) => !/^\d$/.test(shortcut));

  if (numericShortcuts.length === 0) {
    return `[${extraShortcuts.join(" ")}] VOTE`;
  }

  const numericHint = numericShortcuts.includes("0")
    ? "1-0"
    : `1-${numericShortcuts[numericShortcuts.length - 1]}`;

  return extraShortcuts.length > 0
    ? `[${numericHint} ${extraShortcuts.join(" ")}] VOTE`
    : `[${numericHint}] VOTE`;
};

type SettingsTab = "room" | "users";

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
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("room");
  const [isSettingsSaved, setIsSettingsSaved] = useState(false);
  const [roomLinkStatus, setRoomLinkStatus] = useState<"idle" | "copied" | "error">("idle");
  const [isLeaving, setIsLeaving] = useState(false);
  const [ticketDraft, setTicketDraft] = useState("");
  const [jiraBaseUrlDraft, setJiraBaseUrlDraft] = useState("");
  const [votingDeckIdDraft, setVotingDeckIdDraft] = useState<UpdateRoomSettingsPayload["votingDeckId"]>("modified-fibonacci");
  const [newPasscodeDraft, setNewPasscodeDraft] = useState("");
  const [pendingKickId, setPendingKickId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const settingsSavedTimeoutRef = useRef<number | null>(null);
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
    if (isSettingsOpen) {
      setSettingsTab("room");
      setSettingsError(null);
    }
  }, [isSettingsOpen]);

  useEffect(
    () => () => {
      if (settingsSavedTimeoutRef.current !== null) {
        window.clearTimeout(settingsSavedTimeoutRef.current);
      }
    },
    []
  );

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
  const voteShortcutHint = useMemo(
    () => formatVoteShortcutHint(voteCardMeta.map((card) => card.shortcut)),
    [voteCardMeta]
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

  const saveRoomSettings = async (
    joinPasscodeMode: UpdateRoomSettingsPayload["joinPasscodeMode"] = "keep"
  ) => {
    const trimmedPasscode = newPasscodeDraft.trim();

    setSettingsError(null);

    try {
      await updateRoomSettings({
        jiraBaseUrl: jiraBaseUrlDraft.trim() || null,
        votingDeckId: votingDeckIdDraft,
        joinPasscode: joinPasscodeMode === "set" ? trimmedPasscode : null,
        joinPasscodeMode
      });

      if (settingsSavedTimeoutRef.current !== null) {
        window.clearTimeout(settingsSavedTimeoutRef.current);
      }

      setIsSettingsSaved(true);
      settingsSavedTimeoutRef.current = window.setTimeout(() => {
        setIsSettingsSaved(false);
        settingsSavedTimeoutRef.current = null;
      }, 1800);
    } catch (requestError) {
      setIsSettingsSaved(false);
      setSettingsError(
        requestError instanceof ApiError ? requestError.message : "Unable to save room settings."
      );
    }
  };

  const handleSaveRoomSettings = () => {
    const joinPasscodeMode = newPasscodeDraft.trim() ? "set" : "keep";
    void saveRoomSettings(joinPasscodeMode);
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
    return <Navigate replace to="/" />;
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
              label="USER NAME"
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

  if (isLoading || !snapshot || !isRealtimeReady) {
    return (
      <div className="shell shell--room">
        <div className="grid min-h-[60vh] place-items-center">
          <div className="grid justify-items-center gap-4 text-center">
            <div
              aria-hidden="true"
              className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--outline)] border-t-[color:var(--primary)]"
            />
            <h1 className="font-['JetBrains_Mono'] text-sm uppercase tracking-[0.18em] text-[color:var(--text)]">
              Loading room...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const isModerator = snapshot.viewer.role === "moderator";
  const isVotingClosed = snapshot.round.status === "revealed";
  const normalizedTicketDraft = ticketDraft.trim().toUpperCase();
  const hasTicketChanged = normalizedTicketDraft !== (snapshot.round.jiraTicketKey ?? "");
  const roundSummary = snapshot.round.summary;
  const hasRoundSummary = Boolean(roundSummary);
  const formattedAverage = formatAverage(roundSummary?.average ?? null);
  const topVoteLabel = roundSummary?.consensus ?? "SPLIT";
  const hasTopVote = roundSummary?.consensus !== null;
  const revealedValuesInOrder = snapshot.votingDeck.filter(
    (value) => isRangeVote(value) && (roundSummary?.counts[value] ?? 0) > 0
  );
  const hasUnknownVotes = (roundSummary?.counts[UNKNOWN_VOTE_VALUE] ?? 0) > 0;
  const rangeLabel =
    revealedValuesInOrder.length > 1
      ? `${revealedValuesInOrder[0]}-${revealedValuesInOrder[revealedValuesInOrder.length - 1]}`
      : revealedValuesInOrder[0] ?? (hasUnknownVotes ? UNKNOWN_VOTE_VALUE : "—");
  const summaryLabel = hasTopVote ? "TOP VOTE" : "RESULT";
  const summaryPrimaryValue =
    hasTopVote
      ? topVoteLabel === COFFEE_VOTE_VALUE
        ? <CoffeeVote variant="hero" />
        : topVoteLabel
      : "SPLIT";
  const revealActionLabel = snapshot.round.status === "revealed" ? "UNREVEAL" : "REVEAL VOTES";
  const waitingVotes = Math.max(snapshot.participants.length - votedCount, 0);
  const activeParticipantCount = countOnlineParticipants(snapshot.participants);
  return (
    <div className="shell shell--room relative overflow-hidden">
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
                onClick={() => setIsSettingsOpen((current) => !current)}
                variant="ghost"
              >
                {isSettingsOpen ? "CLOSE" : "SETTINGS"}
              </Button>
            ) : null}
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
        mobileMenu={{
          label: "MENU",
          title: snapshot.room.name,
          renderContent: (closeMenu) => (
            <>
              <div className="mobile-menu__meta shortcut-strip">
                <span>ID {snapshot.room.code}</span>
                <span>{activeParticipantCount}/{snapshot.participants.length} ACTIVE</span>
                <span>{isRealtimeReady ? "LIVE" : "SYNC"}</span>
              </div>
              <div className="mobile-menu__actions">
                <Button
                  onClick={() => {
                    closeMenu();
                    void copyRoomLink();
                  }}
                  variant="secondary"
                >
                  {roomLinkStatus === "copied"
                    ? "LINK COPIED"
                    : roomLinkStatus === "error"
                    ? "COPY FAILED"
                    : "COPY INVITE"}
                </Button>
                {isModerator ? (
                  <Button
                    onClick={() => {
                      closeMenu();
                      setIsSettingsOpen(true);
                    }}
                    variant="ghost"
                  >
                    SETTINGS
                  </Button>
                ) : null}
                <Button
                  onClick={() => {
                    closeMenu();
                    void handleLeaveRoom();
                  }}
                  variant={isModerator ? "danger" : "ghost"}
                >
                  {isLeaving ? "LEAVING..." : isModerator ? "LEAVE & DELETE" : "LEAVE ROOM"}
                </Button>
              </div>
            </>
          )
        }}
      />

      <main className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="hidden lg:grid">
          <ParticipantRail
            currentParticipantId={snapshot.viewer.participantId}
            onInvite={() => void copyRoomLink()}
            roundStatus={snapshot.round.status}
            roomCode={snapshot.room.code}
            roomLinkStatus={roomLinkStatus}
            roomName={snapshot.room.name}
            participants={snapshot.participants}
          />
        </div>

        <section className="order-1 grid gap-4 lg:order-2">
          <div className="grid gap-3 px-2 py-2 text-center max-[720px]:gap-2 max-[720px]:px-1 max-[720px]:py-1 lg:px-6 lg:py-4">
            <div className="inline-flex justify-center">
              <StatusChip tone={snapshot.round.status === "revealed" ? "success" : "accent"}>
                {snapshot.round.status === "revealed" ? "REVEALED" : "IN PROGRESS"}
              </StatusChip>
            </div>
            <div className="grid gap-2">
              <div className="hero-card__ticket items-center justify-items-center gap-3">
                <span className="hero-card__label">CURRENT TICKET</span>
                <h1 className="ticket-title text-[clamp(3.1rem,11vw,8rem)] max-[720px]:text-[clamp(2.6rem,10vw,4.6rem)]">
                  {snapshot.round.jiraTicketKey ?? "ROUND_OPEN"}
                </h1>
                {snapshot.round.jiraTicketUrl ? (
                  <a
                    className="ticket-link ticket-link--jira mt-3 inline-flex justify-self-center rounded-none px-5 py-3 no-underline transition"
                    href={snapshot.round.jiraTicketUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    OPEN_IN_JIRA
                  </a>
                ) : null}
              </div>
            </div>

            {hasRoundSummary ? (
              <div className="mx-auto w-full max-w-[44rem]">
                <div
                  className="grid gap-4 rounded-[24px] border px-4 py-4 text-left shadow-[0_24px_70px_rgba(0,0,0,0.12)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6 md:px-5"
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--card-bg) 90%, var(--surface-high) 10%), color-mix(in srgb, var(--card-bg) 96%, transparent))",
                    borderColor: "var(--outline)"
                  }}
                >
                  <div className="grid gap-1.5">
                    <span className="hero-card__label">{summaryLabel}</span>
                    <strong
                      className="inline-flex min-h-[1em] items-center font-['Space_Grotesk'] text-[clamp(2.6rem,5vw,4.5rem)] leading-[0.88] tracking-[-0.08em] uppercase"
                      style={{ color: hasTopVote ? "var(--primary)" : "var(--text)" }}
                    >
                      {summaryPrimaryValue}
                    </strong>
                  </div>

                  <div
                    className="grid grid-cols-3 gap-4 border-t pt-4 md:min-w-[19rem] md:border-l md:border-t-0 md:pl-6 md:pt-0"
                    style={{ borderColor: "color-mix(in srgb, var(--outline) 76%, transparent)" }}
                  >
                    {[
                      { label: "AVG", value: formattedAverage, accent: true },
                      { label: "RANGE", value: rangeLabel, accent: false },
                      { label: "VOTES", value: String(votedCount), accent: false }
                    ].map((stat) => (
                      <div
                        className="grid content-start gap-1 border-l pl-4 first:border-l-0 first:pl-0"
                        key={stat.label}
                        style={{ borderColor: "color-mix(in srgb, var(--outline) 76%, transparent)" }}
                      >
                        <span className="hero-card__label">{stat.label}</span>
                        <strong
                          className="font-['Space_Grotesk'] text-[clamp(1.3rem,2.6vw,2rem)] leading-none tracking-[-0.06em] uppercase"
                          style={{ color: stat.accent ? "var(--primary)" : "var(--text)" }}
                        >
                          {stat.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
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
            <MobileParticipantStrip
              currentParticipantId={snapshot.viewer.participantId}
              participants={snapshot.participants}
              roundStatus={snapshot.round.status}
            />
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
                    NEXT
                  </Button>
                </div>
              </div>
            ) : null}
            <div className={`deck-card__body ${isVotingClosed ? "deck-card__body--closed" : ""}`.trim()}>
              <div className="vote-grid">
                {voteCardMeta.map((card) => {
                  const isSelected = snapshot.viewer.selectedVote === card.value;
                  const isCoffeeCard = card.value === COFFEE_VOTE_VALUE;
                  return (
                    <button
                      aria-label={isCoffeeCard ? card.label : undefined}
                      disabled={isVotingClosed}
                      className={`vote-tile ${isSelected ? "vote-tile--selected" : ""} ${
                        isCoffeeCard ? "vote-tile--coffee" : ""
                      } ${
                        isVotingClosed ? "vote-tile--locked" : ""
                      }`.trim()}
                      key={card.value}
                      onClick={() => castVote(card.value)}
                      type="button"
                    >
                      {isCoffeeCard ? <CoffeeVote variant="tile" /> : null}
                      {!isCoffeeCard ? <strong className="vote-tile__value">{card.value}</strong> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {error || joinError ? <div className="notice notice--error">{error ?? joinError}</div> : null}
        </section>
      </main>

      <AppFooter
        left={
          <>
            <span>{voteShortcutHint}</span>
            <span>[R] REVEAL</span>
            <span>[N] NEXT</span>
          </>
        }
        leftClassName="hidden gap-4 md:flex"
        center={
          <>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isRealtimeReady ? "var(--shell-footer-dot)" : "var(--shell-footer-text)" }}
            />
            <span>{isRealtimeReady ? "CONNECTION_STABLE" : "SYNCING"}</span>
          </>
        }
        centerClassName="gap-2"
        rightClassName="gap-2"
      />

      {isModerator && isSettingsOpen ? (
        <AppModal
          bodyClassName="overflow-hidden"
          label="SETTINGS"
          onClose={() => setIsSettingsOpen(false)}
          title="Room config"
          titleId="room-settings-title"
          wide
        >
          <div className="grid h-full min-h-0 gap-3 grid-rows-[auto_minmax(0,1fr)] min-[721px]:gap-4 min-[721px]:grid-cols-[minmax(12rem,14rem)_minmax(0,1fr)] min-[721px]:grid-rows-1">
            <div className="grid content-start gap-3 min-[721px]:min-h-0">
              <div
                aria-label="Settings sections"
                className="grid grid-cols-2 gap-2 min-[721px]:grid-cols-1"
                role="tablist"
              >
                {[
                  { id: "room", label: "ROOM", chip: "CONFIG" },
                  { id: "users", label: "USERS", chip: `${snapshot.participants.length} ACTIVE` }
                ].map((tab) => {
                  const isActive = settingsTab === tab.id;

                  return (
                    <button
                      aria-controls={`room-settings-panel-${tab.id}`}
                      aria-selected={isActive}
                      className={`grid cursor-pointer gap-1 rounded-[12px] border px-3 py-2.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-150 hover:-translate-y-[1px] hover:border-[color:var(--button-secondary-border)] hover:bg-[color:var(--panel-strong-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--button-secondary-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--card-bg)] active:translate-y-0 min-[721px]:gap-2 min-[721px]:px-4 min-[721px]:py-3 ${
                        isActive
                          ? "border-[color:var(--button-secondary-border)] bg-[color:var(--button-secondary-bg)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                          : "border-[color:var(--outline)] bg-[color:var(--panel-bg)]"
                      }`}
                      id={`room-settings-tab-${tab.id}`}
                      key={tab.id}
                      onClick={() => setSettingsTab(tab.id as SettingsTab)}
                      role="tab"
                      type="button"
                    >
                      <span className="font-['JetBrains_Mono'] text-[0.62rem] uppercase tracking-[0.12em] text-[color:var(--muted)] min-[721px]:text-[0.68rem] min-[721px]:tracking-[0.14em]">
                        {tab.chip}
                      </span>
                      <span className="font-['JetBrains_Mono'] text-[0.82rem] uppercase tracking-[0.08em] text-[color:var(--text)] min-[721px]:text-[0.88rem] min-[721px]:tracking-[0.1em]">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>

            {settingsTab === "room" ? (
              <section
                aria-labelledby="room-settings-tab-room"
                className="grid min-h-0 content-start gap-4 overflow-y-auto rounded-[calc(var(--radius)-2px)] border border-[color:var(--outline)] bg-[color:var(--settings-section-bg)] p-4 pr-3 max-[720px]:gap-[0.85rem] max-[720px]:p-[0.85rem] max-[720px]:pr-[0.65rem]"
                id="room-settings-panel-room"
                role="tabpanel"
              >
                <div className="section-header">
                  <StatusChip>ROOM</StatusChip>
                  <h3 className="m-0 font-['JetBrains_Mono'] text-[0.92rem] uppercase tracking-[0.08em]">
                    Round setup
                  </h3>
                </div>
                <div className="grid gap-4">
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
                </div>
                <div className="shortcut-strip justify-between rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--panel-bg)] px-4 py-[0.8rem] max-[720px]:grid max-[720px]:grid-cols-2 max-[720px]:gap-[0.55rem] max-[720px]:px-[0.85rem] max-[720px]:py-[0.7rem]">
                  <span>{snapshot.room.hasJoinPasscode ? "LOCKED" : "OPEN"}</span>
                  <span>{snapshot.room.jiraBaseUrl ? "JIRA ON" : "JIRA OFF"}</span>
                </div>
                <div className="action-row max-[720px]:grid max-[720px]:grid-cols-1 max-[720px]:gap-[0.6rem]">
                  <Button
                    className="max-[720px]:w-full"
                    onClick={handleSaveRoomSettings}
                    variant="secondary"
                  >
                    {isSettingsSaved ? "SAVED" : "SAVE"}
                  </Button>
                  {snapshot.room.hasJoinPasscode ? (
                    <Button
                      className="max-[720px]:w-full"
                      onClick={() => void saveRoomSettings("clear")}
                      variant="ghost"
                    >
                      CLEAR PASSCODE
                    </Button>
                  ) : null}
                </div>
                {settingsError ? <div className="notice notice--error">{settingsError}</div> : null}
              </section>
            ) : (
              <section
                aria-labelledby="room-settings-tab-users"
                className="grid min-h-0 gap-4 overflow-hidden rounded-[calc(var(--radius)-2px)] border border-[color:var(--outline)] bg-[color:var(--settings-section-bg)] p-4 [grid-template-rows:auto_auto_minmax(0,1fr)] max-[720px]:gap-[0.85rem] max-[720px]:p-[0.85rem]"
                id="room-settings-panel-users"
                role="tabpanel"
              >
                <div className="section-header">
                  <StatusChip tone="success">USERS</StatusChip>
                  <h3 className="m-0 font-['JetBrains_Mono'] text-[0.92rem] uppercase tracking-[0.08em]">
                    Participants
                  </h3>
                </div>
                <div className="border-l border-[color:var(--rail-accent)] bg-[color:color-mix(in_srgb,var(--chip-bg)_78%,transparent)] px-4 py-[0.85rem] font-['JetBrains_Mono'] text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--rail-accent-text)] max-[720px]:px-[0.85rem] max-[720px]:py-[0.75rem] max-[720px]:text-[0.68rem] max-[720px]:tracking-[0.1em]">
                  ACTIVE ({activeParticipantCount}/{snapshot.participants.length})
                </div>
                <div className="grid min-h-0 content-start auto-rows-max gap-3 overflow-y-auto pr-[0.3rem] max-[720px]:gap-[0.65rem] max-[720px]:pb-1 max-[720px]:pr-[0.1rem]">
                  {snapshot.participants.map((participant) => {
                    const isViewer = participant.id === snapshot.viewer.participantId;
                    const canKick = !isViewer && participant.role !== "moderator";

                    return (
                      <div
                        className={`grid min-h-[4.1rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[0.7rem] rounded-[10px] border px-[0.85rem] py-[0.8rem] max-[720px]:grid-cols-[auto_minmax(0,1fr)] max-[720px]:items-start max-[720px]:gap-x-[0.65rem] max-[720px]:gap-y-2 ${
                          isViewer
                            ? "border-[color:var(--participant-active-border)] bg-[color:var(--participant-active-bg)]"
                            : "border-transparent bg-[color:var(--row-bg)]"
                        }`}
                        key={participant.id}
                      >
                        <div className={`presence-dot presence-dot--${participant.presence} max-[720px]:mt-[0.32rem]`} />
                        <div className="grid min-w-0 gap-[0.2rem]">
                          <strong className="text-[0.92rem]">{participant.name}</strong>
                          <span className="font-['JetBrains_Mono'] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--muted)]">
                            {participant.role === "moderator"
                              ? isViewer
                                ? "HOST / YOU"
                                : "HOST"
                              : participant.hasVoted
                                ? "VOTED"
                                : "WAITING"}
                          </span>
                        </div>
                        <div className="flex items-center justify-end max-[720px]:col-start-2 max-[720px]:justify-start">
                          {canKick ? (
                            <Button
                              className="max-[720px]:min-h-[2.7rem] max-[720px]:px-4"
                              disabled={pendingKickId === participant.id}
                              onClick={() => handleKickParticipant(participant)}
                              variant="danger"
                            >
                              {pendingKickId === participant.id ? "REMOVING..." : "REMOVE"}
                            </Button>
                          ) : (
                            <span className="mono-muted whitespace-nowrap">{isViewer ? "YOU" : "LOCKED"}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </AppModal>
      ) : null}

    </div>
  );
};
