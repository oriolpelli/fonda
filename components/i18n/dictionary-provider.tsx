"use client";

import { createContext, useContext, useMemo } from "react";

import {
  CLIENT_NAMESPACES,
  type ClientDictionary,
} from "@/lib/i18n/client-dictionary";
import { type Locale } from "@/lib/i18n/config";

type DictionaryContextValue = { locale: Locale; dict: ClientDictionary };

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

/**
 * Seeds the current locale and the dictionary namespaces this part of the app
 * reads in the browser (lib/i18n/client-dictionary.ts). Client components read
 * them via `useDictionary()`, so translations aren't prop-drilled through every
 * component.
 *
 * Providers nest. The `[lang]` layout sends the public namespaces, and the
 * onboarding and dashboard layouts each add their own on top. A nested
 * provider merges with the one above it, so a dashboard component sees both.
 */
export function DictionaryProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Partial<ClientDictionary>;
  children: React.ReactNode;
}) {
  const parent = useContext(DictionaryContext);
  const value = useMemo<DictionaryContextValue>(() => {
    const merged = { ...parent?.dict, ...dict } as ClientDictionary;
    return {
      locale,
      dict:
        process.env.NODE_ENV === "production" ? merged : guarded(merged),
    };
  }, [locale, parent, dict]);
  return (
    <DictionaryContext.Provider value={value}>
      {children}
    </DictionaryContext.Provider>
  );
}

/**
 * Development only: reading a namespace this part of the app doesn't send
 * throws a plain error naming it. Production would get `undefined` and crash
 * one line later. `npm run check:client-dict` catches the same mistake before
 * a build, this catches it the moment it happens.
 */
function guarded(dict: ClientDictionary): ClientDictionary {
  return new Proxy(dict, {
    get(target, key, receiver) {
      if (
        typeof key === "string" &&
        CLIENT_NAMESPACES.has(key) &&
        !(key in target)
      ) {
        throw new Error(
          `dict.${key} isn't sent to this part of the app. Add "${key}" to the right list in lib/i18n/client-dictionary.ts.`
        );
      }
      return Reflect.get(target, key, receiver);
    },
  });
}

export function useDictionary(): DictionaryContextValue {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error("useDictionary must be used within a DictionaryProvider");
  }
  return ctx;
}
