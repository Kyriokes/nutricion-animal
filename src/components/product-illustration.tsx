import type { ReactNode } from "react";
import type { IllustrationKind } from "@/modules/catalogo/ilustracion";

// RN-031: dibujos simples para los productos sin foto. Son imágenes, no
// interfaz: llevan sus propios colores (no la paleta) y fondo claro siempre.
const INK = "#3f2c1d";
const line = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const thin = { ...line, strokeWidth: 2.5 } as const;

// Dibuja las formas dos veces: primero con trazo grueso y después solo el
// relleno, así queda un único contorno alrededor del conjunto.
function Outlined({ children }: { children: ReactNode }) {
  return (
    <>
      <g {...line} strokeWidth={6}>
        {children}
      </g>
      <g>{children}</g>
    </>
  );
}

function Paw({ x, y, scale = 1, fill }: { x: number; y: number; scale?: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
      <ellipse cx="0" cy="5" rx="7" ry="5.5" />
      <circle cx="-8" cy="-3" r="3" />
      <circle cx="-3" cy="-8" r="3" />
      <circle cx="3" cy="-8" r="3" />
      <circle cx="8" cy="-3" r="3" />
    </g>
  );
}

function Bowl({ fill, rim }: { fill: string; rim: string }) {
  return (
    <>
      <path d="M22 64 H98 L91 94 Q89 100 83 100 H37 Q31 100 29 94 Z" fill={fill} {...line} />
      <rect x="16" y="58" width="88" height="11" rx="5.5" fill={rim} {...line} />
    </>
  );
}

// Color que cambia entre productos del mismo tipo (el plato, la etiqueta).
type Tone = { main: string; light: string };
const TONES: Tone[] = [
  { main: "#2f9e8f", light: "#45bfae" },
  { main: "#e4664a", light: "#f28d75" },
  { main: "#3f7fd1", light: "#6aa3e6" },
  { main: "#8a63c9", light: "#aa8be0" },
];

