const ISSUE_SEGMENT = "/browse/";

export const normalizeJiraBaseUrl = (input: string | null | undefined): string | null => {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  return normalized.replace(/\/browse$/, "");
};

export const buildJiraIssueUrl = (
  jiraBaseUrl: string | null | undefined,
  jiraTicketKey: string | null | undefined
): string | null => {
  const baseUrl = normalizeJiraBaseUrl(jiraBaseUrl);
  const key = jiraTicketKey?.trim();

  if (!baseUrl || !key) {
    return null;
  }

  return `${baseUrl}${ISSUE_SEGMENT}${encodeURIComponent(key)}`;
};

