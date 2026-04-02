import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [ticketDraft, setTicketDraft] = useState("");
  const [jiraBaseUrlDraft, setJiraBaseUrlDraft] = useState("");
  const [votingDeckIdDraft, setVotingDeckIdDraft] = useState<UpdateRoomSettingsPayload["votingDeckId"]>("modified-fibonacci");
  const [newPasscodeDraft, setNewPasscodeDraft] = useState("");
  const [pendingKickId, setPendingKickId] = useState<string | null>(null);
  const {
    castVote,
    error,
    isLoading,
    isRealtimeReady,
    kickParticipant,
    resetRound,
    revealRound,
    unrevealRound,
    sessionEndedError,
    snapshot,
    updateRoomSettings,
    updateTicket
  } = useRoomConnection(roomCode, participantToken);

  useEffect(() => {
    if (snapshot) {
      setTicketDraft(snapshot.round.jiraTicketKey ?? "");
    }
  }, [snapshot?.round.id, snapshot?.round.jiraTicketKey]);

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
    setJoinError(sessionEndedError.message);
  }, [roomCode, sessionEndedError]);

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

  const votedCount = useMemo(
    () => snapshot?.participants.filter((participant) => participant.hasVoted).length ?? 0,
    [snapshot]
  );
  const voteCardMeta = useMemo<ReturnType<typeof getVoteCardMeta>>(
    () => (snapshot ? getVoteCardMeta(snapshot.room.votingDeckId) : []),
    [snapshot]
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
      setParticipantToken(response.participantToken);
      setJoinName("");
      setJoinPasscode("");
    } catch (requestError) {
      setJoinError(requestError instanceof ApiError ? requestError.message : "Unable to join room.");
    }
  };

  const copyRoomLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
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

  return (
    <div className="shell shell--room">
      <AppHeader>
        <StatusChip tone="accent">ROOM {snapshot.room.code}</StatusChip>
        <span className="mono-muted">{isRealtimeReady ? "LIVE" : "SYNCING"}</span>
        {isModerator ? (
          <Button onClick={() => setIsSettingsOpen((current) => !current)} variant="ghost">
            {isSettingsOpen ? "CLOSE" : "SETTINGS"}
          </Button>
        ) : null}
        <Button onClick={copyRoomLink} variant="ghost">
          COPY LINK
        </Button>
      </AppHeader>

      <main className="room-layout">
        <ParticipantRail
          currentParticipantId={snapshot.viewer.participantId}
          roundStatus={snapshot.round.status}
          participants={snapshot.participants}
        />

        <section className="room-main">
          {isModerator && isSettingsOpen ? (
            <section className="card settings-card">
              <div className="section-header">
                <StatusChip tone="accent">SETTINGS</StatusChip>
                <h2>Room config</h2>
              </div>

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
            </section>
          ) : null}

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

          <div className="room-content-grid">
            {isModerator ? (
              <section className="card round-card">
                <div className="section-header">
                  <StatusChip tone="accent">CONTROL</StatusChip>
                  <h2>Round actions</h2>
                </div>

                <div className="ticket-editor">
                  <Field
                    label="TICKET"
                    value={ticketDraft}
                    onChange={(event) => setTicketDraft(event.target.value.toUpperCase())}
                    placeholder="PROJ-123"
                  />
                  <Button onClick={() => updateTicket(ticketDraft || null)} variant="secondary">
                    SAVE
                  </Button>
                </div>

                <div className="action-row">
                  <Button
                    onClick={snapshot.round.status === "revealed" ? unrevealRound : revealRound}
                    variant={snapshot.round.status === "revealed" ? "danger" : "primary"}
                  >
                    {snapshot.round.status === "revealed" ? "UNREVEAL" : "REVEAL"}
                  </Button>
                  <Button onClick={resetRound} variant="secondary">
                    RESET
                  </Button>
                </div>

                {!snapshot.round.summary ? <div className="waiting-banner">VOTES STAY HIDDEN UNTIL REVEAL.</div> : null}
              </section>
            ) : null}

            <section className="card deck-card">
              <div className="section-header">
                <StatusChip tone="success">DECK</StatusChip>
                <h2>{getVotingDeckName(snapshot.room.votingDeckId)}</h2>
              </div>
              <div className="vote-grid">
                {voteCardMeta.map((card) => {
                  const isSelected = snapshot.viewer.selectedVote === card.value;
                  return (
                    <button
                      className={`vote-tile ${isSelected ? "vote-tile--selected" : ""}`}
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
            </section>
          </div>

          {error || joinError ? <div className="notice notice--error">{error ?? joinError}</div> : null}
        </section>
      </main>
    </div>
  );
};