const DRAWINGS: Record<IllustrationKind, { background: string; art: (tone: Tone) => ReactNode }> = {
  kibble: {
    background: "#fce7bf",
    art: (tone) => (
      <>
        {[
          [36, 58], [84, 58], [48, 50], [72, 50], [60, 44], [54, 58], [66, 58],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" fill="#b8733a" {...thin} />
        ))}
        <Bowl fill={tone.main} rim={tone.light} />
        <Paw x={60} y={85} fill="#ffffff" />
      </>
    ),
  },
  raw: {
    background: "#fbd9d6",
    art: () => (
      <g transform="rotate(-32 60 62)">
        <Outlined>
          <g fill="#fff6e6">
            <rect x="70" y="56" width="34" height="12" />
            <circle cx="104" cy="55" r="7.5" />
            <circle cx="104" cy="69" r="7.5" />
          </g>
        </Outlined>
        <ellipse cx="48" cy="62" rx="32" ry="25" fill="#d9604f" {...line} />
        <ellipse cx="76" cy="62" rx="6" ry="13" fill="#f6c3b5" {...thin} />
        <path d="M26 54 C32 44 46 40 58 43" fill="none" stroke="#f08f7f" strokeWidth="4.5" strokeLinecap="round" />
      </g>
    ),
  },
  can: {
    background: "#d8eef3",
    art: (tone) => (
      <>
        <path d="M28 46 V86 C28 97 92 97 92 86 V46 Z" fill="#e9edf0" {...line} />
        <path d="M28 58 V78 C28 89 92 89 92 78 V58 C92 69 28 69 28 58 Z" fill={tone.main} {...line} />
        <ellipse cx="60" cy="46" rx="32" ry="10" fill="#f7f9fa" {...line} />
        <ellipse cx="60" cy="46" rx="23" ry="6" fill="none" stroke="#b9c3c9" strokeWidth="2" />
        <ellipse cx="60" cy="44" rx="6" ry="3" fill="none" {...thin} />
        <Paw x={60} y={80} scale={0.8} fill="#ffffff" />
      </>
    ),
  },
  stew: {
    background: "#fde2cc",
    art: (tone) => (
      <>
        <path d="M46 32 C41 26 51 22 46 14" fill="none" stroke="#c9ad93" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M66 34 C61 28 71 24 66 16" fill="none" stroke="#c9ad93" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="60" cy="60" rx="36" ry="14" fill="#c9823e" {...line} />
        <rect x="38" y="46" width="12" height="12" rx="2.5" fill="#f28c28" transform="rotate(-12 44 52)" {...thin} />
        <rect x="64" y="42" width="15" height="11" rx="3" fill="#8e4b2b" transform="rotate(10 71 47)" {...thin} />
        <circle cx="56" cy="50" r="4.5" fill="#7bc96f" {...thin} />
        <circle cx="84" cy="56" r="4.5" fill="#7bc96f" {...thin} />
        <path d="M18 60 H102 C102 84 84 102 60 102 C36 102 18 84 18 60 Z" fill="#f6f1e7" {...line} />
        <path d="M27 76 C42 86 78 86 93 76" fill="none" stroke={tone.main} strokeWidth="4" strokeLinecap="round" />
      </>
    ),
  },
  broth: {
    background: "#f6e8bf",
    art: () => (
      <>
        <rect x="34" y="38" width="52" height="62" rx="11" fill="#fff8e8" {...line} />
        <rect x="38.5" y="54" width="43" height="41.5" rx="7" fill="#e8a93b" />
        <circle cx="46" cy="62" r="2.5" fill="#fbe3ad" />
        <circle cx="74" cy="60" r="2" fill="#fbe3ad" />
        <rect x="29" y="28" width="62" height="14" rx="4.5" fill="#7a5c3e" {...line} />
        <rect x="43" y="66" width="34" height="22" rx="4" fill="#ffffff" {...thin} />
        <g fill={INK}>
          <rect x="53" y="75" width="14" height="4" />
          <circle cx="53" cy="74" r="3" />
          <circle cx="53" cy="80" r="3" />
          <circle cx="67" cy="74" r="3" />
          <circle cx="67" cy="80" r="3" />
        </g>
      </>
    ),
  },
  treat: {
    background: "#e4efd8",
    art: () => (
      <>
        <g transform="rotate(-20 60 60)">
          <Outlined>
            <g fill="#f4ddb0">
              <circle cx="34" cy="50" r="11" />
              <circle cx="34" cy="70" r="11" />
              <circle cx="86" cy="50" r="11" />
              <circle cx="86" cy="70" r="11" />
              <rect x="34" y="49" width="52" height="22" />
            </g>
          </Outlined>
          <circle cx="50" cy="60" r="2.2" fill="#c9a66b" />
          <circle cx="60" cy="60" r="2.2" fill="#c9a66b" />
          <circle cx="70" cy="60" r="2.2" fill="#c9a66b" />
        </g>
        <circle cx="24" cy="96" r="4" fill="#f4ddb0" {...thin} />
        <circle cx="98" cy="26" r="3.5" fill="#f4ddb0" {...thin} />
      </>
    ),
  },
  seeds: {
    background: "#eee6d0",
    art: () => (
      <>
        <path d="M44 40 C38 28 50 22 55 30 C58 21 68 23 67 31 C74 24 82 31 76 40 Z" fill="#d8b078" {...line} />
        <path d="M36 44 C27 60 25 84 33 98 H87 C95 84 93 60 84 44 Z" fill="#d8b078" {...line} />
        <path d="M36 44 C46 37 74 37 84 44 C74 50 46 50 36 44 Z" fill="#c29a5f" {...line} />
        <path d="M60 90 C46 82 49 63 60 58 C71 63 74 82 60 90 Z" fill="#7bb661" {...thin} />
        <path d="M60 64 V86" fill="none" {...thin} strokeWidth="2" />
        <ellipse cx="20" cy="104" rx="5" ry="3" fill="#5a4632" transform="rotate(-25 20 104)" />
        <ellipse cx="100" cy="102" rx="5" ry="3" fill="#e6c98a" transform="rotate(20 100 102)" {...thin} strokeWidth="2" />
        <ellipse cx="104" cy="88" rx="4.5" ry="2.8" fill="#5a4632" transform="rotate(-40 104 88)" />
      </>
    ),
  },
  supplement: {
    background: "#e3e5f7",
    art: (tone) => (
      <>
        <circle cx="56" cy="20" r="9" fill={tone.light} {...line} />
        <rect x="46" y="38" width="20" height="16" fill="#a96a3a" {...line} />
        <rect x="42" y="26" width="28" height="15" rx="4" fill={tone.main} {...line} />
        <rect x="36" y="52" width="40" height="50" rx="9" fill="#a96a3a" {...line} />
        <rect x="41" y="66" width="30" height="24" rx="3.5" fill="#ffffff" {...thin} />
        <path d="M56 71 V85 M49 78 H63" fill="none" stroke="#3f9b5c" strokeWidth="4" strokeLinecap="round" />
        <path d="M94 58 C87 70 85 77 94 79 C103 77 101 70 94 58 Z" fill="#f2b63d" {...thin} />
      </>
    ),
  },
  generic: {
    background: "#f0ede5",
    art: () => (
      <g fill="#d98e4a" {...line}>
        <ellipse cx="60" cy="76" rx="22" ry="17" />
        <ellipse cx="33" cy="54" rx="8.5" ry="11" transform="rotate(-18 33 54)" />
        <ellipse cx="51" cy="38" rx="8.5" ry="11" />
        <ellipse cx="69" cy="38" rx="8.5" ry="11" />
        <ellipse cx="87" cy="54" rx="8.5" ry="11" transform="rotate(18 87 54)" />
      </g>
    ),
  },
};

export function ProductIllustration({
  kind,
  variant = 0,
  label,
  className = "",
}: {
  kind: IllustrationKind;
  // Cualquier número: elige el color que cambia entre productos.
  variant?: number;
  label: string;
  className?: string;
}) {
  const { background, art } = DRAWINGS[kind];
  const tone = TONES[variant % TONES.length];
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className={`aspect-square w-full ${className}`}>
      <rect width="120" height="120" fill={background} />
      {art(tone)}
    </svg>
  );
}
