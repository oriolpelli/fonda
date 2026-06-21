"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BriefingRefreshButton() {
  const router = useRouter();
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
    <Button onClick={refresh} disabled={pending} variant="outline" size="sm">
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {pending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
