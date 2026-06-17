import type { Metadata } from "next";

import { login } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  return <AuthForm mode="login" action={login} redirectTo={redirectTo} />;
}
