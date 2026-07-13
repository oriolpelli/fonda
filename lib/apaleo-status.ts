// Pure, server-safe helper for mapping the `?apaleo=` OAuth callback status to
// a tone + dictionary key. Lives outside the "use client" connection card so
// the server settings page can call it (a client module's exports can't be
// invoked from the server).

export type ApaleoStatusKey =
  | "connected"
  | "denied"
  | "invalid_state"
  | "misconfigured"
  | "no_hotel"
  | "error";

/** Maps the `?apaleo=` callback status to a tone + dictionary key. */
export function apaleoStatusMessage(
  status: string | undefined
): { tone: "success" | "error"; key: ApaleoStatusKey } | null {
  switch (status) {
    case "connected":
      return { tone: "success", key: "connected" };
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
