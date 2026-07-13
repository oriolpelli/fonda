// Pure, server-safe helper for mapping the `?gmail=` OAuth callback status to a
// dictionary key. Lives outside the "use client" connection card so the server
// settings page can call it (a client module's exports can't be invoked from
// the server).

export type GmailStatusKey =
  | "denied"
  | "invalid_state"
  | "misconfigured"
  | "no_hotel"
  | "error";

/** Maps the `?gmail=` callback status to a dictionary key (success handled separately). */
export function gmailStatusMessage(
  status: string | undefined
): { tone: "error"; key: GmailStatusKey } | null {
  switch (status) {
    case "denied":
      return { tone: "error", key: "denied" };
    case "invalid_state":
      return { tone: "error", key: "invalid_state" };
    case "misconfigured":
      return { tone: "error", key: "misconfigured" };
    case "no_hotel":
      return { tone: "error", key: "no_hotel" };
    case "error":
      return { tone: "error", key: "error" };
    default:
      return null;
  }
}
