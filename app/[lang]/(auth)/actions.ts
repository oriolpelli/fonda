"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { LOCALE_COOKIE } from "@/lib/i18n/get-locale";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | undefined;

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

/** The active UI locale, passed as a hidden form field (actions get no params). */
function readLocale(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

function safeRedirectTarget(formData: FormData, locale: Locale) {
  const target = String(formData.get("redirectTo") ?? "");
  // Only allow internal, absolute-path redirects to avoid open redirects.
  return target.startsWith("/") && !target.startsWith("//")
    ? target
    : localizedHref(locale, "/dashboard");
}

/**
 * The account's stored language, or null when there isn't one yet (a signup
 * that hasn't reached onboarding has no hotel, and so no settings row).
 *
 * Best-effort: a failure here must never block a successful sign-in, so every
 * problem degrades to "no preference" and the form's locale is used instead.
 */
async function accountLocale(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<Locale | null> {
  // Two steps rather than an embed: `users` has no foreign key to
  // `hotel_settings` (both point at `hotels`), so PostgREST can't join them.
  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const { data: settings } = await supabase
    .from("hotel_settings")
    .select("default_locale")
    .eq("hotel_id", profile.hotel_id)
    .maybeSingle();

  return isLocale(settings?.default_locale) ? settings.default_locale : null;
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Sign-in is the one moment we know both who this is and that no `/[lang]`
  // has been chosen for where they're going — so it's where the account
  // language gets to decide. An explicit `redirectTo` (a deep link they were
  // bounced from) still wins: they were going somewhere specific.
  const formLocale = readLocale(formData);
  const stored = data.user ? await accountLocale(supabase, data.user.id) : null;
  const locale = stored ?? formLocale;

  if (stored) {
    // Persist it so later requests without a locale prefix land here too —
    // the cookie is the first thing `getLocale` consults.
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, stored, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectTarget(formData, locale));
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(localizedHref(readLocale(formData), "/dashboard"));
}

export async function logout(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(localizedHref(readLocale(formData), "/login"));
}
