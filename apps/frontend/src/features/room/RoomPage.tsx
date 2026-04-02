import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { VOTE_CARD_META, type ParticipantSnapshot } from "@terminal-poker/shared-types";

import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { StatusChip } from "../../components/StatusChip";
import { apiClient, ApiError } from "../../lib/api/client";
import { sessionStorageStore } from "../../lib/storage";
import { useRoomConnection } from "./useRoomConnection";

const ParticipantRail = ({
  currentParticipantId,
  participants
}: {
  currentParticipantId: string;
  participants: ParticipantSnapshot[];
}) => (
  <aside className="participant-rail card card--rail">
    <div className="participant-rail__header">
      <div>
        <div className="rail-kicker">ROOM STATE</div>
        <h2>Connected participants</h2>
      </div>
    </div>
    <div className="participant-list">
      {participants?.map((participant) => (
        <div
          className={`participant-row ${
            participant.id === currentParticipantId ? "participant-row--active" : ""
          }`}
          key={participant.id}
        >
          <div className={`presence-dot presence-dot--${participant.presence}`} />
          <div className="participant-row__identity">
            <strong>{participant.name}</strong>
            <span>{participant.role === "moderator" ? "moderator" : participant.hasVoted ? "voted" : "waiting"}</span>
          </div>
          <div className="participant-row__vote">
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
  const [ticketDraft, setTicketDraft] = useState("");
  const { castVote, error, isLoading, isRealtimeReady, resetRound, revealRound, snapshot, updateTicket } =
    useRoomConnection(roomCode, participantToken);

  useEffect(() => {
    if (snapshot) {
      setTicketDraft(snapshot.round.jiraTicketKey ?? "");
    }
  }, [snapshot?.round.id, snapshot?.round.jiraTicketKey]);

  const votedCount = useMemo(
    () => snapshot?.participants.filter((participant) => participant.hasVoted).length ?? 0,
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
    } catch (requestError) {
      setJoinError(requestError instanceof ApiError ? requestError.message : "Unable to join room.");
    }
  };

  const copyRoomLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  if (!roomCode) {
    navigate("/");
    return null;
  }

  if (!participantToken) {
    return (
      <div className="shell shell--room">
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark">▣</span>
            <span className="brand__text">TERMINAL_POKER</span>
          </div>
          <StatusChip tone="accent">ROOM {roomCode}</StatusChip>
        </header>
        <main className="join-gate">
          <form className="card join-gate__card" onSubmit={handleInlineJoin}>
            <div className="section-header">
              <StatusChip>JOIN ROOM</StatusChip>
              <h1>Attach to {roomCode}</h1>
            </div>
            <Field
              label="Display Name"
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              placeholder="cyber_punk"
              required
            />
            <Field
              label="Join Passcode"
              value={joinPasscode}
              onChange={(event) => setJoinPasscode(event.target.value)}
              placeholder="only if required"
              type="password"
            />
            <Button stretch type="submit">
              [JOIN_SESSION]
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
          <StatusChip tone="accent">BOOTSTRAP</StatusChip>
          <h1>Restoring room state…</h1>
          <p>HTTP hydration is loading the authoritative room snapshot before realtime starts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell shell--room">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">▣</span>
          <span className="brand__text">TERMINAL_POKER</span>
        </div>
        <div className="topbar__meta">
          <StatusChip tone="accent">ROOM {snapshot.room.code}</StatusChip>
          <span className="mono-muted">{isRealtimeReady ? "SOCKET ONLINE" : "CONNECTING SOCKET"}</span>
          <Button onClick={copyRoomLink} variant="ghost">
            COPY LINK
          </Button>
        </div>
      </header>

      <main className="room-layout">
        <ParticipantRail
          currentParticipantId={snapshot.viewer.participantId}
          participants={snapshot.participants}
        />

        <section className="room-main">
          <div className="card hero-card">
            <div className="hero-card__eyebrow">
              <StatusChip tone={snapshot.round.status === "revealed" ? "success" : "accent"}>
                {snapshot.round.status === "revealed" ? "REVEALED_RESULTS" : "ACTIVE_SESSION"}
              </StatusChip>
              <span className="mono-muted">
                {votedCount}/{snapshot.participants.length} VOTED
              </span>
            </div>
            <h1 className="ticket-title">{snapshot.round.jiraTicketKey ?? "NO_TICKET_SET"}</h1>
            <p className="hero-copy">
              {snapshot.round.jiraTicketUrl ? (
                <a className="ticket-link" href={snapshot.round.jiraTicketUrl} rel="noreferrer" target="_blank">
                  Open Jira issue
                </a>
              ) : (
                "Set a Jira ticket key or numeric ID to anchor the current estimation round."
              )}
            </p>
          </div>

          <div className="room-content-grid">
            <section className="card round-card">
              <div className="section-header">
                <StatusChip tone="accent">ROUND CONTROL</StatusChip>
                <h2>Ticket and moderator actions</h2>
              </div>

              <div className="ticket-editor">
                <Field
                  disabled={snapshot.viewer.role !== "moderator"}
                  label="Jira Ticket Key / ID"
                  value={ticketDraft}
                  onChange={(event) => setTicketDraft(event.target.value.toUpperCase())}
                  placeholder="PROJ-123"
                />
                <Button
                  disabled={snapshot.viewer.role !== "moderator"}
                  onClick={() => updateTicket(ticketDraft || null)}
                  variant="secondary"
                >
                  SAVE TICKET
                </Button>
              </div>

              <div className="action-row">
                <Button
                  disabled={snapshot.viewer.role !== "moderator" || snapshot.round.status === "revealed"}
                  onClick={revealRound}
                >
                  [R] REVEAL
                </Button>
                <Button disabled={snapshot.viewer.role !== "moderator"} onClick={resetRound} variant="secondary">
                  [N] RESET
                </Button>
              </div>

              {snapshot.round.summary ? (
                <div className="summary-grid">
                  <div className="summary-card">
                    <span>Average</span>
                    <strong>{snapshot.round.summary.average ?? "n/a"}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Consensus</span>
                    <strong>{snapshot.round.summary.consensus ?? "split"}</strong>
                  </div>
                </div>
              ) : (
                <div className="waiting-banner">Votes remain hidden until the moderator reveals the round.</div>
              )}
            </section>

            <section className="card deck-card">
              <div className="section-header">
                <StatusChip tone="success">VOTING_DECK</StatusChip>
                <h2>Fibonacci estimation</h2>
              </div>
              <div className="vote-grid">
                {VOTE_CARD_META.map((card) => {
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

          <section className="card footer-card">
            <div className="shortcut-strip">
              <span>[1-0, /] VOTE</span>
              <span>[R] REVEAL</span>
              <span>[N] RESET</span>
              <span>POSTGRESQL IS SOURCE OF TRUTH</span>
            </div>
            {error || joinError ? <div className="notice notice--error">{error ?? joinError}</div> : null}
          </section>
        </section>
      </main>
    </div>
  );
};
