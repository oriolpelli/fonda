"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";

/**
 * `className` exists for one caller: the brief page mounts this inside the warm
 * gradient hero, where the outline variant's dark border and ink label would be
 * invisible. It passes the white-on-gradient overrides.
 */
export function BriefingRefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const { dict } = useDictionary();
  const [pending, setPending] = useState(false);

  async function refresh() {
    setPending(true);
    try {
      await fetch("/api/briefing", { method: "POST" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      onClick={refresh}
      disabled={pending}
      variant="outline"
      size="sm"
      className={className}
    >
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {pending ? dict.briefing.refreshing : dict.briefing.refresh}
    </Button>
  );
}
