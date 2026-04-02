import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppHeader } from "../../components/AppHeader";
import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { StatusChip } from "../../components/StatusChip";
import { apiClient, ApiError } from "../../lib/api/client";
import { sessionStorageStore } from "../../lib/storage";

const initialCreateForm = {
  name: "",
  jiraBaseUrl: "",
  joinPasscode: ""
};

const initialJoinForm = {
  roomCode: "",
  name: "",
  joinPasscode: ""
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [joinForm, setJoinForm] = useState(initialJoinForm);
  const [busyForm, setBusyForm] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setBusyForm("create");
    setError(null);

    try {
      const response = await apiClient.createRoom({
        name: createForm.name,
        jiraBaseUrl: createForm.jiraBaseUrl || null,
        joinPasscode: createForm.joinPasscode || null
      });
      sessionStorageStore.setParticipantToken(response.roomCode, response.participantToken);
      navigate(`/room/${response.roomCode}`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to create room.");
    } finally {
      setBusyForm(null);
    }
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setBusyForm("join");
    setError(null);

    try {
      const roomCode = joinForm.roomCode.trim().toUpperCase();
      const response = await apiClient.joinRoom(roomCode, {
        name: joinForm.name,
        joinPasscode: joinForm.joinPasscode || null
      });
      sessionStorageStore.setParticipantToken(response.roomCode, response.participantToken);
      navigate(`/room/${response.roomCode}`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to join room.");
    } finally {
      setBusyForm(null);
    }
  };

  return (
    <div className="shell shell--landing">
      <AppHeader>
        <StatusChip tone="accent">SCRUM_POKER_ROOT</StatusChip>
        <span className="mono-muted">NO ACCOUNTS // SELF HOSTED // REALTIME</span>
      </AppHeader>

      <main className="landing-grid">
        <section className="landing-hero card card--ghost">
          <StatusChip tone="accent">SECURE SESSION ESTABLISHED</StatusChip>
          <h1 className="hero-title">Synthetic scrum poker for engineering teams.</h1>
          <p className="hero-copy">
            Fast room creation, durable PostgreSQL-backed state, typed realtime events, and a UI pulled from the
            terminal-editorial design system in this repo.
          </p>
          <div className="hero-console">
            <div className="hero-console__line">
              <span>&gt;</span>
              <span>create_session --jira=&quot;https://jira.example.com&quot;</span>
            </div>
            <div className="hero-console__line hero-console__line--muted">
              <span>&gt;</span>
              <span>join_session --room=AB123 --name=&quot;kernel_panic&quot;</span>
            </div>
          </div>
          <div className="hero-metrics">
            <div className="metric-card">
              <span className="metric-card__label">Realtime</span>
              <strong>Socket.IO + Redis</strong>
            </div>
            <div className="metric-card">
              <span className="metric-card__label">State</span>
              <strong>PostgreSQL</strong>
            </div>
            <div className="metric-card">
              <span className="metric-card__label">Keyboard</span>
              <strong>1-0, /, R, N</strong>
            </div>
          </div>
        </section>

        <section className="landing-actions">
          <form className="card action-card" onSubmit={handleCreate}>
            <div className="section-header">
              <StatusChip tone="success">CREATE</StatusChip>
              <h2>Spin up a room</h2>
            </div>
            <Field
              label="Moderator Name"
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="root_dev"
              required
            />
            <Field
              label="Jira Base URL"
              value={createForm.jiraBaseUrl}
              onChange={(event) => setCreateForm((current) => ({ ...current, jiraBaseUrl: event.target.value }))}
              placeholder="https://jira.example.com"
            />
            <Field
              label="Optional Join Passcode"
              value={createForm.joinPasscode}
              onChange={(event) => setCreateForm((current) => ({ ...current, joinPasscode: event.target.value }))}
              placeholder="shared secret"
              type="password"
              hint="If set, everyone joining this room must enter it."
            />
            <Button stretch disabled={busyForm === "create"} type="submit">
              {busyForm === "create" ? "CREATING..." : "[CREATE_SESSION]"}
            </Button>
          </form>

          <form className="card action-card" onSubmit={handleJoin}>
            <div className="section-header">
              <StatusChip>JOIN</StatusChip>
              <h2>Attach to a room</h2>
            </div>
            <Field
              label="Room Code"
              value={joinForm.roomCode}
              onChange={(event) => setJoinForm((current) => ({ ...current, roomCode: event.target.value.toUpperCase() }))}
              placeholder="AB123"
              required
            />
            <Field
              label="Display Name"
              value={joinForm.name}
              onChange={(event) => setJoinForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="stack_trace"
              required
            />
            <Field
              label="Join Passcode"
              value={joinForm.joinPasscode}
              onChange={(event) => setJoinForm((current) => ({ ...current, joinPasscode: event.target.value }))}
              placeholder="only if required"
              type="password"
            />
            <Button stretch variant="secondary" disabled={busyForm === "join"} type="submit">
              {busyForm === "join" ? "JOINING..." : "[JOIN_SESSION]"}
            </Button>
          </form>
        </section>
      </main>

      {error ? <div className="notice notice--error">{error}</div> : null}
    </div>
  );
};
