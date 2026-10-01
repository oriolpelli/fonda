#!/usr/bin/env node
/**
 * Checks that every part of the app sends the browser the dictionary
 * namespaces its client components read — no fewer.
 *
 * Since 1 Oct the browser no longer gets the whole dictionary
 * (docs/audits/2026-10-01-performance.md §4.11, prompt P9). Each area sends a
 * list from lib/i18n/client-dictionary.ts: the public pages, onboarding and
 * the dashboard. A client component reading a namespace its area doesn't send
 * gets `undefined` in production, and that is a crash.
 *
 * TypeScript can't see which area renders a component, so this script does.
 * Starting from each area's routes, it follows imports. Once it reaches a
 * "use client" module, everything that module imports is browser code too,
 * and every `dict.<namespace>` read there is counted. It fails if an area
 * reads a namespace it doesn't send.
 *
 * Run: node scripts/check-client-dictionary.mjs (also part of the gate).
 * No dependencies; regex-based, deliberately conservative.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const LANG = path.join(ROOT, "app", "[lang]");

// ── the lists, read from the source of truth ─────────────────────────────────
const listsSource = fs.readFileSync(
  path.join(ROOT, "lib", "i18n", "client-dictionary.ts"),
  "utf8"
);
function readList(name) {
  const m = listsSource.match(
    new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`)
  );
  if (!m) throw new Error(`list ${name} not found in client-dictionary.ts`);
  return new Set([...m[1].matchAll(/"([A-Za-z]+)"/g)].map((x) => x[1]));
}
const PUBLIC = readList("PUBLIC_CLIENT_NAMESPACES");
const ONBOARDING = readList("ONBOARDING_CLIENT_NAMESPACES");
const DASHBOARD = readList("DASHBOARD_CLIENT_NAMESPACES");

// The areas: which route folders, and what reaches the browser there. The two
// nested areas also get the public list, from the root layout's provider.
const AREAS = [
  { name: "dashboard", dir: path.join(LANG, "dashboard"), own: DASHBOARD, sends: new Set([...PUBLIC, ...DASHBOARD]) },
  { name: "onboarding", dir: path.join(LANG, "onboarding"), own: ONBOARDING, sends: new Set([...PUBLIC, ...ONBOARDING]) },
  { name: "public", dir: LANG, own: PUBLIC, sends: PUBLIC, exclude: ["dashboard", "onboarding"] },
];

// ── module graph ─────────────────────────────────────────────────────────────
const EXT = [".tsx", ".ts", "/index.tsx", "/index.ts"];
function resolve(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null; // a package
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXT) if (fs.existsSync(base + ext)) return base + ext;
  return null;
}
const cache = new Map();
function info(file) {
  if (cache.has(file)) return cache.get(file);
  const src = fs.readFileSync(file, "utf8");
  const imports = [];
  // Type-only imports are erased and never reach the browser.
  for (const m of src.matchAll(/^\s*import\s+(?!type\b)[\s\S]*?from\s+["']([^"']+)["']/gm)) imports.push(m[1]);
  for (const m of src.matchAll(/^\s*export\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)) imports.push(m[1]);
  for (const m of src.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) imports.push(m[1]);
  const out = {
    client: /^\s*["']use client["']/.test(src),
    // Server Actions: imported by browser code, but only as references.
    server: /^\s*["']use server["']/.test(src),
    deps: imports.map((s) => resolve(file, s)).filter(Boolean),
    reads: new Set([...src.matchAll(/\bdict\.([A-Za-z]+)/g)].map((m) => m[1])),
  };
  cache.set(file, out);
  return out;
}

function routeFiles(dir, exclude = []) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (exclude.includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...routeFiles(p));
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
  }
  return out;
}

let failed = false;
for (const area of AREAS) {
  const needs = new Map(); // namespace → first file seen reading it
  const seen = new Set();
  const walk = (file, inClient) => {
    const key = `${file}|${inClient}`;
    if (seen.has(key)) return;
    seen.add(key);
    const i = info(file);
    if (inClient && i.server) return;
    const browser = inClient || i.client;
    if (browser) for (const ns of i.reads) if (!needs.has(ns)) needs.set(ns, file);
    for (const dep of i.deps) walk(dep, browser);
  };
  for (const f of routeFiles(area.dir, area.exclude)) walk(f, false);

  const missing = [...needs.keys()].filter((ns) => !area.sends.has(ns));
  const unused = [...area.own].filter((ns) => !needs.has(ns));
  if (missing.length) {
    failed = true;
    for (const ns of missing) {
      console.error(
        `✗ ${area.name}: dict.${ns} is read in the browser (${path.relative(ROOT, needs.get(ns))}) but not sent there — add "${ns}" to lib/i18n/client-dictionary.ts`
      );
    }
  }
  console.log(
    `${missing.length ? "✗" : "✓"} ${area.name}: reads ${needs.size} namespaces in the browser${unused.length ? `; sent but unread here: ${unused.join(", ")}` : ""}`
  );
}
process.exit(failed ? 1 : 0);
