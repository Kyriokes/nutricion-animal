// Crea o actualiza los buckets de Supabase Storage (RN-016 y catálogo).
// Uso: npm run storage:setup. Requiere SUPABASE_SECRET_KEY en .env.local.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// Públicos (las imágenes se muestran en el sitio), con límites en el propio
// bucket además de la validación del servidor.
const options = {
  public: true,
  fileSizeLimit: 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

for (const name of ["avatars", "products"]) {
  const { data: existing } = await supabase.storage.getBucket(name);
  const { error } = existing
    ? await supabase.storage.updateBucket(name, options)
    : await supabase.storage.createBucket(name, options);
  if (error) {
    console.log(`ERROR en ${name}:`, error.message);
    process.exitCode = 1;
  } else {
    console.log(`bucket ${name}: ${existing ? "actualizado" : "creado"}`);
  }
}
