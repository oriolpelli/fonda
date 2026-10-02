"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/**
 * Copies one exact string to the clipboard and says so for two seconds. The
 * text comes in as a prop — the same string the page shows — so what is
 * copied can never differ from what was read.
 */
export function CopyButton({
  text,
  label,
  copiedLabel,
  ariaLabel,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  ariaLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-medium text-[var(--fonda-text-2)] transition-colors duration-[180ms] hover:bg-[var(--fonda-inset)] hover:text-[var(--fonda-text)]"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-[14px]" strokeWidth={1.75} />
      ) : (
        <Copy aria-hidden="true" className="size-[14px]" strokeWidth={1.5} />
      )}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
