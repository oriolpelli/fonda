import { cn } from "@/lib/utils";

/**
 * "La Piscina" — the villa reflected in a still pool between two palms.
 *
 * Scene A of design/la-casa-hero.html, extracted as a single self-contained
 * inline SVG (no external file, no sprite sheet). Every def id carries a
 * `hero-` prefix so the filters/gradients/patterns can't collide with other
 * SVGs on the page.
 *
 * Purely decorative — the root svg is aria-hidden, so it contributes nothing
 * to the accessibility tree and the headline carries the meaning.
 *
 * Placement rules (from the brief at the bottom of the source file): centred
 * under the headline, under ~40% of the hero's height, never behind the type,
 * never more than one illustration per screen. Motion: fade-up on load only —
 * nothing inside the artwork animates.
 */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 600"
      className={cn("block h-auto w-full", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* --- Watercolour edge treatments ------------------------------- */}
        {/* Loose wash wobble — foliage, water blooms. */}
        <filter id="hero-wc" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.011 0.015"
            numOctaves="2"
            seed="11"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="7"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Tighter wobble — architecture, where the edges stay crisp. */}
        <filter id="hero-wcHard" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.022 0.03"
            numOctaves="2"
            seed="4"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="3.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Finest wobble — the ink linework. */}
        <filter id="hero-wcInk" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035 0.05"
            numOctaves="1"
            seed="19"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Pigment bleeding past the drawn edge. */}
        <filter id="hero-bleed" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="hero-bleedS" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>

        {/* Granulation — pigment settling unevenly into the paper. */}
        <filter id="hero-mottle" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves="3"
            seed="6"
            result="t"
          />
          <feColorMatrix
            in="t"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 -0.15"
            result="a"
          />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
        </filter>
        <filter id="hero-mottle2" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="3"
            seed="23"
            result="t"
          />
          <feColorMatrix
            in="t"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.1 0 0 0 -0.28"
            result="a"
          />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
        </filter>

        {/* Paper tooth, laid over the finished painting. */}
        <filter id="hero-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="2"
            result="t"
          />
          <feColorMatrix
            in="t"
            type="matrix"
            values="0 0 0 0 0.34  0 0 0 0 0.30  0 0 0 0 0.22  0 0 0 0.075 0"
          />
        </filter>

        {/* --- Patterns & gradients -------------------------------------- */}
        <pattern
          id="hero-balusters"
          width="11"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M4.6 0 v20"
            stroke="#8DA3B6"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </pattern>
        <pattern
          id="hero-deckTile"
          width="34"
          height="34"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(0)"
        >
          <path
            d="M17 2 L32 17 L17 32 L2 17 Z"
            fill="none"
            stroke="#D9AE92"
            strokeWidth="1.3"
          />
          <path d="M17 11 L23 17 L17 23 L11 17 Z" fill="#D9AE92" opacity="0.35" />
        </pattern>
        <linearGradient id="hero-poolG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BCD5E4" />
          <stop offset="0.5" stopColor="#96BAD3" />
          <stop offset="1" stopColor="#7BA2C1" />
        </linearGradient>

        {/* --- Clips ------------------------------------------------------ */}
        <clipPath id="hero-clipDeckA">
          <path d="M150 401 H770 L860 568 H58 Z" />
        </clipPath>
        <clipPath id="hero-clipWallA">
          <path d="M150 216 h100 v185 h-100 z M250 179 h410 v222 h-410 z M660 146 h116 v255 h-116 z" />
        </clipPath>

        {/* --- Palm fronds, light and dark ------------------------------- */}
        <g id="hero-frondL">
          <path
            d="M0 1 C 40 -26 88 -34 128 -20 C 126 -14 122 -11 116 -10 C 84 -6 44 4 4 7 Z"
            fill="#6E8A5C"
          />
          <path
            d="M0 0 C 44 -19 90 -26 130 -23"
            stroke="#4C6842"
            strokeWidth="1.4"
            fill="none"
            opacity="0.5"
          />
          <g stroke="#4C6842" strokeWidth="0.9" opacity="0.32" fill="none">
            <path d="M26 -10 l7 -10" />
            <path d="M48 -17 l6 -9" />
            <path d="M70 -21 l5 -8" />
            <path d="M94 -23 l4 -7" />
            <path d="M24 0 l4 8" />
            <path d="M48 -6 l4 8" />
            <path d="M72 -12 l4 7" />
            <path d="M96 -17 l3 7" />
          </g>
        </g>
        <g id="hero-frondD">
          <path
            d="M0 1 C 40 -26 88 -34 128 -20 C 126 -14 122 -11 116 -10 C 84 -6 44 4 4 7 Z"
            fill="#5A7749"
          />
          <path
            d="M0 0 C 44 -19 90 -26 130 -23"
            stroke="#425B39"
            strokeWidth="1.4"
            fill="none"
            opacity="0.5"
          />
          <g stroke="#425B39" strokeWidth="0.9" opacity="0.3" fill="none">
            <path d="M26 -10 l7 -10" />
            <path d="M48 -17 l6 -9" />
            <path d="M70 -21 l5 -8" />
            <path d="M94 -23 l4 -7" />
            <path d="M24 0 l4 8" />
            <path d="M48 -6 l4 8" />
            <path d="M72 -12 l4 7" />
            <path d="M96 -17 l3 7" />
          </g>
        </g>

        {/* --- Palm ------------------------------------------------------- */}
        <g id="hero-palm">
          <path
            d="M0 0 C -3 -72 -9 -152 -16 -262"
            stroke="#A68C6A"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M2 -4 C -1 -74 -7 -152 -14 -258"
            stroke="#7D6744"
            strokeWidth="2.6"
            fill="none"
            opacity="0.4"
          />
          <g stroke="#7D6744" strokeWidth="1.1" opacity="0.35" fill="none">
            <path d="M-4 -32 h8" />
            <path d="M-5 -64 h8" />
            <path d="M-7 -96 h8" />
            <path d="M-9 -128 h8" />
            <path d="M-11 -160 h8" />
            <path d="M-13 -192 h8" />
            <path d="M-14 -224 h8" />
          </g>
          <g transform="translate(-16,-262)" filter="url(#hero-wcHard)">
            <use href="#hero-frondD" transform="rotate(-166) scale(0.9)" />
            <use href="#hero-frondD" transform="rotate(-142) scale(0.8)" />
            <use href="#hero-frondD" transform="rotate(-118) scale(0.72)" />
            <use href="#hero-frondD" transform="rotate(178) scale(0.78)" />
            <use href="#hero-frondL" transform="rotate(-184) scale(0.98)" />
            <use href="#hero-frondL" transform="rotate(-156) scale(0.86)" />
            <use href="#hero-frondL" transform="rotate(-131) scale(0.78)" />
            <use href="#hero-frondL" transform="rotate(-106) scale(0.74)" />
            <use href="#hero-frondL" transform="rotate(-84) scale(0.8)" />
            <use href="#hero-frondL" transform="rotate(-62) scale(0.86)" />
            <use href="#hero-frondL" transform="rotate(-40) scale(0.92)" />
            <use href="#hero-frondL" transform="rotate(-18) scale(0.98)" />
            <use href="#hero-frondD" transform="rotate(4) scale(0.9)" />
            <use href="#hero-frondD" transform="rotate(26) scale(0.8)" />
            <ellipse cx="0" cy="2" rx="9" ry="6.5" fill="#7A6448" />
          </g>
        </g>

        {/* --- Potted olive & wall lantern -------------------------------- */}
        <g id="hero-olivepot">
          <path d="M-15 0 l3 -26 h24 l3 26 z" fill="#D8A277" />
          <path d="M-17 -26 h34 v-5 h-34 z" fill="#C48A5E" />
          <ellipse cx="0" cy="-52" rx="26" ry="22" fill="#7E9463" />
          <ellipse cx="-9" cy="-46" rx="13" ry="11" fill="#5C7348" opacity="0.5" />
          <path d="M0 -30 v-18" stroke="#75603F" strokeWidth="2.4" fill="none" />
        </g>
        <g
          id="hero-lantern"
          stroke="#4A4034"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        >
          <path d="M0 0 h9" />
          <path d="M9 0 v6" />
          <path d="M4 6 h10 l-1.6 15 h-6.8 z" fill="#EFDCB0" />
          <path d="M6.4 21 h5.2" />
        </g>

        {/* --- The villa -------------------------------------------------- */}
        <g id="hero-villa">
          <ellipse
            cx="460"
            cy="404"
            rx="330"
            ry="15"
            fill="#E2D7C2"
            filter="url(#hero-bleed)"
            opacity="0.85"
          />
          <g filter="url(#hero-bleed)" opacity="0.55">
            <path d="M146 212 h108 v192 h-108 z" fill="#EFE2C8" />
            <path d="M244 174 h422 v230 h-422 z" fill="#EFE2C8" />
            <path d="M654 141 h128 v263 h-128 z" fill="#EDE0C4" />
            <path d="M232 176 l32 -34 h378 l32 34 z" fill="#D08C66" />
            <path d="M638 148 l78 -54 l80 54 z" fill="#D08C66" />
          </g>
          <g filter="url(#hero-wcHard)">
            <path d="M150 216 h100 v185 h-100 z" fill="#F7F0E1" />
            <path d="M250 179 h410 v222 h-410 z" fill="#F8F1E4" />
            <path d="M660 146 h116 v255 h-116 z" fill="#F5ECDA" />
            <path d="M624 179 h36 v222 h-36 z" fill="#E2D0AF" opacity="0.5" />
            <path d="M746 146 h30 v255 h-30 z" fill="#E2D0AF" opacity="0.45" />
            <path d="M228 216 h22 v185 h-22 z" fill="#E2D0AF" opacity="0.3" />
          </g>
          <g clipPath="url(#hero-clipWallA)">
            <rect
              x="140"
              y="140"
              width="650"
              height="270"
              fill="#CBB593"
              filter="url(#hero-mottle)"
              opacity="0.45"
            />
          </g>
          <g
            fill="none"
            stroke="#4A4034"
            strokeWidth="1.5"
            opacity="0.42"
            filter="url(#hero-wcInk)"
          >
            <path d="M150 216 h100 M150 216 v185 M250 179 v-1 M250 179 h410 M660 146 h116 M660 146 v33 M776 146 v255 M150 401 h626" />
          </g>

          {/* roofs */}
          <g filter="url(#hero-wcHard)">
            <path d="M236 179 l30 -31 h374 l30 31 z" fill="#C6764E" />
            <path d="M236 179 h468 v-7 h-468 z" fill="#A85C3C" opacity="0.45" />
            <path d="M140 216 l26 -23 h68 l26 23 z" fill="#C6764E" />
            <path d="M140 216 h120 v-6 h-120 z" fill="#A85C3C" opacity="0.4" />
            <path d="M642 146 l74 -49 l76 49 z" fill="#C6764E" />
            <path d="M716 97 l76 49 h-76 z" fill="#A85C3C" opacity="0.32" />
          </g>
          <g
            stroke="#A85C3C"
            strokeWidth="1.3"
            opacity="0.45"
            fill="none"
            filter="url(#hero-wcInk)"
          >
            <path d="M266 148 h374" />
            <path d="M300 152 l-8 24 M360 152 l-6 24 M420 152 l-4 24 M480 152 l-2 24 M540 152 l1 24 M600 152 l4 24" />
            <path d="M166 193 h68" />
            <path d="M680 128 l-10 17 M716 108 l0 37 M752 128 l10 17" />
          </g>

          {/* cornices */}
          <g filter="url(#hero-wcHard)">
            <path d="M246 288 h418 v9 h-418 z" fill="#EFE4CE" />
            <path d="M656 280 h124 v9 h-124 z" fill="#EFE4CE" />
            <path d="M146 304 h108 v7 h-108 z" fill="#EFE4CE" />
          </g>

          {/* main arcade */}
          <g filter="url(#hero-wcHard)">
            <path
              d="M268 401 V351 A30 30 0 0 1 328 351 V401 Z"
              fill="#7C8794"
              opacity="0.62"
            />
            <path
              d="M346 401 V351 A30 30 0 0 1 406 351 V401 Z"
              fill="#7C8794"
              opacity="0.62"
            />
            <path d="M424 401 V351 A30 30 0 0 1 484 351 V401 Z" fill="#EFE4CE" />
            <path
              d="M502 401 V351 A30 30 0 0 1 562 351 V401 Z"
              fill="#7C8794"
              opacity="0.62"
            />
            <path
              d="M580 401 V351 A30 30 0 0 1 640 351 V401 Z"
              fill="#7C8794"
              opacity="0.62"
            />
            <path d="M436 401 V356 A18 18 0 0 1 472 356 V401 Z" fill="#7E5C40" />
            <path
              d="M682 401 V330 A37 37 0 0 1 756 330 V401 Z"
              fill="#7C8794"
              opacity="0.55"
            />
          </g>
          <g
            fill="none"
            stroke="#4A4034"
            strokeWidth="1.7"
            opacity="0.75"
            filter="url(#hero-wcInk)"
          >
            <path d="M268 401 V351 A30 30 0 0 1 328 351 V401" />
            <path d="M346 401 V351 A30 30 0 0 1 406 351 V401" />
            <path d="M424 401 V351 A30 30 0 0 1 484 351 V401" />
            <path d="M502 401 V351 A30 30 0 0 1 562 351 V401" />
            <path d="M580 401 V351 A30 30 0 0 1 640 351 V401" />
            <path d="M682 401 V330 A37 37 0 0 1 756 330 V401" />
            <path d="M436 401 V356 A18 18 0 0 1 472 356 V401" />
            <path d="M454 401 V338" />
          </g>
          <g
            fill="#EFE4CE"
            stroke="#4A4034"
            strokeWidth="1.2"
            opacity="0.8"
            filter="url(#hero-wcInk)"
          >
            <path d="M292 320 l3 -11 h6 l3 11 z" />
            <path d="M370 320 l3 -11 h6 l3 11 z" />
            <path d="M448 320 l3 -11 h6 l3 11 z" />
            <path d="M526 320 l3 -11 h6 l3 11 z" />
            <path d="M604 320 l3 -11 h6 l3 11 z" />
            <path d="M711 291 l4 -12 h6 l4 12 z" />
          </g>

          {/* upper windows */}
          <g filter="url(#hero-wcHard)">
            <path
              d="M281 262 V216 A17 17 0 0 1 315 216 V262 Z"
              fill="#7E8FA0"
              opacity="0.6"
            />
            <path
              d="M359 262 V216 A17 17 0 0 1 393 216 V262 Z"
              fill="#7E8FA0"
              opacity="0.6"
            />
            <path
              d="M437 262 V216 A17 17 0 0 1 471 216 V262 Z"
              fill="#7E8FA0"
              opacity="0.6"
            />
            <path
              d="M515 262 V216 A17 17 0 0 1 549 216 V262 Z"
              fill="#7E8FA0"
              opacity="0.6"
            />
            <path
              d="M593 262 V216 A17 17 0 0 1 627 216 V262 Z"
              fill="#7E8FA0"
              opacity="0.6"
            />
            <path
              d="M676 258 V212 A18 18 0 0 1 712 212 V258 Z"
              fill="#7C8794"
              opacity="0.5"
            />
            <path
              d="M724 258 V212 A18 18 0 0 1 760 212 V258 Z"
              fill="#7C8794"
              opacity="0.5"
            />
            <path
              d="M168 380 V322 A13 13 0 0 1 194 322 V380 Z"
              fill="#7E8FA0"
              opacity="0.6"
            />
            <path
              d="M206 380 V322 A13 13 0 0 1 232 322 V380 Z"
              fill="#7E8FA0"
              opacity="0.6"
            />
            <circle cx="200" cy="256" r="11" fill="#7E8FA0" opacity="0.55" />
          </g>
          <g
            fill="none"
            stroke="#4A4034"
            strokeWidth="1.6"
            opacity="0.8"
            filter="url(#hero-wcInk)"
          >
            <path d="M281 262 V216 A17 17 0 0 1 315 216 V262 Z M298 262 V199 M281 230 h34" />
            <path d="M359 262 V216 A17 17 0 0 1 393 216 V262 Z M376 262 V199 M359 230 h34" />
            <path d="M437 262 V216 A17 17 0 0 1 471 216 V262 Z M454 262 V199 M437 230 h34" />
            <path d="M515 262 V216 A17 17 0 0 1 549 216 V262 Z M532 262 V199 M515 230 h34" />
            <path d="M593 262 V216 A17 17 0 0 1 627 216 V262 Z M610 262 V199 M593 230 h34" />
            <path d="M676 258 V212 A18 18 0 0 1 712 212 V258 Z M724 258 V212 A18 18 0 0 1 760 212 V258 Z" />
            <path d="M168 380 V322 A13 13 0 0 1 194 322 V380 Z M181 380 V309 M168 344 h26" />
            <path d="M206 380 V322 A13 13 0 0 1 232 322 V380 Z M219 380 V309 M206 344 h26" />
            <circle cx="200" cy="256" r="11" />
          </g>
          <g fill="#8DA3B6" opacity="0.62" filter="url(#hero-wcHard)">
            <path d="M268 220 h10 v42 h-10 z" />
            <path d="M318 220 h10 v42 h-10 z" />
            <path d="M346 220 h10 v42 h-10 z" />
            <path d="M396 220 h10 v42 h-10 z" />
            <path d="M502 220 h10 v42 h-10 z" />
            <path d="M552 220 h10 v42 h-10 z" />
            <path d="M580 220 h10 v42 h-10 z" />
            <path d="M630 220 h10 v42 h-10 z" />
          </g>

          {/* balustrades */}
          <g filter="url(#hero-wcHard)">
            <path d="M250 262 h410 v5 h-410 z" fill="#EFE4CE" />
            <rect
              x="252"
              y="267"
              width="406"
              height="17"
              fill="url(#hero-balusters)"
              opacity="0.85"
            />
            <path d="M250 284 h410 v5 h-410 z" fill="#EFE4CE" />
            <path d="M660 258 h116 v5 h-116 z" fill="#EFE4CE" />
            <rect
              x="662"
              y="263"
              width="112"
              height="15"
              fill="url(#hero-balusters)"
              opacity="0.8"
            />
            <path d="M660 278 h116 v5 h-116 z" fill="#EFE4CE" />
          </g>
          <g
            fill="none"
            stroke="#4A4034"
            strokeWidth="1"
            opacity="0.45"
            filter="url(#hero-wcInk)"
          >
            <path d="M250 262 h410 M250 289 h410 M660 258 h116 M660 283 h116 M246 297 h418 M146 311 h108" />
          </g>

          {/* lanterns, steps, planting */}
          <use href="#hero-lantern" transform="translate(252,326)" />
          <use href="#hero-lantern" transform="translate(648,326) scale(-1,1)" />
          <use href="#hero-lantern" transform="translate(660,330)" />
          <use href="#hero-lantern" transform="translate(152,332)" />
          <g filter="url(#hero-wcHard)">
            <path d="M418 401 h74 l10 13 h-94 z" fill="#F1E6D1" />
            <path d="M408 414 h94 l11 12 h-116 z" fill="#EADCC2" />
          </g>
          <g filter="url(#hero-wc)">
            <ellipse cx="196" cy="392" rx="34" ry="14" fill="#6F8A5A" opacity="0.9" />
            <ellipse cx="238" cy="396" rx="22" ry="10" fill="#5C7348" opacity="0.75" />
            <ellipse cx="726" cy="394" rx="30" ry="13" fill="#6F8A5A" opacity="0.88" />
          </g>
          <use href="#hero-olivepot" transform="translate(392,401) scale(0.72)" />
          <use href="#hero-olivepot" transform="translate(520,401) scale(0.72)" />
          <g
            stroke="#B49A72"
            strokeWidth="1"
            opacity="0.35"
            fill="none"
            filter="url(#hero-wcInk)"
          >
            <path d="M290 200 v86 M370 200 v86 M540 200 v86 M620 200 v86 M700 170 v82 M170 232 v66" />
          </g>
        </g>
      </defs>

      {/* --- Scene A: the deck, the villa, the pool ---------------------- */}
      <path
        d="M150 401 H770 L860 568 H58 Z"
        fill="#F4EAD8"
        filter="url(#hero-wcHard)"
      />
      <g clipPath="url(#hero-clipDeckA)">
        <rect
          x="58"
          y="398"
          width="806"
          height="172"
          fill="url(#hero-deckTile)"
          opacity="0.3"
        />
        <rect
          x="58"
          y="398"
          width="806"
          height="172"
          fill="#D9AE92"
          filter="url(#hero-mottle2)"
          opacity="0.3"
        />
      </g>

      <use href="#hero-villa" />

      <path
        d="M232 430 H692 L744 552 H176 Z"
        fill="#9CBFD6"
        filter="url(#hero-bleedS)"
        opacity="0.5"
      />
      <g filter="url(#hero-wcHard)">
        <path
          d="M232 430 H692 L744 552 H176 Z"
          fill="url(#hero-poolG)"
          opacity="0.9"
        />
      </g>
      <g filter="url(#hero-wc)" opacity="0.32">
        <path
          d="M250 452 q120 14 250 2 q100 -8 160 6 l-14 30 q-160 -14 -300 2 q-90 10 -120 -6 z"
          fill="#4F7CA3"
        />
        <path
          d="M300 508 q140 16 300 -6 l-10 26 q-180 16 -300 4 z"
          fill="#4F7CA3"
          opacity="0.7"
        />
      </g>
      {/* the two palms, reflected */}
      <g opacity="0.5">
        <path
          d="M284 468 q-8 30 -14 60"
          stroke="#3F6A92"
          strokeWidth="16"
          fill="none"
          filter="url(#hero-bleedS)"
          opacity="0.35"
        />
        <path
          d="M596 470 q10 32 18 62"
          stroke="#3F6A92"
          strokeWidth="18"
          fill="none"
          filter="url(#hero-bleedS)"
          opacity="0.32"
        />
      </g>
      <g
        stroke="#F1F6FA"
        strokeWidth="4"
        fill="none"
        opacity="0.4"
        strokeLinecap="round"
        filter="url(#hero-bleedS)"
      >
        <path d="M268 444 q56 -6 104 1" />
        <path d="M478 448 q60 -7 110 2" />
        <path d="M304 486 q70 -7 128 2" />
        <path d="M506 498 q54 -6 100 2" />
        <path d="M258 528 q86 -8 158 3" />
        <path d="M486 534 q60 -6 108 3" />
      </g>
      <g
        fill="none"
        stroke="#5C86AC"
        strokeWidth="2.2"
        opacity="0.8"
        filter="url(#hero-wcInk)"
      >
        <path d="M232 430 H692 L744 552 H176 Z" />
      </g>
      <path
        d="M232 430 H692"
        stroke="#F6EFE0"
        strokeWidth="4"
        fill="none"
        opacity="0.8"
        filter="url(#hero-wcInk)"
      />

      <use href="#hero-palm" transform="translate(300,432)" />
      <use href="#hero-palm" transform="translate(618,434) scale(-1.06,1.06)" />

      <g
        stroke="#C9B08C"
        strokeWidth="1.6"
        fill="none"
        opacity="0.4"
        filter="url(#hero-wcInk)"
      >
        <path d="M150 401 H770 M96 500 H820" />
      </g>

      {/* Paper tooth over the finished painting. */}
      <rect
        x="0"
        y="0"
        width="900"
        height="600"
        filter="url(#hero-grain)"
        opacity="0.5"
      />
    </svg>
  );
}
