"use client";

import { useState } from "react";
import { ArrowUp, Plus } from "lucide-react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The composer (§8.3): a soft white field that floats on the ground rather than
 * sitting in a heavy box — `+` on the left, a round ink send button on the
 * right. The round send is the one fully-round control the system allows: it is
 * an icon button, not a pill text button.
 *
 * The `+` opens the suggested questions. Sana's `+` attaches context; Fonda has
 * no attachments yet, so rather than ship dead chrome it does the nearest real
 * thing — hands you the questions that are known to be answerable from the
 * hotel's data.
 */
export function ChatComposer({
  onSend,
  streaming,
  /** True while the transcript is empty — suggestions show by default there. */
  blank,
  autoFocus = false,
  className,
}: {
  onSend: (text: string) => void;
  streaming: boolean;
  blank: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const { dict } = useDictionary();
  const [input, setInput] = useState("");
  // null = follow the transcript (open while blank); a boolean is the user's
  // own choice, which then wins in both directions.
  const [override, setOverride] = useState<boolean | null>(null);
  const suggestionsOpen = override ?? blank;

  const suggestions = [
    dict.askYourHotel.suggestion1,
    dict.askYourHotel.suggestion2,
    dict.askYourHotel.suggestion3,
    dict.askYourHotel.suggestion4,
    dict.askYourHotel.suggestion5,
  ];

  function submit(text: string) {
    if (!text.trim() || streaming) return;
    onSend(text);
    setInput("");
    setOverride(false);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {suggestionsOpen ? (
        <div className="flex flex-col gap-2.5">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
            {dict.askYourHotel.tryAsking}
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full bg-card px-3 py-1.5 text-[13px] text-[var(--fonda-text-2)] ring-1 ring-[var(--fonda-border)] transition-colors hover:text-[var(--fonda-text)] hover:ring-[var(--fonda-border-2)]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Focus lives on the whole field, not the bare textarea — the Signal
          focus state (accent border + 3px tint ring, §9) belongs to the shape
          the eye reads as the input. */}
      <div className="flex items-end gap-2 rounded-[14px] border border-[var(--fonda-border-2)] bg-card p-2 transition-colors duration-[180ms] focus-within:border-[var(--fonda-accent)] focus-within:ring-[3px] focus-within:ring-[var(--fonda-accent-tint)]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={dict.askYourHotel.suggestionsLabel}
          aria-expanded={suggestionsOpen}
          onClick={() => setOverride(!suggestionsOpen)}
          className="size-9 shrink-0 rounded-[10px] text-[var(--fonda-text-3)]"
        >
          <Plus strokeWidth={1.5} />
        </Button>
        <textarea
          value={input}
          autoFocus={autoFocus}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={1}
          placeholder={dict.askYourHotel.placeholder}
          aria-label={dict.askYourHotel.title}
          className="max-h-32 min-h-9 flex-1 resize-none self-center border-0 bg-transparent px-1 py-2 text-[15px] leading-tight text-[var(--fonda-text)] placeholder:text-[var(--fonda-text-3)] focus-visible:outline-none"
        />
        <Button
          type="button"
          variant="ink"
          size="icon"
          aria-label={dict.askYourHotel.send}
          onClick={() => submit(input)}
          disabled={streaming || !input.trim()}
          className="size-9 shrink-0 rounded-full"
        >
          <ArrowUp strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}
