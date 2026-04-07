import {
  VOTING_DECK_OPTIONS,
  type ParticipantRole,
  type ParticipantSnapshot,
  type UpdateRoomSettingsPayload
} from "@terminal-poker/shared-types";

import { AppModal } from "../../../components/AppModal";
import { Button } from "../../../components/Button";
import { Field } from "../../../components/Field";
import { SelectField } from "../../../components/SelectField";
import { StatusChip } from "../../../components/StatusChip";

export type RoomSettingsTab = "room" | "users";
type VotingDeckId = UpdateRoomSettingsPayload["votingDeckId"];

const settingsTabs: Array<{
  id: RoomSettingsTab;
  label: string;
  chip: string | ((participantCount: number) => string);
}> = [
  { id: "room", label: "ROOM", chip: "CONFIG" },
  { id: "users", label: "USERS", chip: (participantCount) => `${participantCount} ACTIVE` }
];

const getRoleLabel = (role: ParticipantRole): string => {
  switch (role) {
    case "moderator":
      return "HOST";
    case "observer":
      return "OBSERVER";
    default:
      return "VOTER";
  }
};

interface RoomSettingsModalTabState {
  activeParticipantCount: number;
  activeTab: RoomSettingsTab;
  onTabChange: (tab: RoomSettingsTab) => void;
}

interface RoomSettingsModalRoomState {
  hasJoinPasscode: boolean;
  hasJiraBaseUrl: boolean;
  isSettingsSaved: boolean;
  jiraBaseUrlDraft: string;
  newPasscodeDraft: string;
  onClearPasscode: () => void;
  onJiraBaseUrlChange: (value: string) => void;
  onNewPasscodeChange: (value: string) => void;
  onSave: () => void;
  onVotingDeckIdChange: (value: VotingDeckId) => void;
  settingsError: string | null;
  votingDeckIdDraft: VotingDeckId;
}

interface RoomSettingsModalUsersState {
  onChangeParticipantRole: (participantId: string, newRole: ParticipantRole) => void;
  onKickParticipant: (participant: ParticipantSnapshot) => void;
  participants: ParticipantSnapshot[];
  pendingKickId: string | null;
  viewerParticipantId: string;
}

interface RoomSettingsModalProps {
  areRealtimeActionsDisabled: boolean;
  isOpen: boolean;
  onClose: () => void;
  room: RoomSettingsModalRoomState;
  tab: RoomSettingsModalTabState;
  users: RoomSettingsModalUsersState;
}

