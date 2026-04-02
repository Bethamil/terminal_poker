import { describe, expect, it } from "vitest";

import { buildJiraIssueUrl, normalizeJiraBaseUrl } from "./jira";

describe("jira helpers", () => {
  it("normalizes trailing slash and browse suffix", () => {
    expect(normalizeJiraBaseUrl("https://jira.example.com/")).toBe("https://jira.example.com");
    expect(normalizeJiraBaseUrl("https://jira.example.com/browse")).toBe("https://jira.example.com");
  });

  it("builds issue urls", () => {
    expect(buildJiraIssueUrl("https://jira.example.com", "PROJ-12")).toBe(
      "https://jira.example.com/browse/PROJ-12"
    );
  });
});

