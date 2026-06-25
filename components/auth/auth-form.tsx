"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { type AuthState } from "@/app/[lang]/(auth)/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { LocaleLink } from "@/components/i18n/locale-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthAction = (
  state: AuthState,
  formData: FormData
) => Promise<AuthState>;

interface AuthFormProps {
  mode: "login" | "signup";
  action: AuthAction;
  redirectTo?: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? dict.common.pleaseWait : label}
    </Button>
  );
}

export function AuthForm({ mode, action, redirectTo }: AuthFormProps) {
  const { dict, locale } = useDictionary();
  const [state, formAction] = useActionState<AuthState, FormData>(
    action,
    undefined
  );

  const isLogin = mode === "login";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">
          {isLogin ? dict.auth.loginTitle : dict.auth.signupTitle}
        </CardTitle>
        <CardDescription>
          {isLogin ? dict.auth.loginDesc : dict.auth.signupDesc}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          {redirectTo ? (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{dict.auth.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={dict.auth.emailPlaceholder}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{dict.auth.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="••••••••"
              required
            />
          </div>
          {state?.error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <SubmitButton label={isLogin ? dict.auth.signIn : dict.auth.createAccount} />
          <p className="text-sm text-muted-foreground">
            {isLogin ? (
              <>
                {dict.auth.noAccount}{" "}
                <LocaleLink
                  href="/signup"
                  className="font-medium text-[var(--fonda-accent)] hover:underline"
                >
                  {dict.auth.signUpLink}
                </LocaleLink>
              </>
            ) : (
              <>
                {dict.auth.haveAccount}{" "}
                <LocaleLink
                  href="/login"
                  className="font-medium text-[var(--fonda-accent)] hover:underline"
                >
                  {dict.auth.signInLink}
                </LocaleLink>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
