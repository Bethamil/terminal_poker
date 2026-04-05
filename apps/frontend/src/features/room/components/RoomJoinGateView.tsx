import type { FormEvent } from "react";

import { Button } from "../../../components/Button";
import { Field } from "../../../components/Field";
import { StatusChip } from "../../../components/StatusChip";

interface RoomJoinGateViewProps {
  joinError: string | null;
  joinName: string;
  joinPasscode: string;
  onJoinNameChange: (value: string) => void;
  onJoinPasscodeChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  roomCode: string;
}

export const RoomJoinGateView = ({
  joinError,
  joinName,
  joinPasscode,
  onJoinNameChange,
  onJoinPasscodeChange,
  onSubmit,
  roomCode
}: RoomJoinGateViewProps) => (
  <form className="card join-gate__card" onSubmit={onSubmit}>
    <div className="section-header">
      <StatusChip>JOIN</StatusChip>
      <h1>ROOM {roomCode}</h1>
    </div>
    <Field
      label="USER NAME"
      value={joinName}
      onChange={(event) => onJoinNameChange(event.target.value)}
      placeholder="cyber_punk"
      required
    />
    <Field
      label="PASSCODE"
      value={joinPasscode}
      onChange={(event) => onJoinPasscodeChange(event.target.value)}
      placeholder="only if required"
      type="password"
    />
    <Button stretch type="submit">
      JOIN ROOM
    </Button>
    {joinError ? <div className="notice notice--error">{joinError}</div> : null}
  </form>
);
