"use client";

import { Contrast, RotateCcw } from "lucide-react";
import { useState, useTransition, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { categoryMeetsContrast, fixContrast } from "@/modules/apariencia/ajuste";
import { normalizeHex, type Hex } from "@/modules/apariencia/color";
import { parseCoolorsUrl, toCoolorsUrl } from "@/modules/apariencia/coolors";
import { describeContrastIssues } from "@/modules/apariencia/guardar";
import {
  CATEGORY_LABELS,
  DEFAULT_PALETTES,
  PALETTE_CATEGORIES,
  validatePalette,
  type Palette,
  type PaletteCategory,
  type ThemeMode,
} from "@/modules/apariencia/paleta";
import { toCssVariables } from "@/modules/apariencia/variables";
import { savePalettes, type SavePalettesResult } from "./actions";

const MODES: { mode: ThemeMode; label: string }[] = [
  { mode: "light", label: "Modo claro" },
  { mode: "dark", label: "Modo oscuro" },
];

const inputClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Solo presenta y junta datos: las reglas están en src/modules/apariencia
// y el servidor las vuelve a verificar al guardar (savePalettes).
export function PaletteForm({ initial }: { initial: Record<ThemeMode, Palette> }) {
  const [palettes, setPalettes] = useState(initial);
  const [mode, setMode] = useState<ThemeMode>("light");
  const [coolorsUrl, setCoolorsUrl] = useState("");
  const [swatches, setSwatches] = useState<Hex[]>([]);
  const [coolorsError, setCoolorsError] = useState<string | null>(null);
  const [result, setResult] = useState<SavePalettesResult | null>(null);
  const [saving, startSaving] = useTransition();

  const palette = palettes[mode];
  const issues = describeContrastIssues(
    MODES.flatMap(({ mode: m }) =>
      validatePalette(palettes[m]).map((issue) => ({ mode: m, issue })),
    ),
  );

  function setColor(category: PaletteCategory, hex: Hex) {
    setResult(null);
    setPalettes((p) => ({ ...p, [mode]: { ...p[mode], [category]: hex } }));
  }

  // RN-071: toma los colores de un enlace de coolors.co.
  function readCoolors() {
    const r = parseCoolorsUrl(coolorsUrl);
    if (r.ok) {
      setSwatches(r.colors);
      setCoolorsError(null);
    } else {
      setSwatches([]);
      setCoolorsError(
        r.error === "invalid_url"
          ? "El enlace no es de coolors.co."
          : "No encontré colores en el enlace.",
      );
    }
  }

  function save() {
    startSaving(async () => setResult(await savePalettes(palettes)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Modo" className="flex gap-2">
        {MODES.map((m) => (
          <Button
            key={m.mode}
            role="tab"
            aria-selected={mode === m.mode}
            variant={mode === m.mode ? "default" : "outline"}
            onClick={() => setMode(m.mode)}
          >
            {m.label}
          </Button>
        ))}
      </div>

      <section className="flex flex-col gap-2 rounded-lg border p-4">
        <h2 className="font-medium">Colores desde coolors.co</h2>
        <p className="text-sm text-muted-foreground">
          Abrí la paleta actual en coolors, cambiala, copiá el enlace del
          navegador y pegalo acá. Después asigná cada color a una categoría.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Enlace de coolors.co"
            placeholder="https://coolors.co/264653-2a9d8f-e9c46a"
            className={`${inputClass} min-w-64 flex-1`}
            value={coolorsUrl}
            onChange={(e) => setCoolorsUrl(e.target.value)}
          />
          <Button variant="secondary" onClick={readCoolors}>
            Leer colores
          </Button>
          <a
            className="inline-flex h-8 items-center rounded-lg border px-2.5 text-sm hover:bg-muted"
            href={toCoolorsUrl(PALETTE_CATEGORIES.map((c) => palette[c]))}
            target="_blank"
            rel="noopener noreferrer"
          >
            Editar en coolors
          </a>
        </div>
        {coolorsError && (
          <p role="alert" className="text-sm text-destructive">
            {coolorsError}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Categorías</h2>
          {PALETTE_CATEGORIES.map((c) => (
            <CategoryRow
              key={`${mode}-${c}-${palette[c]}`}
              label={CATEGORY_LABELS[c]}
              value={palette[c]}
              defaultValue={DEFAULT_PALETTES[mode][c]}
              meetsContrast={categoryMeetsContrast(palette, c)}
              swatches={swatches}
              onChange={(hex) => setColor(c, hex)}
              onFix={() => {
                const fixed = fixContrast(palette, c);
                if (fixed) setColor(c, fixed);
                else
                  setResult({
                    ok: false,
                    message: `No encontré un color de ${CATEGORY_LABELS[c]} que cumpla el contraste.`,
                  });
              }}
            />
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Vista previa</h2>
          <Preview palette={palette} />
        </section>
      </div>

      {issues.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive p-3 text-sm">
          <p className="font-medium text-destructive">
            Algunos textos no se leerían bien. Ajustá estos colores para guardar:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={saving || issues.length > 0}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setPalettes(DEFAULT_PALETTES);
            setResult(null);
          }}
        >
          Restaurar valores por defecto
        </Button>
        <p role="status" className="text-sm">
          {result?.ok && "Paleta guardada."}
          {result && !result.ok && (
            <span className="text-destructive">{result.message}</span>
          )}
        </p>
      </div>
      {result && !result.ok && result.details && (
        <ul className="list-disc pl-5 text-sm">
          {result.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRow({
  label,
  value,
  defaultValue,
  meetsContrast,
  swatches,
  onChange,
  onFix,
}: {
  label: string;
  value: Hex;
  defaultValue: Hex;
  meetsContrast: boolean;
  swatches: Hex[];
  onChange: (hex: Hex) => void;
  onFix: () => void;
}) {
  // Borrador del texto: se aplica solo cuando es un hex válido.
  const [draft, setDraft] = useState(value);
  const name = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    // Columnas fijas (nombre, color, código, restaurar) y una última flexible:
    // solo las muestras y el botón de ajuste se acomodan si no entran.
    <div className="grid grid-cols-[5.5rem_2rem_5.5rem_2rem_minmax(0,1fr)] items-center gap-2">
      <span className="truncate text-sm">{name}</span>
      <input
        type="color"
        aria-label={`${name}: elegir color`}
        className="size-8 cursor-pointer rounded border"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        aria-label={`${name}: código hex`}
        className={`${inputClass} w-full font-mono`}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const hex = normalizeHex(e.target.value);
          if (hex) onChange(hex);
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        title={`Restaurar ${label} al valor por defecto`}
        aria-label={`Restaurar ${label} al valor por defecto`}
        disabled={value === defaultValue}
        onClick={() => onChange(defaultValue)}
      >
        <RotateCcw />
      </Button>
      <div className="flex flex-wrap items-center gap-1">
        {!meetsContrast && (
          <Button
            variant="outline"
            size="sm"
            title={`Aclarar u oscurecer ${label} lo mínimo para que se lea (RN-075)`}
            onClick={onFix}
          >
            <Contrast />
            Ajustar
          </Button>
        )}
        {swatches.map((s) => (
          <button
            key={s}
            type="button"
            title={`Usar ${s} para ${label}`}
            aria-label={`Usar ${s} para ${label}`}
            className="size-6 rounded border"
            style={{ backgroundColor: s }}
            onClick={() => onChange(s)}
          />
        ))}
      </div>
    </div>
  );
}

const STATUS = [
  { label: "Error", className: "bg-destructive text-destructive-foreground" },
  { label: "Éxito", className: "bg-success text-success-foreground" },
  { label: "Advertencia", className: "bg-warning text-warning-foreground" },
];

// Aplica la paleta solo dentro del recuadro, con las mismas variables CSS
// que usa el sitio.
function Preview({ palette }: { palette: Palette }) {
  return (
    <div
      style={toCssVariables(palette) as CSSProperties}
      className="flex flex-col gap-3 rounded-lg border bg-background p-4 text-foreground"
    >
      <p className="font-semibold">Título de ejemplo</p>
      <p className="text-sm text-muted-foreground">Texto secundario.</p>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-lg bg-primary px-2.5 py-1 text-sm text-primary-foreground">
          Primario
        </span>
        <span className="rounded-lg bg-secondary px-2.5 py-1 text-sm text-secondary-foreground">
          Secundario
        </span>
        <span className="rounded-lg bg-accent px-2.5 py-1 text-sm text-accent-foreground">
          Acento
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS.map((s) => (
          <span key={s.label} className={`rounded-md px-2 py-1 text-sm ${s.className}`}>
            {s.label}
          </span>
        ))}
      </div>
      <p className="text-sm text-destructive">Mensaje de error como texto.</p>
    </div>
  );
}
