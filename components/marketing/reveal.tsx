"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const REVEAL_STAGGER_MS = 60;

interface RevealProps {
  children: ReactNode;
  /** Stagger position among siblings revealing together (0 = no delay). */
  index?: number;
  className?: string;
}

export function Reveal({ children, index = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No JS prefers-reduced-motion check needed here: the .reveal-init
    // override in globals.css forces full visibility via CSS regardless
    // of `visible`, so reduced-motion users never see the hidden state.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        // reveal-init is a marker class only — the prefers-reduced-motion
        // override in globals.css targets it to force full visibility.
        "reveal-init transition-all duration-500 ease-out",
        // Never use translate-y-0 at rest: it still sets a non-`none`
        // transform, which breaks position:sticky on descendants (the
        // features-section BriefingPreviewWindow is lg:sticky).
        visible ? "opacity-100" : "opacity-0 translate-y-4",
        className
      )}
      style={
        index > 0
          ? { transitionDelay: `${index * REVEAL_STAGGER_MS}ms` }
          : undefined
      }
    >
      {children}
    </div>
  );
}
