interface Props {
  className?: string;
  size?: number;
}

/**
 * Escudo oficial Club Atlético Peñarol
 * Recreado con SVG: franjas negras y amarillas + pelota central
 */
export default function PenarolBadge({ className = "", size = 64 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block" }}
    >
      {/* ── Sombra exterior ── */}
      <defs>
        <clipPath id="circleClip">
          <circle cx="60" cy="60" r="56" />
        </clipPath>
        <radialGradient id="shineGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Borde exterior negro ── */}
      <circle cx="60" cy="60" r="58" fill="#0D0D0D" />

      {/* ── Franjas verticales: negro y amarillo (6 franjas = 3 pares) ── */}
      <g clipPath="url(#circleClip)">
        {/* Fondo negro */}
        <rect x="4" y="4" width="112" height="112" fill="#111111" />
        {/* Franjas amarillas */}
        <rect x="4"  y="4" width="19" height="112" fill="#F5C518" />
        <rect x="42" y="4" width="18" height="112" fill="#F5C518" />
        <rect x="79" y="4" width="18" height="112" fill="#F5C518" />
        {/* Franja negra media (sobre las amarillas da la separación clásica) */}
        {/* Borde oscuro interno */}
        <circle cx="60" cy="60" r="56" fill="none" stroke="#00000030" strokeWidth="3" />
      </g>

      {/* ── Círculo central blanco con pelota ── */}
      <circle cx="60" cy="60" r="22" fill="white" />
      <circle cx="60" cy="60" r="20" fill="#F5F5F5" />

      {/* ── Pelota de fútbol (simplified) ── */}
      <circle cx="60" cy="60" r="15" fill="white" stroke="#1A1A1A" strokeWidth="1.2" />
      {/* Paneles negros pelota */}
      <path d="M 60 45 L 67 52 L 64 62 L 56 62 L 53 52 Z" fill="#1A1A1A" />
      <path d="M 68 53 L 74 58 L 72 66 L 64 62 L 67 52 Z" fill="#1A1A1A" />
      <path d="M 52 52 L 56 62 L 48 66 L 46 58 Z" fill="#1A1A1A" />

      {/* ── Brillo ── */}
      <circle cx="60" cy="60" r="56" fill="url(#shineGrad)" />

      {/* ── Borde final ── */}
      <circle cx="60" cy="60" r="57" fill="none" stroke="#F5C518" strokeWidth="1.5" />
    </svg>
  );
}
