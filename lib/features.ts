import type { Feature } from "@/types";

/** The four core Fonda product surfaces. */
export const FEATURES: Feature[] = [
  {
    key: "briefing",
    name: "Morning AI briefing",
    description:
      "A daily summary of arrivals, departures, VIPs, and anything that needs your attention — ready before your first coffee.",
    href: "/dashboard/briefing",
  },
  {
    key: "email-assistant",
    name: "AI email assistant",
    description:
      "Draft and triage guest emails in your hotel's voice, so the front desk spends less time in the inbox.",
    href: "/dashboard/emails",
  },
  {
    key: "checkin-chasing",
    name: "Check-in time chasing",
    description:
      "Automatically nudge guests for their expected arrival time and keep housekeeping one step ahead.",
    href: "/dashboard/check-in",
  },
  {
    key: "hotel-chat",
    name: "Hotel query chat",
    description:
      "Ask anything about your hotel in plain language — occupancy, revenue, who's arriving late — and get an instant answer.",
    href: "/dashboard/chat",
  },
];
