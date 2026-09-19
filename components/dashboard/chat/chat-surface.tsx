"use client";

import { ChatComposer } from "@/components/dashboard/chat/chat-composer";
import { ChatThread } from "@/components/dashboard/chat/chat-thread";
import { ChatThreadList } from "@/components/dashboard/chat/chat-thread-list";
import {
  useHotelChat,
  type ChatMessage,
} from "@/components/dashboard/chat/use-hotel-chat";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import type { ChatThreadSummary } from "@/lib/chat-threads";

/**
 * The full chat page (§8.5, option 1) — chat as a first-class surface rather
 * than a widget in a corner.
 *
 * Blank state is a centered composer with a lot of air around it: the page's
 * whole job before you type is to invite the question. Once a conversation
 * exists the transcript takes the column and the composer docks to the bottom.
 */
export function ChatSurface({
  userEmail,
  threads,
  threadId,
  initialMessages,
}: {
  userEmail: string;
  threads: ChatThreadSummary[];
  /** The conversation named by `?thread=`, if it resolved to one of ours. */
  threadId: string | null;
  /** Its transcript, already pseudonymised — see lib/chat-threads.ts. */
  initialMessages: ChatMessage[];
}) {
  const { dict } = useDictionary();
  const { messages, streaming, send } = useHotelChat({
    threadId,
    messages: initialMessages,
  });
  const blank = messages.length === 0;
  // True for a conversation loaded from the database rather than had just now.
  // What it changes is one line of copy — see the notice below.
  const restored = initialMessages.length > 0;

  const body = blank ? (
      // `flex-1` so the block centres in the whole content column rather than
      // hugging the top of it — the air around the composer is the point.
      <div className="flex min-h-[62vh] flex-1 flex-col items-center justify-center gap-8 py-10">
        <div className="flex max-w-[46ch] flex-col items-center gap-3 text-center">
          <h1 className="text-[clamp(30px,4vw,44px)] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--fonda-text)]">
            {dict.askYourHotel.title}
          </h1>
          <p className="text-[15px] leading-relaxed text-[var(--fonda-text-2)]">
            {dict.askYourHotel.empty}
          </p>
        </div>
        <div className="flex w-full max-w-[640px] flex-col gap-7">
          {/* `blank={false}` on purpose: the starter list below is this page's
              one set of suggestions, so the composer's own chip row stays
              closed here rather than saying the same thing twice. The `+`
              still opens it. The docked widget keeps the chips. */}
          <ChatComposer onSend={send} streaming={streaming} blank={false} />
          <StarterQuestions onPick={send} />
        </div>
      </div>
  ) : (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* The heading did its work in the blank state; once the conversation is
          on screen the transcript is the page, so the title goes SR-only
          rather than sitting above every answer. */}
      <h1 className="sr-only">{dict.askYourHotel.title}</h1>
      {/* Says once, quietly, why yesterday's conversation reads differently
          from today's: what is stored has guest surnames reduced to an initial
          (§11 decision 6), and there is no un-reduced copy to restore from. A
          GM noticing that on their own would reasonably think it a bug. */}
      {restored ? (
        <p className="pb-4 font-mono text-[11px] tracking-[0.04em] text-[var(--fonda-text-3)]">
          {dict.askYourHotel.restoredNotice}
        </p>
      ) : null}
      <ChatThread
        messages={messages}
        streaming={streaming}
        userEmail={userEmail}
        className="pb-6"
      />
      {/* Docked: `mt-auto` holds it at the foot of the column on a short
          conversation, sticky keeps it in reach on a long one, and the band of
          page ground lets the transcript scroll cleanly underneath. */}
      <div className="sticky bottom-0 z-10 -mx-1 mt-auto bg-[var(--fonda-bg)] px-1 pb-4 pt-3">
        <ChatComposer onSend={send} streaming={streaming} blank={false} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
      <ChatThreadList threads={threads} />
      {body}
    </div>
  );
}

/**
 * The Lightfield pattern (§4.3): a quiet mono eyebrow over plain tappable
 * lines. No cards, no icons, no borders — the cheapest way to teach a GM what
 * this thing can answer. Radius appears on the focus ring only, via a border
 * that is transparent until focus so nothing shifts.
 *
 * Picking one sends it through the page's own `send`, so there is exactly one
 * path to the API (`use-hotel-chat.ts`). The list is rendered only while the
 * transcript is empty, so it disappears with the first message.
 */
function StarterQuestions({ onPick }: { onPick: (text: string) => void }) {
  const { dict } = useDictionary();

  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fonda-text-3)]">
        {dict.askYourHotel.startersLabel}
      </span>
      <ul className="flex flex-col items-start gap-0.5">
        {dict.askYourHotel.starters.map((question) => (
          <li key={question} className="w-full">
            <button
              type="button"
              onClick={() => onPick(question)}
              // `text-left` + no truncation: a long question wraps to a second
              // line on a narrow viewport rather than being cut off.
              className="-mx-2 w-[calc(100%+1rem)] rounded-[10px] border border-transparent px-2 py-1.5 text-left text-[15px] leading-relaxed text-[var(--fonda-text-2)] transition-colors duration-[180ms] hover:text-[var(--fonda-text)] focus-visible:border-[var(--fonda-accent)] focus-visible:text-[var(--fonda-text)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)]"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
