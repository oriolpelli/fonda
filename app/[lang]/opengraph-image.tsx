import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getDictionary } from "@/app/[lang]/dictionaries";
import { defaultLocale, isLocale, locales } from "@/lib/i18n/config";

/**
 * The OpenGraph / Twitter card, generated per locale at build time.
 *
 * Built with `next/og` rather than shipped as a static `public/og.png` so the
 * headline and tagline come from the same dictionary as the page — a hand-made
 * PNG would silently go stale the next time the hero copy changes, in three
 * languages at once.
 *
 * Typeface: real Geist, read from ./_fonts at build time. Satori (behind
 * ImageResponse) accepts ttf/otf/woff but NOT woff2, which is all
 * `next/font/google` produces — hence the committed .ttf files.
 *
 * STATIC weights, not the variable Geist[wght].ttf: satori resolves variable
 * fonts to their default instance, so a variable file would silently render
 * the 600 headline at 400. Regular + SemiBold are the two weights this card
 * actually uses.
 *
 * The .ttf files are build-time only — they live in a private `_fonts` folder
 * (not routed, not in public/), so they are never shipped to browsers. The
 * page itself still loads Geist via next/font/google. Both are OFL-1.1 from
 * vercel/geist-font; ./_fonts/OFL.txt is the accompanying licence and must
 * stay with them.
 */

const FONT_DIR = join(process.cwd(), "app", "[lang]", "_fonts");

export const alt = "Fondas — the AI front office for independent hotels";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : defaultLocale;
  const [dict, geistRegular, geistSemiBold] = await Promise.all([
    getDictionary(locale),
    readFile(join(FONT_DIR, "Geist-Regular.ttf")),
    readFile(join(FONT_DIR, "Geist-SemiBold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FFFFFF",
          padding: "72px 80px",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{ width: 22, height: 22, borderRadius: 4, background: "#1B3BB3" }}
          />
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "#0A0A0A",
            }}
          >
            FONDAS
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 74,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: "-0.035em",
              color: "#0A0A0A",
            }}
          >
            {dict.hero.headlineLine1}
          </div>
          <div
            style={{
              fontSize: 74,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: "-0.035em",
              color: "#0A0A0A",
            }}
          >
            {dict.hero.headlineLine2}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: "1px solid #E8E7E3",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 26, color: "#5B5B58", maxWidth: 780 }}>
            {dict.footer.valueProp}
          </div>
          {/* Matches the darkened --fonda-text-3; the old #9C9C97 was 2.76:1
              and near-invisible at feed thumbnail size. */}
          <div style={{ fontSize: 19, color: "#6F6F6A", letterSpacing: "0.12em" }}>
            FONDAS.APP
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: geistRegular, style: "normal", weight: 400 },
        { name: "Geist", data: geistSemiBold, style: "normal", weight: 600 },
      ],
    }
  );
}
