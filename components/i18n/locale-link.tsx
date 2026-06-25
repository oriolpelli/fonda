"use client";

import Link from "next/link";
import * as React from "react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { localizedHref } from "@/lib/i18n/navigation";

type LocaleLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  /** Logical app path WITHOUT a locale prefix, e.g. "/dashboard/emails". */
  href: string;
};

/**
 * `next/link` that prefixes the current locale onto an internal path. Use in
 * client components; server components should call `localizedHref(lang, …)`
 * directly since `lang` is already in scope from route params.
 */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const { locale } = useDictionary();
  return <Link href={localizedHref(locale, href)} {...props} />;
}
