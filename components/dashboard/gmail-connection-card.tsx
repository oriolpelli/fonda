import { disconnectGmail } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GmailConnectionCard({ email }: { email: string | null }) {
  const connected = Boolean(email);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gmail inbox</CardTitle>
        <CardDescription>
          Connect the hotel inbox so Fonda can classify guest emails and draft
          replies for your review. We request read and send access and store
          only an encrypted refresh token.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {connected ? `Connected as ${email}.` : "No inbox connected yet."}
        </p>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild>
          {/* Full-page navigation (OAuth redirect), so a plain anchor. */}
          <a href="/connect/gmail">
            {connected ? "Reconnect Gmail" : "Connect Gmail"}
          </a>
        </Button>
        {connected ? (
          <form action={disconnectGmail}>
            <Button type="submit" variant="outline">
              Disconnect
            </Button>
          </form>
        ) : null}
      </CardFooter>
    </Card>
  );
}

/** Maps the `?gmail=` callback status to an error banner (success handled separately). */
export function gmailStatusMessage(
  status: string | undefined
): { tone: "error"; text: string } | null {
  switch (status) {
    case "denied":
      return { tone: "error", text: "Gmail access was declined." };
    case "invalid_state":
      return {
        tone: "error",
        text: "The connection link expired or was invalid. Please try again.",
      };
    case "misconfigured":
      return {
        tone: "error",
        text: "Gmail isn't configured on the server (missing Google client ID).",
      };
    case "no_hotel":
      return { tone: "error", text: "No hotel associated with this user." };
    case "error":
      return { tone: "error", text: "Couldn't complete the Gmail connection." };
    default:
      return null;
  }
}
