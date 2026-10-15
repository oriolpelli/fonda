#!/usr/bin/env node
// Fondas — renders a LinkedIn visual spec (JSON) into PNGs and, for carousels, a PDF.
//
//   node gtm/linkedin/skill/visual/render.mjs gtm/linkedin/visuales/L1-05/spec.json
//
// Output goes next to the spec: <id>-01.png … and <id>.pdf (carrusel) or <id>.png (imagen).
// Needs Playwright with Chromium. It is NOT a dependency of the app: if it isn't found,
// run once `npm i -g playwright && npx playwright install chromium` (or use a cloud session,
// which has it preinstalled).

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

async function loadPlaywright() {
  try { return await import("playwright"); } catch {}
  try {
    const root = execSync("npm root -g").toString().trim();
    return await import(pathToFileURL(path.join(root, "playwright", "index.mjs")).href);
  } catch {}
  console.error("No encuentro Playwright. Instálalo fuera del proyecto: npm i -g playwright && npx playwright install chromium");
  process.exit(1);
}

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// **negrita** y saltos de línea
const rich = (s = "") => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");

function foot(spec, i, n) {
  const page = spec.formato === "carrusel" ? `${i + 1}/${n}` : "fondas.app";
  return `<div class="foot"><span class="who">${esc(spec.autor || "Oriol Pellicer · Fondas")}</span><span>${page}</span></div>`;
}

const T = {
  portada: (s, spec) => `
    <div class="grad ${s.fondo || "cool"}">
      ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
      ${s.cifra ? `<div class="cover-num">${esc(s.cifra)}</div>` : ""}
      <div class="${s.cifra ? "h-l" : "h-xl"}" style="margin-top:${s.cifra ? 24 : 56}px">${rich(s.titulo)}</div>
      ${s.subtitulo ? `<div class="body" style="margin-top:40px">${rich(s.subtitulo)}</div>` : ""}
      ${spec.formato === "carrusel" && s.swipe !== false ? `<div class="swipe">${esc(s.swipe || "Desliza →")}</div>` : ""}
    </div>`,
  texto: (s) => `
    <div class="fill center-v stack">
      ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
      ${s.titulo ? `<div class="h-l">${rich(s.titulo)}</div>` : ""}
      ${s.cuerpo ? `<div class="body">${rich(s.cuerpo)}</div>` : ""}
      ${s.nota ? `<div class="well-2 small">${rich(s.nota)}</div>` : ""}
    </div>`,
  dato: (s) => `
    <div class="fill center-v stat">
      ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
      <div class="num ${s.color === "ink" ? "ink" : ""}" style="margin-top:40px">${esc(s.cifra)}</div>
      <div class="h-m" style="margin-top:48px">${rich(s.texto)}</div>
      ${s.cuerpo ? `<div class="body" style="margin-top:28px">${rich(s.cuerpo)}</div>` : ""}
      ${s.fuente ? `<div class="source end">Fuente: ${esc(s.fuente)}</div>` : ""}
    </div>`,
  lista: (s) => `
    <div class="fill center-v stack">
      ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
      ${s.titulo ? `<div class="h-l">${rich(s.titulo)}</div>` : ""}
      <div class="well" style="margin-top:56px"><ol class="list">${(s.items || []).map((it) =>
        typeof it === "string" ? `<li><div>${rich(it)}</div></li>`
          : `<li><div>${rich(it.t)}${it.sub ? `<span class="sub">${rich(it.sub)}</span>` : ""}</div></li>`).join("")}</ol></div>
    </div>`,
  cita: (s) => `
    <div class="fill center-v quote">
      ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
      <div class="well" style="margin-top:40px">
        <div class="q">${rich(s.texto)}</div>
        ${s.autor ? `<div class="small" style="margin-top:44px">— ${esc(s.autor)}</div>` : ""}
      </div>
      ${s.cuerpo ? `<div class="body" style="margin-top:44px">${rich(s.cuerpo)}</div>` : ""}
    </div>`,
  comparar: (s) => `
    <div class="fill center-v stack">
      ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
      ${s.titulo ? `<div class="h-l">${rich(s.titulo)}</div>` : ""}
      <div class="compare" style="margin-top:56px">
        <div class="col no"><h3>${esc(s.no?.titulo || "")}</h3><ul>${(s.no?.items || []).map((x) => `<li>${rich(x)}</li>`).join("")}</ul></div>
        <div class="col si"><h3>${esc(s.si?.titulo || "")}</h3><ul>${(s.si?.items || []).map((x) => `<li>${rich(x)}</li>`).join("")}</ul></div>
      </div>
    </div>`,
  cierre: (s) => `
    <div class="fill closing">
      <div class="well fill center-v stack">
        ${s.titulo ? `<div class="h-l">${rich(s.titulo)}</div>` : ""}
        ${s.cuerpo ? `<div class="body">${rich(s.cuerpo)}</div>` : ""}
        ${s.cta ? `<div class="cta">${esc(s.cta)}</div>` : ""}
      </div>
      ${s.marca === false ? "" : `<img class="wordmark" src="assets/wordmark.png" alt="Fondas" style="margin-top:56px">`}
    </div>`,
};

function html(spec) {
  const n = spec.slides.length;
  const slides = spec.slides.map((s, i) => {
    const fn = T[s.tipo];
    if (!fn) throw new Error(`Tipo de slide desconocido: "${s.tipo}" (usa: ${Object.keys(T).join(", ")})`);
    return `<section class="slide ${s.tipo === "portada" ? "cover" : ""}" data-i="${i + 1}">${fn(s, spec)}${s.tipo === "portada" && spec.formato === "carrusel" ? "" : foot(spec, i, n)}</section>`;
  }).join("\n");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="brand.css"></head><body>${slides}</body></html>`;
}

const specPath = process.argv[2];
if (!specPath) { console.error("Uso: node render.mjs <spec.json>"); process.exit(1); }
const spec = JSON.parse(await readFile(specPath, "utf8"));
spec.formato ||= spec.slides.length > 1 ? "carrusel" : "imagen";
const outDir = path.resolve(path.dirname(specPath), spec.salida || ".");
await mkdir(outDir, { recursive: true });

const tmp = path.join(HERE, `.render-${spec.id}.html`);
await writeFile(tmp, html(spec));

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(tmp).href);
await page.evaluate(() => document.fonts.ready);

// Control de calidad: texto que no cabe
const problems = await page.evaluate(() => [...document.querySelectorAll(".slide")].flatMap((sl) => {
  const out = [];
  const box = sl.getBoundingClientRect();
  sl.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height && (r.bottom > box.bottom - 40 || r.right > box.right - 40)) out.push(`slide ${sl.dataset.i}: «${(el.innerText || el.tagName).slice(0, 40)}» se sale del margen`);
  });
  return [...new Set(out)].slice(0, 3);
}));

const files = [];
const els = await page.$$(".slide");
for (let i = 0; i < els.length; i++) {
  const f = path.join(outDir, spec.formato === "carrusel" ? `${spec.id}-${String(i + 1).padStart(2, "0")}.png` : `${spec.id}.png`);
  await els[i].screenshot({ path: f });
  files.push(f);
}
if (spec.formato === "carrusel") {
  const f = path.join(outDir, `${spec.id}.pdf`);
  await page.pdf({ path: f, width: "1080px", height: "1350px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  files.push(f);
}
await browser.close();
await rm(tmp, { force: true });

console.log(files.map((f) => path.relative(process.cwd(), f)).join("\n"));
if (problems.length) { console.warn("\nREVISAR:\n" + problems.join("\n")); process.exitCode = 2; }
