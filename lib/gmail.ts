import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/types/database";

/**
 * Gmail connection for the email assistant.
 *
 * Auth: OAuth2 authorization-code flow. A long-lived refresh token (obtained in
 * /connect/gmail/callback with access_type=offline) is exchanged for short-lived
 * access tokens on demand. Scopes: gmail.readonly + gmail.send.
 *
 * Uses the Gmail REST API directly via fetch (no SDK dependency).
 * Docs: https://developers.google.com/gmail/api
 */

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const DEFAULTS = { maxRetries: 4, baseDelayMs: 500, maxDelayMs: 8000, timeoutMs: 30000 };

export class GmailApiError extends Error {
  readonly status?: number;
  constructor(message: string, opts: { status?: number; cause?: unknown } = {}) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "GmailApiError";
    this.status = opts.status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (n: number) =>
  Math.random() * Math.min(DEFAULTS.maxDelayMs, DEFAULTS.baseDelayMs * 2 ** n);

function requireOAuthEnv(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GmailApiError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.");
  }
  return { clientId, clientSecret };
}

/** Builds the Google consent URL. `offline` + `consent` ensure a refresh token. */
export function gmailAuthorizeUrl(redirectUri: string, state: string): string {
  const { clientId } = requireOAuthEnv();
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeGmailCode(
  code: string,
  redirectUri: string
): Promise<{ refreshToken: string; accessToken: string }> {
  const { clientId, clientSecret } = requireOAuthEnv();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    throw new GmailApiError(`Gmail token exchange failed (${res.status}).`, {
      status: res.status,
    });
  }
  const json = (await res.json()) as {
    refresh_token?: string;
    access_token?: string;
  };
  if (!json.refresh_token || !json.access_token) {
    throw new GmailApiError(
      "Gmail did not return a refresh token — ensure access_type=offline and prompt=consent."
    );
  }
  return { refreshToken: json.refresh_token, accessToken: json.access_token };
}

// ---------------------------------------------------------------------------
// Parsed message shape
// ---------------------------------------------------------------------------

