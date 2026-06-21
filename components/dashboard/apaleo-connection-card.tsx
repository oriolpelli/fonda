import { disconnectApaleo } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ApaleoConnectionCard({ connected }: { connected: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Apaleo</CardTitle>
        <CardDescription>
          Connect your Apaleo account with OAuth. You&apos;ll be sent to Apaleo
          to grant Fonda read access; we store only an encrypted refresh token.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {connected
            ? "Fonda is connected to your Apaleo account."
            : "No Apaleo account connected yet."}
        </p>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild>
          {/* Full-page navigation (OAuth redirect), so a plain anchor. */}
          <a href="/connect/apaleo">
            {connected ? "Reconnect Apaleo" : "Connect Apaleo"}
          </a>
        </Button>
        {connected ? (
          <form action={disconnectApaleo}>
            <Button type="submit" variant="outline">
              Disconnect
            </Button>
          </form>
        ) : null}
      </CardFooter>
    </Card>
  );
}

/** Maps the `?apaleo=` callback status to a human-readable banner message. */
export function apaleoStatusMessage(
  status: string | undefined
): { tone: "success" | "error"; text: string } | null {
  switch (status) {
    case "connected":
      return { tone: "success", text: "Apaleo connected." };
    case "denied":
      return { tone: "error", text: "Apaleo authorization was declined." };
    case "invalid_state":
      return {
        tone: "error",
        text: "The connection link expired or was invalid. Please try again.",
      };
    case "misconfigured":
      return {
        tone: "error",
        text: "Apaleo isn't configured on the server (missing client ID).",
      };
    case "no_hotel":
      return { tone: "error", text: "No hotel associated with this user." };
    case "error":
      return { tone: "error", text: "Couldn't complete the Apaleo connection." };
    default:
      return null;
  }
}
