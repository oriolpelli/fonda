import type { Metadata } from "next";

import { signup } from "@/app/[lang]/(auth)/actions";
import { loadDictionary } from "@/app/[lang]/dictionaries";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { dict } = await loadDictionary((await params).lang);
  return { title: dict.auth.createAccount };
}

export default function SignupPage() {
  return <AuthForm mode="signup" action={signup} />;
}
