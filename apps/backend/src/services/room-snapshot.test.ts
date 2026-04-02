import { ParticipantRole, RoundStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { JiraRoomLinkProvider } from "./jira-provider";
import { buildRoomSnapshot, type RoomAggregate } from "./room-snapshot";

const baseRoom = (): RoomAggregate =>
  ({
    id: "room_1",
    code: "AB123",
    jiraBaseUrl: "https://jira.example.com",
    joinPasscodeHash: null,
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: new Date("2026-01-01T10:00:00.000Z"),
    participants: [
      {
        id: "p1",
        roomId: "room_1",
        name: "Alice",
        role: ParticipantRole.MODERATOR,
        sessionTokenHash: "x",
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "p2",
        roomId: "room_1",
        name: "Bob",
        role: ParticipantRole.PARTICIPANT,
        sessionTokenHash: "y",
        lastSeenAt: new Date(Date.now() - 60_000),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    rounds: [
      {
        id: "round_1",
        roomId: "room_1",
        status: RoundStatus.ACTIVE,
        jiraTicketKey: "PROJ-1",
        revealedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        votes: [
          {
            id: "vote_1",
            roundId: "round_1",
            participantId: "p1",
            value: "5",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      }
    ]
  }) as RoomAggregate;

describe("buildRoomSnapshot", () => {
  it("hides vote values before reveal but keeps the viewer vote", () => {
    const snapshot = buildRoomSnapshot(baseRoom(), "p1", new JiraRoomLinkProvider(), 30);

    expect(snapshot.viewer.selectedVote).toBe("5");
    expect(snapshot.participants[0].revealedVote).toBeNull();
    expect(snapshot.participants[0].hasVoted).toBe(true);
    expect(snapshot.participants[1].presence).toBe("away");
  });

  it("shows summary stats after reveal", () => {
    const room = baseRoom();
    room.rounds[0].status = RoundStatus.REVEALED;
    room.rounds[0].revealedAt = new Date("2026-01-01T10:10:00.000Z");
    room.rounds[0].votes.push({
      id: "vote_2",
      roundId: "round_1",
      participantId: "p2",
      value: "8",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const snapshot = buildRoomSnapshot(room, "p1", new JiraRoomLinkProvider(), 30);

    expect(snapshot.round.summary?.average).toBe(6.5);
    expect(snapshot.round.jiraTicketUrl).toBe("https://jira.example.com/browse/PROJ-1");
    expect(snapshot.participants[1].revealedVote).toBe("8");
  });
});
