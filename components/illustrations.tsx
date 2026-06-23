// Hand-drawn-style SVG illustrations (pencil stroke + watercolor wash) of hotel
// objects, per FONDA_DESIGN_IDENTITY.md §6. Stroke #3D3528, low-opacity warm
// fills, ground shadow. Decorative — placed at section corners.

export function CoffeeCup({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M55 30 C53 24, 57 18, 55 12" stroke="#3D3528" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <path d="M70 26 C68 20, 72 14, 70 8" stroke="#3D3528" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <path d="M85 30 C83 24, 87 18, 85 12" stroke="#3D3528" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <path d="M44 38 C42 38, 40 96, 44 108 C47 116, 93 116, 96 108 C100 96, 98 38, 96 38 Z" fill="#F5EDE8" opacity="0.65" />
      <path d="M44 38 C42 38, 40 96, 44 108 C47 116, 93 116, 96 108 C100 96, 98 38, 96 38 Z" stroke="#3D3528" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M96 58 C110 58, 114 68, 114 76 C114 84, 110 94, 96 94" stroke="#3D3528" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <ellipse cx="70" cy="122" rx="38" ry="7" fill="#E8C99A" opacity="0.3" />
      <ellipse cx="70" cy="122" rx="38" ry="7" stroke="#3D3528" strokeWidth="1.4" />
      <ellipse cx="70" cy="142" rx="35" ry="6" fill="#3D3528" opacity="0.05" />
    </svg>
  );
}

export function HotelKey({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="44" cy="60" r="28" fill="#F5EDE8" fillOpacity="0.5" stroke="#3D3528" strokeWidth="1.8" />
      <circle cx="44" cy="60" r="16" stroke="#3D3528" strokeWidth="1.4" fill="none" />
      <rect x="70" y="55" width="108" height="10" rx="5" fill="#E8C99A" opacity="0.4" />
      <path d="M70 55 L178 55" stroke="#3D3528" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M70 65 L178 65" stroke="#3D3528" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M140 65 L140 80" stroke="#3D3528" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M154 65 L154 76" stroke="#3D3528" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M168 65 L168 73" stroke="#3D3528" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="105" cy="105" rx="75" ry="6" fill="#3D3528" opacity="0.05" />
    </svg>
  );
}

export function Envelope({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="12" y="28" width="156" height="100" rx="8" fill="#F5EDE8" fillOpacity="0.5" stroke="#3D3528" strokeWidth="1.8" />
      <path d="M12 36 L90 80 L168 36" stroke="#3D3528" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M12 128 L64 78" stroke="#3D3528" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <path d="M168 128 L116 78" stroke="#3D3528" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="90" cy="118" rx="70" ry="6" fill="#3D3528" opacity="0.05" />
    </svg>
  );
}
