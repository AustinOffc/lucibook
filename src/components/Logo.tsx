/** Logo Lucibook: buku terbuka dengan percikan cahaya di atas punggung buku. */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} style={{ borderRadius: "22.7%" }} role="img" aria-label="Lucibook" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lucibook-logo-bg" x1="64" y1="40" x2="448" y2="472" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F5ABC4" />
          <stop offset="1" stopColor="#D4628A" />
        </linearGradient>
        <linearGradient id="lucibook-logo-spark" x1="256" y1="78" x2="256" y2="214" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF9DC" />
          <stop offset="1" stopColor="#FFD98A" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#lucibook-logo-bg)" />
      <path d="M92 356C158 348 222 360 256 392C290 360 354 348 420 356L420 374C354 366 292 378 256 408C220 378 158 366 92 374Z" fill="#FFFFFF" fillOpacity=".55" />
      <path d="M256 384C220 354 160 342 106 348L106 192C160 186 220 198 256 226Z" fill="#FFFFFF" />
      <path d="M256 384C292 354 352 342 406 348L406 192C352 186 292 198 256 226Z" fill="#FFF1F5" />
      <g stroke="#FAC8D9" strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M138 240C168 238 196 244 222 258" />
        <path d="M138 272C168 270 196 276 222 290" />
        <path d="M138 304C168 302 196 308 222 322" />
        <path d="M374 240C344 238 316 244 290 258" />
        <path d="M374 272C344 270 316 276 290 290" />
        <path d="M374 304C344 302 316 308 290 322" />
      </g>
      <path d="M256 78C261 118 278 136 318 146C278 156 261 174 256 214C251 174 234 156 194 146C234 136 251 118 256 78Z" fill="url(#lucibook-logo-spark)" />
      <circle cx="338" cy="104" r="7" fill="#FFFFFF" fillOpacity=".95" />
      <circle cx="178" cy="112" r="5" fill="#FFFFFF" fillOpacity=".85" />
      <circle cx="352" cy="172" r="4" fill="#FFFFFF" fillOpacity=".7" />
    </svg>
  );
}

/**
 * Logo + nama. Default: nama di bawah ikon (`stacked`).
 * Pakai `layout="inline"` bila butuh versi memanjang (ikon di kiri, nama di kanan).
 */
export default function Logo({
  size = "md",
  layout = "stacked",
}: {
  size?: "md" | "lg";
  layout?: "stacked" | "inline";
}) {
  const lg = size === "lg";
  const stacked = layout === "stacked";

  const mark = stacked ? (lg ? "h-16 w-16" : "h-10 w-10") : lg ? "h-12 w-12" : "h-9 w-9";
  const text = lg ? "text-2xl" : stacked ? "text-sm" : "text-lg";

  return (
    <span className={stacked ? "inline-flex flex-col items-center gap-1.5" : "inline-flex items-center gap-2.5"}>
      {/* borderRadius 22,7% di SVG = sudut ikon, supaya bayangan ikut membulat */}
      <LogoMark className={`shrink-0 shadow-sm ${mark}`} />
      <span className={`font-bold leading-none tracking-tight text-pinksoft-900 ${text}`}>Lucibook</span>
    </span>
  );
}