export interface GmailMessage {
  id: string;
  threadId: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  body: string;
  receivedAt: string; // ISO
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

function decodeBase64Url(data: string): string {
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

/** Depth-first search for the first body of `mimeType`. */
function findPart(part: GmailPart | undefined, mimeType: string): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

function parseMessage(raw: {
  id: string;
  threadId: string;
  internalDate?: string;
  payload?: GmailPart & { headers?: { name: string; value: string }[] };
}): GmailMessage {
  const headers = raw.payload?.headers ?? [];
  const header = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  const from = header("from");
  const match = from.match(/^(.*?)<([^>]+)>$/);
  const fromName = match ? match[1].trim().replace(/^"|"$/g, "") || null : null;
  const fromEmail = (match ? match[2] : from).trim();

  const body =
    findPart(raw.payload, "text/plain") ??
    findPart(raw.payload, "text/html")?.replace(/<[^>]+>/g, " ") ??
    "";

  return {
    id: raw.id,
    threadId: raw.threadId,
    fromEmail,
    fromName,
    subject: header("subject"),
    body: body.trim(),
    receivedAt: raw.internalDate
      ? new Date(Number(raw.internalDate)).toISOString()
      : new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface GmailClient {
  getProfileEmail(): Promise<string>;
  listRecentMessageIds(days: number): Promise<string[]>;
  getMessage(id: string): Promise<GmailMessage>;
  sendEmail(input: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
  }): Promise<void>;
}

export function createGmailClient(refreshToken: string): GmailClient {
  let accessToken: string | null = null;
  let expiresAt = 0;

  async function refresh(): Promise<string> {
    const { clientId, clientSecret } = requireOAuthEnv();
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      throw new GmailApiError(`Gmail token refresh failed (${res.status}).`, {
        status: res.status,
      });
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    accessToken = json.access_token;
    expiresAt = Date.now() + (json.expires_in - 60) * 1000;
    return accessToken;
  }

  async function getAccessToken(): Promise<string> {
    if (accessToken && Date.now() < expiresAt) return accessToken;
    return refresh();
  }

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    let attempt = 0;
    let forcedRefresh = false;
    while (true) {
      const token = await getAccessToken();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULTS.timeoutMs);
      let res: Response;
      try {
        res = await fetch(`${GMAIL_API_BASE}${path}`, {
          ...init,
          headers: {
            ...(init?.headers ?? {}),
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
      } catch (err) {
        if (attempt < DEFAULTS.maxRetries) {
          await sleep(backoff(attempt));
          attempt++;
          continue;
        }
        throw new GmailApiError(`Network error calling Gmail ${path}`, { cause: err });
      } finally {
        clearTimeout(timer);
      }

      // Refresh once on a 401 (expired/revoked access token).
      if (res.status === 401 && !forcedRefresh) {
        forcedRefresh = true;
        accessToken = null;
        continue;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < DEFAULTS.maxRetries) {
        await sleep(backoff(attempt));
        attempt++;
        continue;
      }
      if (!res.ok) {
        throw new GmailApiError(`Gmail ${path} failed (${res.status}).`, {
          status: res.status,
        });
      }
      return (await res.json()) as T;
    }
  }

  return {
    async getProfileEmail() {
      const profile = await api<{ emailAddress: string }>("/profile");
      return profile.emailAddress;
    },

    async listRecentMessageIds(days) {
      const ids: string[] = [];
      let pageToken: string | undefined;
      const query = encodeURIComponent(`in:inbox newer_than:${days}d`);
      // Cap pages so a huge inbox can't run away.
      for (let page = 0; page < 5; page++) {
        const qs = `?q=${query}&maxResults=100${
          pageToken ? `&pageToken=${pageToken}` : ""
        }`;
        const data = await api<{
          messages?: { id: string }[];
          nextPageToken?: string;
        }>(`/messages${qs}`);
        ids.push(...(data.messages ?? []).map((m) => m.id));
        if (!data.nextPageToken) break;
        pageToken = data.nextPageToken;
      }
      return ids;
    },

    async getMessage(id) {
      const raw = await api<Parameters<typeof parseMessage>[0]>(
        `/messages/${id}?format=full`
      );
      return parseMessage(raw);
    },

    async sendEmail({ to, subject, body, threadId, inReplyTo }) {
      const lines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=UTF-8",
        ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`] : []),
        "",
        body,
      ];
      const raw = Buffer.from(lines.join("\r\n"), "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      await api("/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(threadId ? { raw, threadId } : { raw }),
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Credential storage + ingestion
// ---------------------------------------------------------------------------

export async function storeGmailCredentials(
  hotelId: string,
  refreshToken: string,
  email: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("hotels")
    .update({
      gmail_refresh_token_encrypted: encryptSecret(refreshToken),
      gmail_email: email,
    })
    .eq("id", hotelId);
  if (error) throw new Error(`Failed to store Gmail credentials: ${error.message}`);
}

export async function getGmailClientForHotel(
  hotelId: string
): Promise<GmailClient | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hotels")
    .select("gmail_refresh_token_encrypted")
    .eq("id", hotelId)
    .single();
  if (error) throw new Error(`Failed to load Gmail credentials: ${error.message}`);
  if (!data?.gmail_refresh_token_encrypted) return null;
  return createGmailClient(decryptSecret(data.gmail_refresh_token_encrypted));
}

/**
 * Fetches the last `days` of inbox emails and inserts any new ones into the
 * emails table (status `pending`, unclassified). Existing rows are left
 * untouched so classification/drafts aren't clobbered on re-runs. Returns the
 * number of newly ingested emails. Classification is handled separately by the
 * email processor (Sprint 4, prompt 2).
 */
export async function ingestRecentEmails(
  hotelId: string,
  days = 7
): Promise<number> {
  const client = await getGmailClientForHotel(hotelId);
  if (!client) {
    throw new Error(`Hotel ${hotelId} has no Gmail connection.`);
  }

  const ids = await client.listRecentMessageIds(days);
  if (ids.length === 0) return 0;

  const admin = createAdminClient();

  // Skip messages we've already ingested so the poller doesn't re-fetch the
  // whole window from Gmail on every run.
  const { data: existing } = await admin
    .from("emails")
    .select("external_id")
    .eq("hotel_id", hotelId)
    .in("external_id", ids);
  const seen = new Set((existing ?? []).map((e) => e.external_id));
  const newIds = ids.filter((id) => !seen.has(id));
  if (newIds.length === 0) return 0;

  const messages = await Promise.all(newIds.map((id) => client.getMessage(id)));
  const rows: TablesInsert<"emails">[] = messages.map((m) => ({
    hotel_id: hotelId,
    external_id: m.id,
    from_email: m.fromEmail,
    subject: m.subject,
    body: m.body,
    status: "pending",
    created_at: m.receivedAt,
  }));

  // ignoreDuplicates guards against a race with a concurrent run.
  const { data, error } = await admin
    .from("emails")
    .upsert(rows, { onConflict: "hotel_id,external_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(`Failed to ingest emails: ${error.message}`);
  return data?.length ?? 0;
}