export const RoomSettingsModal = ({
  areRealtimeActionsDisabled,
  isOpen,
  onClose,
  room,
  tab,
  users
}: RoomSettingsModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <AppModal
      bodyClassName="overflow-hidden"
      label="SETTINGS"
      onClose={onClose}
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
            {settingsTabs.map((settingsTab) => {
              const chip =
                typeof settingsTab.chip === "function"
                  ? settingsTab.chip(users.participants.length)
                  : settingsTab.chip;
              const isActive = settingsTab.id === tab.activeTab;

              return (
                <button
                  aria-controls={`room-settings-panel-${settingsTab.id}`}
                  aria-selected={isActive}
                  className={`grid cursor-pointer gap-1 rounded-[12px] border px-3 py-2.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-150 hover:-translate-y-[1px] hover:border-[color:var(--button-secondary-border)] hover:bg-[color:var(--panel-strong-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--button-secondary-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--card-bg)] active:translate-y-0 min-[721px]:gap-2 min-[721px]:px-4 min-[721px]:py-3 ${
                    isActive
                      ? "border-[color:var(--button-secondary-border)] bg-[color:var(--button-secondary-bg)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                      : "border-[color:var(--outline)] bg-[color:var(--panel-bg)]"
                  }`}
                  id={`room-settings-tab-${settingsTab.id}`}
                  key={settingsTab.id}
                  onClick={() => tab.onTabChange(settingsTab.id)}
                  role="tab"
                  type="button"
                >
                  <span className="font-['JetBrains_Mono'] text-[0.62rem] uppercase tracking-[0.12em] text-[color:var(--muted)] min-[721px]:text-[0.68rem] min-[721px]:tracking-[0.14em]">
                    {chip}
                  </span>
                  <span className="font-['JetBrains_Mono'] text-[0.82rem] uppercase tracking-[0.08em] text-[color:var(--text)] min-[721px]:text-[0.88rem] min-[721px]:tracking-[0.1em]">
                    {settingsTab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {tab.activeTab === "room" ? (
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
                value={room.jiraBaseUrlDraft}
                onChange={(event) => room.onJiraBaseUrlChange(event.target.value)}
                placeholder="https://jira.example.com"
              />
              <SelectField
                label="DECK"
                value={room.votingDeckIdDraft}
                onChange={(event) =>
                  room.onVotingDeckIdChange(event.target.value as VotingDeckId)
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
                  room.hasJoinPasscode
                    ? "Leave blank to keep the current passcode."
                    : "Leave blank to keep the room open."
                }
                label="NEW PASSCODE"
                value={room.newPasscodeDraft}
                onChange={(event) => room.onNewPasscodeChange(event.target.value)}
                placeholder={room.hasJoinPasscode ? "••••••••" : "optional"}
                type="password"
              />
            </div>
            <div className="shortcut-strip justify-between rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--panel-bg)] px-4 py-[0.8rem] max-[720px]:grid max-[720px]:grid-cols-2 max-[720px]:gap-[0.55rem] max-[720px]:px-[0.85rem] max-[720px]:py-[0.7rem]">
              <span>{room.hasJoinPasscode ? "LOCKED" : "OPEN"}</span>
              <span>{room.hasJiraBaseUrl ? "JIRA ON" : "JIRA OFF"}</span>
            </div>
            <div className="action-row max-[720px]:grid max-[720px]:grid-cols-1 max-[720px]:gap-[0.6rem]">
              <Button
                className="max-[720px]:w-full"
                disabled={areRealtimeActionsDisabled}
                onClick={room.onSave}
                variant="secondary"
              >
                {room.isSettingsSaved ? "SAVED" : "SAVE"}
              </Button>
              {room.hasJoinPasscode ? (
                <Button
                  className="max-[720px]:w-full"
                  disabled={areRealtimeActionsDisabled}
                  onClick={room.onClearPasscode}
                  variant="ghost"
                >
                  CLEAR PASSCODE
                </Button>
              ) : null}
            </div>
            {room.settingsError ? <div className="notice notice--error">{room.settingsError}</div> : null}
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
              ACTIVE ({tab.activeParticipantCount}/{users.participants.length})
            </div>
            <div className="grid min-h-0 content-start auto-rows-max gap-3 overflow-y-auto pr-[0.3rem] max-[720px]:gap-[0.65rem] max-[720px]:pb-1 max-[720px]:pr-[0.1rem]">
              {users.participants.map((participant) => {
                const isViewer = participant.id === users.viewerParticipantId;
                const isModerator = participant.role === "moderator";
                const canKick = !isViewer && !isModerator;
                const canChangeRole = !isViewer && !isModerator;
                const roleLabel = getRoleLabel(participant.role);

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
                        {roleLabel}{isViewer ? " / YOU" : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 max-[720px]:col-start-2 max-[720px]:justify-start">
                      {canChangeRole ? (
                        <>
                          {participant.role !== "participant" ? (
                            <Button
                              className="max-[720px]:min-h-[2.7rem] max-[720px]:px-4"
                              disabled={areRealtimeActionsDisabled}
                              onClick={() => users.onChangeParticipantRole(participant.id, "participant")}
                              variant="ghost"
                            >
                              MAKE VOTER
                            </Button>
                          ) : null}
                          {participant.role !== "observer" ? (
                            <Button
                              className="max-[720px]:min-h-[2.7rem] max-[720px]:px-4"
                              disabled={areRealtimeActionsDisabled}
                              onClick={() => users.onChangeParticipantRole(participant.id, "observer")}
                              variant="ghost"
                            >
                              MAKE OBSERVER
                            </Button>
                          ) : null}
                          <Button
                            className="max-[720px]:min-h-[2.7rem] max-[720px]:px-4"
                            disabled={areRealtimeActionsDisabled}
                            onClick={() => users.onChangeParticipantRole(participant.id, "moderator")}
                            variant="ghost"
                          >
                            MAKE HOST
                          </Button>
                        </>
                      ) : null}
                      {canKick ? (
                        <Button
                          className="max-[720px]:min-h-[2.7rem] max-[720px]:px-4"
                          disabled={areRealtimeActionsDisabled || users.pendingKickId === participant.id}
                          onClick={() => users.onKickParticipant(participant)}
                          variant="danger"
                        >
                          {users.pendingKickId === participant.id ? "REMOVING..." : "REMOVE"}
                        </Button>
                      ) : null}
                      {!canChangeRole && !canKick ? (
                        <span className="mono-muted whitespace-nowrap">{isViewer ? "YOU" : "LOCKED"}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppModal>
  );
};
