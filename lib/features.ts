import type { Feature } from "@/types";

/** The four core Fondas product surfaces — inbox first (MARKET_STRATEGY §2.1). */
export const FEATURES: Feature[] = [
  {
    key: "email-assistant",
    name: "Email assistant",
    description:
      "Every guest email arrives with a reply drafted in your hotel's voice — you review, adjust, and send.",
    href: "/dashboard/communications",
  },
  {
    key: "briefing",
    name: "Morning brief",
    description:
      "A daily summary of arrivals, departures, VIPs, and anything that needs your attention — ready before your first coffee.",
    href: "/dashboard/brief",
  },
  {
    key: "checkin-chasing",
    name: "Check-in time chasing",
    description:
      "Automatically nudge guests for their expected arrival time and keep housekeeping one step ahead.",
    href: "/dashboard/checkins",
  },
  {
    key: "hotel-chat",
    name: "Hotel query chat",
    description:
      "Ask anything about your hotel in plain language — occupancy, revenue, who's arriving late — and get an instant answer.",
    href: "/dashboard/chat",
  },
];
