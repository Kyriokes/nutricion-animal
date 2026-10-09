"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { PageContent, PageSlug } from "@/modules/contenido/paginas";
import { savePageAction, type ContentActionResult } from "./actions";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// VA-09: editor de una página de texto.
export function PageEditor({ slug, path, initial }: { slug: PageSlug; path: string; initial: PageContent }) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [result, setResult] = useState<ContentActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await savePageAction(slug, { title, body })));
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Título
        <input className={`${inputClass} h-8`} maxLength={120} required value={title} onChange={(e) => { setTitle(e.target.value); setResult(null); }} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Texto
        <textarea
          className={`${inputClass} min-h-48 py-1 font-mono`}
          maxLength={20000}
          value={body}
          onChange={(e) => { setBody(e.target.value); setResult(null); }}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Link href={path} className="text-sm underline underline-offset-4" target="_blank">
          Ver página
        </Link>
        {result?.ok && <span role="status" className="text-sm text-success">Guardado.</span>}
        {result && !result.ok && <span role="alert" className="text-sm text-destructive">{result.message}</span>}
      </div>
    </form>
  );
}
