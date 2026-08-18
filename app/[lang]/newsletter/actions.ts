"use server";

import { Resend } from "resend";

import { getDictionary } from "@/app/[lang]/dictionaries";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import {
  CONFIRM_TOKEN_TTL_MS,
  RESEND_COOLDOWN_MS,
  confirmEmailHtml,
  confirmUrl,
  generateConfirmToken,
  hashConfirmToken,
  hashUnsubscribeToken,
  normalizeEmail,
} from "@/lib/newsletter";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Note what is NOT here: a "you're already subscribed" state. Sign-up answers
 * `sent` whether the address is new, already pending, or already confirmed —
 * otherwise the public form becomes an oracle for "is this person on the
 * list?", which is a disclosure about them, not about us.
 */
export type SubscribeState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "invalid" }
  | { status: "error" };

export type ConfirmState =
  | { status: "idle" }
  | { status: "confirmed" }
  | { status: "already" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "error" };

function localeFrom(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

async function sendConfirmEmail(
  to: string,
  locale: Locale,
  token: string
): Promise<void> {
  const dict = await getDictionary(locale);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Fondas <onboarding@resend.dev>",
    to,
    subject: dict.newsletterEmail.subject,
    html: confirmEmailHtml(dict, confirmUrl(locale, token)),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function subscribeToNewsletter(
  _prevState: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const locale = localeFrom(formData);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { status: "invalid" };

  const admin = createAdminClient();

  try {
    const { data: existing, error: lookupError } = await admin
      .from("newsletter_subscribers")
      .select("id, status, confirm_sent_at")
      .eq("email", email)
      .maybeSingle();
    if (lookupError) throw lookupError;

    // Already confirmed: nothing to do, and re-sending would be unsolicited
    // mail to someone who is already on the list.
    if (existing?.status === "subscribed") return { status: "sent" };

    // Pending and mailed recently: swallow it. This is what stops the form
    // being used to flood a stranger's inbox.
    if (
      existing?.confirm_sent_at &&
      Date.now() - new Date(existing.confirm_sent_at).getTime() <
        RESEND_COOLDOWN_MS
    ) {
      return { status: "sent" };
    }

    // A fresh token every attempt, so an older emailed link stops working.
    // confirm_sent_at stays null until the send actually succeeds — a failed
    // send must not start the cooldown, or a retry would be silently ignored.
    const { token, hash } = generateConfirmToken();
    const row = {
      email,
      locale,
      status: "pending" as const,
      confirm_token_hash: hash,
      confirm_sent_at: null,
      confirmed_at: null,
      unsubscribed_at: null,
    };

    const { error: writeError } = existing
      ? await admin
          .from("newsletter_subscribers")
          .update(row)
          .eq("id", existing.id)
      : await admin.from("newsletter_subscribers").insert(row);
    if (writeError) throw writeError;

    await sendConfirmEmail(email, locale, token);

    await admin
      .from("newsletter_subscribers")
      .update({ confirm_sent_at: new Date().toISOString() })
      .eq("email", email);

    return { status: "sent" };
  } catch (error) {
    // Never log the address itself — it is PII and this is a public form.
    console.error(
      "[newsletter] subscribe failed:",
      error instanceof Error ? error.message : error
    );
    return { status: "error" };
  }
}

export async function confirmSubscription(
  _prevState: ConfirmState,
  formData: FormData
): Promise<ConfirmState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { status: "invalid" };

  const admin = createAdminClient();

  try {
    const { data: row, error: lookupError } = await admin
      .from("newsletter_subscribers")
      .select("id, status, confirm_sent_at")
      .eq("confirm_token_hash", hashConfirmToken(token))
      .maybeSingle();
    if (lookupError) throw lookupError;

    // No row means the token is wrong, already spent, or superseded by a newer
    // sign-up attempt for the same address. Confirming clears the hash, so a
    // second click on a link that already worked also lands here and reads as
    // "invalid" — slightly blunt, but it beats keeping a live credential in the
    // table forever just to render a friendlier message.
    if (!row) return { status: "invalid" };

    if (row.status === "subscribed") return { status: "already" };

    if (
      row.confirm_sent_at &&
      Date.now() - new Date(row.confirm_sent_at).getTime() >
        CONFIRM_TOKEN_TTL_MS
    ) {
      return { status: "expired" };
    }

    const { error: updateError } = await admin
      .from("newsletter_subscribers")
      .update({
        status: "subscribed",
        confirmed_at: new Date().toISOString(),
        // Spend the token: the link can't be replayed, and a stored hash stops
        // being a live credential the moment it is no longer needed.
        confirm_token_hash: null,
      })
      .eq("id", row.id);
    if (updateError) throw updateError;

    return { status: "confirmed" };
  } catch (error) {
    console.error(
      "[newsletter] confirm failed:",
      error instanceof Error ? error.message : error
    );
    return { status: "error" };
  }
}


export type UnsubscribeState =
  | { status: "idle" }
  | { status: "unsubscribed" }
  | { status: "already" }
  | { status: "invalid" }
  | { status: "error" };

/**
 * Reached from the button on the unsubscribe page (never on GET), so a mail
 * scanner prefetching the link can't unsubscribe anyone. Looks the row up by
 * the token hash and spends the token, mirroring confirmation.
 */
export async function unsubscribeFromNewsletter(
  _prevState: UnsubscribeState,
  formData: FormData
): Promise<UnsubscribeState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { status: "invalid" };

  const admin = createAdminClient();

  try {
    const { data: row, error: lookupError } = await admin
      .from("newsletter_subscribers")
      .select("id, status")
      .eq("unsubscribe_token_hash", hashUnsubscribeToken(token))
      .maybeSingle();
    if (lookupError) throw lookupError;

    // No row: wrong token, already spent, or superseded by a newer send.
    // Unsubscribing clears the hash, so a second click also lands here.
    if (!row) return { status: "invalid" };

    if (row.status === "unsubscribed") return { status: "already" };

    const { error: updateError } = await admin
      .from("newsletter_subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
        // Spend the token so the link can't be replayed.
        unsubscribe_token_hash: null,
      })
      .eq("id", row.id);
    if (updateError) throw updateError;

    return { status: "unsubscribed" };
  } catch (error) {
    console.error(
      "[newsletter] unsubscribe failed:",
      error instanceof Error ? error.message : error
    );
    return { status: "error" };
  }
}
