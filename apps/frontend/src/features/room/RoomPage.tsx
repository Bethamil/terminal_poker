import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getVoteCardMeta, type ParticipantSnapshot, type UpdateRoomSettingsPayload } from "@terminal-poker/shared-types";

import { AppLayout } from "../../components/AppLayout";
import { Button } from "../../components/Button";
import { StatusChip } from "../../components/StatusChip";
import { apiClient, ApiError } from "../../lib/api/client";
import { sessionStorageStore } from "../../lib/storage";
import { LiveRoomView } from "./components/LiveRoomView";
import { RoomJoinGateView } from "./components/RoomJoinGateView";
import { RoomLoadingView } from "./components/RoomLoadingView";
import { RoomSettingsModal, type RoomSettingsTab } from "./components/RoomSettingsModal";
import { countOnlineParticipants, formatVoteShortcutHint } from "./roomViewUtils";
import { useRoomConnection } from "./useRoomConnection";

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
  const [settingsTab, setSettingsTab] = useState<RoomSettingsTab>("room");
  const [isSettingsSaved, setIsSettingsSaved] = useState(false);
  const [roomLinkStatus, setRoomLinkStatus] = useState<"idle" | "copied" | "error">("idle");
  const [isLeaving, setIsLeaving] = useState(false);
  const [ticketDraft, setTicketDraft] = useState("");
  const [jiraBaseUrlDraft, setJiraBaseUrlDraft] = useState("");
  const [votingDeckIdDraft, setVotingDeckIdDraft] =
    useState<UpdateRoomSettingsPayload["votingDeckId"]>("modified-fibonacci");
  const [newPasscodeDraft, setNewPasscodeDraft] = useState("");
  const [pendingKickId, setPendingKickId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const settingsSavedTimeoutRef = useRef<number | null>(null);
  const {
    castVote,
    error,
    isLoading,
    isRealtimeReady,
    kickParticipant,
    leaveRoom,
    resetRound,
    revealRound,
    sessionEndedError,
    snapshot,
    unrevealRound,
    updateRoomSettings,
    updateTicket
  } = useRoomConnection(roomCode, participantToken);

  useEffect(() => {
    setParticipantToken(roomCode ? sessionStorageStore.getParticipantToken(roomCode) : null);
  }, [roomCode]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setTicketDraft(snapshot.round.jiraTicketKey ?? "");
    sessionStorageStore.rememberRoom(snapshot.room.code, snapshot.room.name);
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
    if (!isSettingsOpen) {
      return;
    }

    setSettingsTab("room");
    setSettingsError(null);
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
        joinPasscode: joinPasscodeMode === "set" ? trimmedPasscode : null,
        joinPasscodeMode,
        votingDeckId: votingDeckIdDraft
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
      <AppLayout
        variant="room"
        header={{
          children: <StatusChip tone="accent">ROOM {roomCode}</StatusChip>
        }}
        main={<RoomJoinGateView
          joinError={joinError}
          joinName={joinName}
          joinPasscode={joinPasscode}
          onJoinNameChange={setJoinName}
          onJoinPasscodeChange={setJoinPasscode}
          onSubmit={handleInlineJoin}
          roomCode={roomCode}
        />}
        mainClassName="join-gate"
      />
    );
  }

  if (isLoading || !snapshot) {
    return (
      <AppLayout
        variant="room"
        main={<RoomLoadingView />}
        mainClassName="grid min-h-[60vh] place-items-center"
      />
    );
  }

  const activeParticipantCount = countOnlineParticipants(snapshot.participants);
  const areRealtimeActionsDisabled = !isRealtimeReady;
  const connectionStatusLabel = isRealtimeReady ? "LIVE" : "SYNC";
  const isModerator = snapshot.viewer.role === "moderator";
  const leaveButtonLabel = isLeaving ? "LEAVING..." : isModerator ? "LEAVE & DELETE" : "LEAVE ROOM";
  const normalizedTicketDraft = ticketDraft.trim().toUpperCase();
  const hasTicketChanged = normalizedTicketDraft !== (snapshot.round.jiraTicketKey ?? "");
  const voteShortcutHint = formatVoteShortcutHint(
    getVoteCardMeta(snapshot.room.votingDeckId).map((card) => card.shortcut)
  );

  return (
    <AppLayout
      variant="room"
      className="relative overflow-hidden"
      header={{
        brandAside: (
          <span className={`topbar__live-indicator ${isRealtimeReady ? "topbar__live-indicator--live" : ""}`.trim()}>
            {connectionStatusLabel}
          </span>
        ),
        actions: (
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
              disabled={areRealtimeActionsDisabled || isLeaving}
              onClick={() => void handleLeaveRoom()}
              variant={isModerator ? "danger" : "ghost"}
            >
              {leaveButtonLabel}
            </Button>
          </>
        ),
        mobileMenu: {
          label: "MENU",
          title: snapshot.room.name,
          renderContent: (closeMenu) => (
            <>
              <div className="mobile-menu__meta shortcut-strip">
                <span>ID {snapshot.room.code}</span>
                <span>{activeParticipantCount}/{snapshot.participants.length} ACTIVE</span>
                <span>{connectionStatusLabel}</span>
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
                  disabled={areRealtimeActionsDisabled || isLeaving}
                  onClick={() => {
                    closeMenu();
                    void handleLeaveRoom();
                  }}
                  variant={isModerator ? "danger" : "ghost"}
                >
                  {leaveButtonLabel}
                </Button>
              </div>
            </>
          )
        }
      }}
      footer={{
        center: (
          <>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isRealtimeReady ? "var(--shell-footer-dot)" : "var(--shell-footer-text)" }}
            />
            <span>{isRealtimeReady ? "CONNECTION_STABLE" : "SYNCING"}</span>
          </>
        ),
        centerClassName: "gap-2",
        left: (
          <>
            <span>{voteShortcutHint}</span>
            {isModerator ? (
              <>
                <span>[R] REVEAL</span>
                <span>[N] NEXT</span>
              </>
            ) : null}
          </>
        ),
        leftClassName: "hidden gap-4 md:flex",
        rightClassName: "gap-2"
      }}
      main={
        <LiveRoomView
          areRealtimeActionsDisabled={areRealtimeActionsDisabled}
          castVote={castVote}
          error={error}
          hasTicketChanged={hasTicketChanged}
          isModerator={isModerator}
          joinError={joinError}
          onInvite={() => void copyRoomLink()}
          onResetRound={resetRound}
          onRevealToggle={snapshot.round.status === "revealed" ? unrevealRound : revealRound}
          onTicketDraftChange={setTicketDraft}
          onUpdateTicket={() => updateTicket(normalizedTicketDraft || null)}
          roomLinkStatus={roomLinkStatus}
          snapshot={snapshot}
          ticketDraft={ticketDraft}
        />
      }
      mainClassName="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]"
      overlay={
        isModerator ? (
          <RoomSettingsModal
            areRealtimeActionsDisabled={areRealtimeActionsDisabled}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            room={{
              hasJoinPasscode: snapshot.room.hasJoinPasscode,
              hasJiraBaseUrl: Boolean(snapshot.room.jiraBaseUrl),
              isSettingsSaved,
              jiraBaseUrlDraft,
              newPasscodeDraft,
              onClearPasscode: () => void saveRoomSettings("clear"),
              onJiraBaseUrlChange: setJiraBaseUrlDraft,
              onNewPasscodeChange: setNewPasscodeDraft,
              onSave: () => void saveRoomSettings(newPasscodeDraft.trim() ? "set" : "keep"),
              onVotingDeckIdChange: setVotingDeckIdDraft,
              settingsError,
              votingDeckIdDraft
            }}
            tab={{
              activeParticipantCount,
              activeTab: settingsTab,
              onTabChange: setSettingsTab
            }}
            users={{
              onKickParticipant: handleKickParticipant,
              participants: snapshot.participants,
              pendingKickId,
              viewerParticipantId: snapshot.viewer.participantId
            }}
          />
        ) : null
      }
    />
  );
};
