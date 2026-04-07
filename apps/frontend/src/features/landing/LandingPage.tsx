import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DEFAULT_VOTING_DECK_ID,
  VOTING_DECK_OPTIONS,
  type VotingDeckId
} from "@terminal-poker/shared-types";

import { AppLayout } from "../../components/AppLayout";
import { AppModal } from "../../components/AppModal";
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
  roomCode: ""
};

export const LandingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [joinForm, setJoinForm] = useState(initialJoinForm);
  const [busyForm, setBusyForm] = useState<"create" | null>(null);
  const [activeDialog, setActiveDialog] = useState<"create" | "join" | null>(null);
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
      setActiveDialog(null);
      navigate(`/room/${response.roomCode}`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to create room.");
    } finally {
      setBusyForm(null);
    }
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const roomCode = joinForm.roomCode.trim().toUpperCase();
    if (!roomCode) {
      return;
    }

    setActiveDialog(null);
    navigate(`/room/${roomCode}`);
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
    <AppLayout
      variant="landing"
      className="relative overflow-hidden"
      header={{ splitTopbar: true }}
      footer={{
        left: <span>SYSTEM_ONLINE</span>,
        leftClassName: "gap-4",
        rightClassName: "gap-2"
      }}
      main={
        <>
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
            <div className="min-w-0">
              <h1 className="hero-title landing-hero-title">
                {"SCRUM_POKER_ROOT".split("_").join("_\u200b")}
              </h1>
              <div className="landing-hero-status mt-4 flex min-w-0 flex-nowrap items-start gap-3 font-['JetBrains_Mono'] text-xs uppercase tracking-[0.18em]">
                <span
                  aria-hidden="true"
                  className="landing-hero-status__dot mt-[0.35em] h-2 w-2 shrink-0 rounded-full"
                />
                <span className="min-w-0 break-words">
                  REALTIME_SESSION_READY // NO_ACCOUNT_REQUIRED
                </span>
              </div>
            </div>

            <aside className="hidden gap-8 lg:grid">
              <section className="grid gap-3">
                <span className="rail-kicker">RECENT_NODES</span>
                {recentNodes.length > 0 ? (
                  <div className="grid gap-2">
                    {recentNodes.map((room) => (
                      <button
                        className="landing-node-link grid gap-x-3 gap-y-1 border-b pb-2 text-left font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.12em] transition lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
                        key={room.roomCode}
                        onClick={() => openPreviousRoom(room.roomCode)}
                        type="button"
                      >
                        <span className="min-w-0 break-words leading-snug">
                          {room.roomName.replace(/\s+/g, "_").toUpperCase()}
                        </span>
                        <strong className="justify-self-start leading-snug xl:justify-self-end">
                          ID: {room.roomCode}
                        </strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="landing-node-empty font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.14em]">
                    No cached sessions yet.
                  </p>
                )}
              </section>
            </aside>
          </section>

          <section className="landing-window card relative overflow-hidden px-5 py-6 lg:px-8 lg:py-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex gap-2" aria-hidden="true">
                <span className="landing-window__dot landing-window__dot--red h-3 w-3 rounded-full" />
                <span className="landing-window__dot landing-window__dot--purple h-3 w-3 rounded-full" />
                <span className="landing-window__dot landing-window__dot--muted h-3 w-3 rounded-full" />
              </div>
              <div className="h-px flex-1 bg-white/6" />
            </div>

            <div className="landing-window__command mb-8 flex items-start gap-4 font-['JetBrains_Mono'] text-base tracking-[0.18em] lg:text-lg">
              <span className="landing-window__prompt">&gt;</span>
              <p className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                user@poker:~$ select_session_mode --target="create|join"
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="landing-form landing-form--create grid h-full content-start gap-4 p-4 [grid-template-rows:auto_auto_minmax(0,1fr)_auto]">
                <div className="section-header">
                  <StatusChip tone="success">CREATE</StatusChip>
                  <h2>[CREATE_SESSION]</h2>
                </div>
                <p className="hero-copy hero-copy--inline">
                  Start a new planning room with ticket sync, optional locking, and the deck you want.
                </p>
                <div className="shortcut-strip">
                  <span>JIRA OPTIONAL</span>
                  <span>LOCK OPTIONAL</span>
                  <span>DECK SELECTABLE</span>
                </div>
                <Button
                  className="mt-auto w-full lg:min-w-48 lg:w-fit"
                  onClick={() => setActiveDialog("create")}
                  style={{
                    background: "var(--action-create-bg)",
                    color: "var(--action-create-text)"
                  }}
                >
                  CREATE ROOM
                </Button>
              </article>

              <article className="landing-form landing-form--join grid h-full content-start gap-4 p-4 [grid-template-rows:auto_auto_minmax(0,1fr)_auto]">
                <div className="section-header">
                  <StatusChip>JOIN</StatusChip>
                  <h2>[JOIN_SESSION]</h2>
                </div>
                <p className="hero-copy hero-copy--inline">
                  Enter the room code first. If the room needs a passcode or your user name, the room gate asks next.
                </p>
                <div className="shortcut-strip">
                  <span>ROOM CODE FIRST</span>
                  <span>USER NAME NEXT</span>
                  <span>PASSCODE IF NEEDED</span>
                </div>
                <Button
                  className="mt-auto w-full lg:min-w-48 lg:w-fit"
                  style={{
                    background: "var(--action-join-bg)",
                    color: "var(--action-join-text)"
                  }}
                  variant="secondary"
                  onClick={() => setActiveDialog("join")}
                >
                  JOIN ROOM
                </Button>
              </article>
            </div>

            <div className="landing-note mt-6 border-l px-4 py-3">
              <div className="landing-note__title font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.18em]">
                AUTHENTICATION_BYPASS
              </div>
              <p className="landing-note__body mt-2 max-w-3xl text-sm leading-7">
                No accounts. No signup loops. Drop in with a user name, lock the room with a passcode if
                needed, and resume in the same browser.
              </p>
            </div>
          </section>
        </>
      }
      mainClassName="mx-auto grid w-full max-w-[1380px] content-start gap-7"
      overlay={
        <>
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

          {activeDialog === "create" ? (
            <AppModal
              label="CREATE"
              onClose={() => setActiveDialog(null)}
              title="Create room"
              titleId="landing-create-title"
            >
              <form className="grid gap-[0.9rem]" onSubmit={handleCreate}>
                <p className="hero-copy hero-copy--inline">
                  Set up the room once, then share the invite link from inside the session.
                </p>
                <Field
                  label="USER NAME"
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
            </AppModal>
          ) : null}

          {activeDialog === "join" ? (
            <AppModal
              label="JOIN"
              onClose={() => setActiveDialog(null)}
              title="Join room"
              titleId="landing-join-title"
            >
              <form className="grid gap-[0.9rem]" onSubmit={handleJoin}>
                <p className="hero-copy hero-copy--inline">
                  Enter the room code here. The room page will ask for your user name and a passcode only if required.
                </p>
                <Field
                  label="ROOM CODE"
                  value={joinForm.roomCode}
                  onChange={(event) =>
                    setJoinForm((current) => ({ ...current, roomCode: event.target.value.toUpperCase() }))
                  }
                  placeholder="AB123"
                  required
                />
                <Button
                  stretch
                  style={{
                    background: "var(--action-join-bg)",
                    color: "var(--action-join-text)"
                  }}
                  type="submit"
                  variant="secondary"
                >
                  OPEN ROOM
                </Button>
              </form>

              <div className="mt-4 grid gap-[0.9rem] border-t border-[color:var(--outline)] pt-4">
                <span className="rail-kicker">RECENT</span>
                {previousRooms.length > 0 ? (
                  <div className="grid gap-4">
                    {previousRooms.slice(0, 3).map((room) => {
                      const hasActiveSession = Boolean(sessionStorageStore.getParticipantToken(room.roomCode));

                      return (
                        <div
                          className="grid items-center gap-3 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--panel-bg)] px-4 py-[0.95rem] sm:grid-cols-[minmax(0,1fr)_auto]"
                          key={room.roomCode}
                        >
                          <div className="grid min-w-0 gap-[0.2rem]">
                            <strong className="text-[0.95rem]">{room.roomName}</strong>
                            <span className="font-['JetBrains_Mono'] text-[0.72rem] tracking-[0.08em] text-[color:var(--muted)]">
                              {room.roomCode} · {formatLastVisited(room.lastVisitedAt)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-start gap-[0.55rem] sm:justify-end">
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
                  <div className="rounded-[10px] border border-dashed border-[color:var(--outline)] bg-[color:var(--panel-bg)] p-4 text-[0.9rem] leading-[1.5] text-[color:var(--text-soft)]">
                    Rooms you visit will show up here.
                  </div>
                )}
              </div>
            </AppModal>
          ) : null}
        </>
      }
    />
  );
};
