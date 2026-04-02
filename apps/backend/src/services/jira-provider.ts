import { buildJiraIssueUrl } from "@terminal-poker/shared-types";

export interface IssueLinkProvider {
  buildIssueUrl(baseUrl: string | null, ticketKey: string | null): string | null;
}

export class JiraRoomLinkProvider implements IssueLinkProvider {
  buildIssueUrl(baseUrl: string | null, ticketKey: string | null): string | null {
    return buildJiraIssueUrl(baseUrl, ticketKey);
  }
}

