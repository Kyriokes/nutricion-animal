import { describeDuration, describeFood } from "@/modules/dietas/presentacion";
import type { DietContent } from "@/modules/dietas/schema";

// Contenido de una versión de dieta, para el cliente (RN-015) y el
// nutricionista. Solo presenta.
export function DietContentView({ content }: { content: DietContent }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>{content.description}</p>
      <ul className="list-disc pl-5">
        {content.foods.map((f, i) => (
          <li key={i}>{describeFood(f)}</li>
        ))}
      </ul>
      <p className="text-muted-foreground">Duración: {describeDuration(content.duration)}</p>
      {content.notes && <p className="text-muted-foreground">Notas: {content.notes}</p>}
    </div>
  );
}
