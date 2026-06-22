// Alias for the PMS sync endpoint under the roadmap's `/api/sync/pms` path.
// The implementation lives in `/api/sync`; this re-exports its handlers so both
// paths behave identically (GET = cron, POST = user-triggered).
export { GET, POST } from "@/app/api/sync/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
