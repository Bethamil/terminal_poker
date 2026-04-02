import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_VOTING_DECK_ID,
  VOTING_DECK_OPTIONS,
  type VotingDeckId
} from "@terminal-poker/shared-types";

import { AppHeader } from "../../components/AppHeader";
import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { SelectField } from "../../components/SelectField";
import { StatusChip } from "../../components/StatusChip";
import { apiClient, ApiError } from "../../lib/api/client";
import { sessionStorageStore } from "../../lib/storage";

const initialCreateForm = {
  name: "",
  jiraBaseUrl: "",
  joinPasscode: "",
  votingDeckId: DEFAULT_VOTING_DECK_ID
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
        joinPasscode: createForm.joinPasscode || null,
        votingDeckId: createForm.votingDeckId
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
        <StatusChip tone="accent">TERMINAL POKER</StatusChip>
        <span className="mono-muted">CREATE / JOIN</span>
      </AppHeader>

      <main className="landing-grid">
        <section className="landing-hero card card--ghost">
          <h1 className="hero-title">Create a room or join one.</h1>
          <p className="hero-copy">Everything starts here.</p>
        </section>

        <section className="landing-actions">
          <form className="card action-card" onSubmit={handleCreate}>
            <div className="section-header">
              <StatusChip tone="success">CREATE</StatusChip>
              <h2>New room</h2>
            </div>
            <Field
              label="NAME"
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="root_dev"
              required
            />
            <Field
              label="JIRA URL"
              value={createForm.jiraBaseUrl}
              onChange={(event) => setCreateForm((current) => ({ ...current, jiraBaseUrl: event.target.value }))}
              placeholder="https://jira.example.com"
            />
            <Field
              label="PASSCODE"
              value={createForm.joinPasscode}
              onChange={(event) => setCreateForm((current) => ({ ...current, joinPasscode: event.target.value }))}
              placeholder="optional"
              type="password"
              hint="Only if you want the room locked."
            />
            <SelectField
              label="DECK"
              value={createForm.votingDeckId}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, votingDeckId: event.target.value as VotingDeckId }))
              }
              hint="Can be changed later."
            >
              {VOTING_DECK_OPTIONS.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </SelectField>
            <Button stretch disabled={busyForm === "create"} type="submit">
              {busyForm === "create" ? "CREATING..." : "CREATE ROOM"}
            </Button>
          </form>

          <form className="card action-card" onSubmit={handleJoin}>
            <div className="section-header">
              <StatusChip>JOIN</StatusChip>
              <h2>Existing room</h2>
            </div>
            <Field
              label="ROOM CODE"
              value={joinForm.roomCode}
              onChange={(event) => setJoinForm((current) => ({ ...current, roomCode: event.target.value.toUpperCase() }))}
              placeholder="AB123"
              required
            />
            <Field
              label="NAME"
              value={joinForm.name}
              onChange={(event) => setJoinForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="stack_trace"
              required
            />
            <Field
              label="PASSCODE"
              value={joinForm.joinPasscode}
              onChange={(event) => setJoinForm((current) => ({ ...current, joinPasscode: event.target.value }))}
              placeholder="only if needed"
              type="password"
            />
            <Button stretch variant="secondary" disabled={busyForm === "join"} type="submit">
              {busyForm === "join" ? "JOINING..." : "JOIN ROOM"}
            </Button>
          </form>
        </section>
      </main>

      {error ? <div className="notice notice--error">{error}</div> : null}
    </div>
  );
};
