"use client";

import { createContext, useContext } from "react";

import type { Dictionary } from "@/app/[lang]/dictionaries";
import { type Locale } from "@/lib/i18n/config";

type DictionaryContextValue = { locale: Locale; dict: Dictionary };

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

/**
 * Seeds the dictionary + current locale once at the top of the localized tree
 * (`app/[lang]/layout.tsx`). Client components read it via `useDictionary()`,
 * avoiding prop-drilling translations through every component.
 */
export function DictionaryProvider({
  locale,
  dict,
  children,
}: DictionaryContextValue & { children: React.ReactNode }) {
  return (
    <DictionaryContext.Provider value={{ locale, dict }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): DictionaryContextValue {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error("useDictionary must be used within a DictionaryProvider");
  }
  return ctx;
}
