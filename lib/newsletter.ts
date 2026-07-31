import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import { COMPANY } from "@/app/[lang]/(legal)/company";
import type { Locale } from "@/lib/i18n/config";
import { absoluteUrl } from "@/lib/seo";

/**
 * How long a confirmation link stays valid. Long enough to survive a weekend
 * and a corporate mail queue, short enough that an abandoned link in an old
 * inbox can't be used months later.
 */
export const CONFIRM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Minimum gap between confirmation emails to the same address. The form is
 * public and unauthenticated, so without this anyone could hold down the
 * button and use Fondas to mail-bomb a stranger.
 */
export const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * The raw token goes in the emailed link and nowhere else; only its SHA-256
 * is stored. A dump of `newsletter_subscribers` therefore can't be used to
 * confirm anyone, which matters because a confirmation is a consent record.
 *
 * SHA-256 without a salt or KDF is right here and would be wrong for a
 * password: the input is 256 bits of CSPRNG output, so there is no dictionary
 * to attack and nothing for a slow hash to buy.
 */
export function generateConfirmToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashConfirmToken(token) };
}

/**
 * Confirmation looks a row up BY this hash rather than fetching a row and
 * comparing, so there is no secret-vs-candidate comparison to time-attack.
 */
export function hashConfirmToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Deliberately permissive: one @, something either side, a dot in the domain,
 * no whitespace. Anything stricter starts rejecting addresses that are
 * perfectly valid, and the confirmation email is the real check — an address
 * that doesn't exist never confirms, so it never reaches the list.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

export function confirmUrl(locale: Locale, token: string): string {
  return `${absoluteUrl(locale, "/newsletter/confirm")}?token=${encodeURIComponent(token)}`;
}

/**
 * The confirmation email. Plain, in the subscriber's language, and it says
 * plainly that ignoring it means nothing happens — the polite form of double
 * opt-in, and the honest one for somebody whose address was typed in by
 * someone else.
 */
export function confirmEmailHtml(dict: Dictionary, url: string): string {
  const t = dict.newsletterEmail;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:21px;font-weight:600;letter-spacing:-0.02em;color:#0a0a0a;">${escapeHtml(COMPANY.brand)}</p>
          <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:#0a0a0a;">${escapeHtml(t.heading)}</p>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#5b5b58;">${escapeHtml(t.body)}</p>
          <a href="${escapeHtml(url)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:13px 24px;border-radius:10px;">${escapeHtml(t.button)}</a>
          <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#6f6f6a;">${escapeHtml(t.ignore)}</p>
          <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e8e7e3;font-size:12px;line-height:1.6;color:#6f6f6a;">${escapeHtml(t.footer)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
