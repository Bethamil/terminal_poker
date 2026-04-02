import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { sessionStorageStore, type StoredRoomRecord } from "../../lib/storage";

const initialCreateForm = {
  name: "",
  roomName: "",
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
  const location = useLocation();
  const navigate = useNavigate();
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [joinForm, setJoinForm] = useState(initialJoinForm);
  const [busyForm, setBusyForm] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previousRooms, setPreviousRooms] = useState<StoredRoomRecord[]>(() => sessionStorageStore.getPreviousRooms());

  useEffect(() => {
    const state = location.state as { notice?: string } | null;

    if (!state?.notice) {
      return;
    }

    setNotice(state.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const refreshPreviousRooms = () => {
    setPreviousRooms(sessionStorageStore.getPreviousRooms());
  };

  const formatLastVisited = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setBusyForm("create");
    setError(null);
    setNotice(null);

    try {
      const response = await apiClient.createRoom({
        name: createForm.name,
        roomName: createForm.roomName,
        jiraBaseUrl: createForm.jiraBaseUrl || null,
        joinPasscode: createForm.joinPasscode || null,
        votingDeckId: createForm.votingDeckId
      });
      sessionStorageStore.setParticipantToken(response.roomCode, response.participantToken);
      sessionStorageStore.rememberRoom(response.roomCode, response.snapshot.room.name);
      refreshPreviousRooms();
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
    setNotice(null);

    try {
      const roomCode = joinForm.roomCode.trim().toUpperCase();
      const response = await apiClient.joinRoom(roomCode, {
        name: joinForm.name,
        joinPasscode: joinForm.joinPasscode || null
      });
      sessionStorageStore.setParticipantToken(response.roomCode, response.participantToken);
      sessionStorageStore.rememberRoom(response.roomCode, response.snapshot.room.name);
      refreshPreviousRooms();
      navigate(`/room/${response.roomCode}`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to join room.");
    } finally {
      setBusyForm(null);
    }
  };

  const openPreviousRoom = (roomCode: string) => {
    setError(null);
    setNotice(null);
    navigate(`/room/${roomCode}`);
  };

  const removePreviousRoom = async (room: StoredRoomRecord) => {
    const participantToken = sessionStorageStore.getParticipantToken(room.roomCode);

    setError(null);
    setNotice(null);

    try {
      if (participantToken) {
        const result = await apiClient.leaveRoom(room.roomCode, participantToken);
        setNotice(
          result.roomDeleted ? `${room.roomName} was deleted.` : `You left ${room.roomName}.`
        );
      }
    } catch (requestError) {
      if (
        !(requestError instanceof ApiError) ||
        (requestError.code !== "ROOM_NOT_FOUND" && requestError.code !== "INVALID_SESSION")
      ) {
        setError(requestError instanceof ApiError ? requestError.message : "Unable to leave room.");
        return;
      }
    }

    sessionStorageStore.clearParticipantToken(room.roomCode);
    sessionStorageStore.forgetRoom(room.roomCode);
    refreshPreviousRooms();
  };

  const recentNodes = previousRooms.slice(0, 3);

  return (
    <div className="shell shell--landing relative overflow-hidden">
      <AppHeader>
        <nav
          aria-label="Primary"
          className="flex items-center gap-4 font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.18em] text-[#6f6987]"
        >
          <span className="border-b border-[#8c67ff] pb-1 text-[#d8c7ff]">ROOT</span>
          <span>DOCS</span>
          <span>REPOS</span>
        </nav>
      </AppHeader>

      <main className="mx-auto grid w-full max-w-[1380px] gap-7">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
          <div className="min-w-0">
            <h1 className="hero-title text-[clamp(3.6rem,9vw,8rem)] text-[#f2f0ff]">
              SCRUM_POKER_ROOT
            </h1>
            <div className="mt-4 inline-flex items-center gap-3 font-['JetBrains_Mono'] text-xs uppercase tracking-[0.18em] text-[#9486bb]/85">
              <span className="h-2 w-2 rounded-full bg-[#aa8cff]" aria-hidden="true" />
              <span>SECURE_SESSION_ESTABLISHED // AES-256</span>
            </div>
          </div>

          <aside className="hidden gap-8 lg:grid">
            <section className="grid gap-3">
              <span className="rail-kicker">RECENT_NODES</span>
              {recentNodes.length > 0 ? (
                <div className="grid gap-2">
                  {recentNodes.map((room) => (
                    <button
                      className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-left font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.12em] text-[#a79ebd] transition hover:text-[#f0e9ff]"
                      key={room.roomCode}
                      onClick={() => openPreviousRoom(room.roomCode)}
                      type="button"
                    >
                      <span>{room.roomName.replace(/\s+/g, "_").toUpperCase()}</span>
                      <strong>ID: {room.roomCode}</strong>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.14em] text-[#6f6987]">
                  No cached sessions yet.
                </p>
              )}
            </section>
          </aside>
        </section>

        <section className="card relative overflow-hidden border-white/5 bg-[#09090b]/88 px-5 py-6 shadow-[0_40px_120px_rgba(0,0,0,0.4)] lg:px-8 lg:py-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex gap-2" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-[#8f6b72]" />
              <span className="h-3 w-3 rounded-full bg-[#8b78c7]" />
              <span className="h-3 w-3 rounded-full bg-[#6f6987]" />
            </div>
            <div className="h-px flex-1 bg-white/6" />
            <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.18em] text-[#6f6987]">
              SESSION_V2.4.0
            </span>
          </div>

          <div className="mb-8 flex items-start gap-4 font-['JetBrains_Mono'] text-base tracking-[0.18em] text-[#b8afcc] lg:text-lg">
            <span className="text-[#c7b4ff]">&gt;</span>
            <p className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              user@poker:~$ create_session --jira="
              {createForm.jiraBaseUrl || "https://jira.example.com"}"
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <form
              className="grid gap-4 rounded-[14px] border border-[#15b97b]/20 bg-[#0d1110] p-4 lg:p-5"
              onSubmit={handleCreate}
            >
              <div className="section-header">
                <StatusChip tone="success">CREATE</StatusChip>
                <h2>[CREATE_SESSION]</h2>
              </div>
              <Field
                label="NAME"
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="root_dev"
                required
              />
              <Field
                label="ROOM NAME"
                value={createForm.roomName}
                onChange={(event) => setCreateForm((current) => ({ ...current, roomName: event.target.value }))}
                placeholder="Platform sync"
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
              <Button
                stretch
                disabled={busyForm === "create"}
                style={{
                  background: "var(--action-create-bg)",
                  color: "var(--action-create-text)"
                }}
                type="submit"
              >
                {busyForm === "create" ? "CREATING..." : "CREATE ROOM"}
              </Button>
            </form>

            <form
              className="grid gap-4 rounded-[14px] border border-[#4b7cff]/20 bg-[#0d1015] p-4 lg:p-5"
              onSubmit={handleJoin}
            >
              <div className="section-header">
                <StatusChip>JOIN</StatusChip>
                <h2>[JOIN_SESSION]</h2>
              </div>
              <Field
                label="ROOM CODE"
                value={joinForm.roomCode}
                onChange={(event) =>
                  setJoinForm((current) => ({ ...current, roomCode: event.target.value.toUpperCase() }))
                }
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
              <div className="grid gap-3">
                <span className="rail-kicker">RECENT</span>
                {previousRooms.length > 0 ? (
                  <div className="history-list">
                    {previousRooms.slice(0, 3).map((room) => {
                      const hasActiveSession = Boolean(
                        sessionStorageStore.getParticipantToken(room.roomCode)
                      );

                      return (
                        <div className="history-row" key={room.roomCode}>
                          <div className="history-row__identity">
                            <strong>{room.roomName}</strong>
                            <span>
                              {room.roomCode} · {formatLastVisited(room.lastVisitedAt)}
                            </span>
                          </div>
                          <div className="history-row__actions">
                            <Button onClick={() => openPreviousRoom(room.roomCode)} variant="secondary">
                              {hasActiveSession ? "RESUME" : "OPEN"}
                            </Button>
                            <Button onClick={() => void removePreviousRoom(room)} variant="ghost">
                              REMOVE
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="landing-history__empty">Rooms you visit will show up here.</div>
                )}
              </div>
              <Button
                stretch
                style={{
                  background: "var(--action-join-bg)",
                  color: "var(--action-join-text)"
                }}
                type="submit"
                variant="secondary"
                disabled={busyForm === "join"}
              >
                {busyForm === "join" ? "JOINING..." : "JOIN ROOM"}
              </Button>
            </form>
          </div>

          <div className="mt-6 border-l border-[#a98fff]/50 bg-white/[0.03] px-4 py-3">
            <div className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.18em] text-[#cfbfff]">
              AUTHENTICATION_BYPASS
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#b3acbf]">
              No accounts needed. Sessions are ephemeral and encrypted at rest. Data is purged 24h
              after inactivity.
            </p>
          </div>
        </section>
      </main>

      <footer
        className="app-footer z-20 flex h-10 items-center justify-between px-4 font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.16em] backdrop-blur-xl"
        style={{
          background: "var(--shell-footer-bg)",
          borderTop: "1px solid var(--shell-footer-border)",
          color: "var(--shell-footer-text)"
        }}
      >
        <div className="flex items-center gap-4">
          <span>V2.4.0-STABLE</span>
          <span>SYSTEM_ONLINE</span>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <span>ENTER TO START</span>
          <span>ESC CLEAR SHELL</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" aria-hidden="true" style={{ background: "var(--shell-footer-dot)" }} />
          <span>LATENCY: 14MS</span>
        </div>
      </footer>

      {notice ? (
        <div className="notice notice--info fixed bottom-14 right-4 z-30 max-w-md">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="notice notice--error fixed bottom-14 right-4 z-30 max-w-md">
          {error}
        </div>
      ) : null}
    </div>
  );
};
