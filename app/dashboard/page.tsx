import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  MessageSquareText,
  Sparkles,
  Mail,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SyncNowButton } from "@/components/dashboard/sync-now-button";
import { FEATURES } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";
import type { FeatureKey } from "@/types";

const ICONS: Record<FeatureKey, typeof Sparkles> = {
  briefing: Sparkles,
  "email-assistant": Mail,
  "checkin-chasing": CalendarClock,
  "hotel-chat": MessageSquareText,
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const greetingName = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Good morning, {greetingName}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s everything Fonda can do for your hotel today.
          </p>
        </div>
        <SyncNowButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => {
          const Icon = ICONS[feature.key];
          return (
            <Link
              key={feature.key}
              href={feature.href}
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="mt-3 flex items-center justify-between">
                    {feature.name}
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Coming soon
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
