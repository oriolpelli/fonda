"use client";

import { useEffect } from "react";

import { AI_LITERACY_COOKIE } from "@/lib/ai-literacy";

/**
 * Leaves the "seen it" cookie for someone the database says has already
 * finished or skipped the cards (on another device, or before the cookie
 * existed), so the layout stops asking. Renders nothing.
 */
export function AiLiteracyRemember({ cookieValue }: { cookieValue: string }) {
  useEffect(() => {
    try {
      document.cookie = `${AI_LITERACY_COOKIE}=${cookieValue}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // Harmless: the next page asks the database again.
    }
  }, [cookieValue]);
  return null;
}
