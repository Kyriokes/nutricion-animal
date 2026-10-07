---
name: nueva-funcionalidad
description: Usar antes de implementar cualquier funcionalidad, vista o endpoint del ecommerce. Verifica contra las reglas de negocio, propone un plan corto y recién después se programa.
---

# Nueva funcionalidad

1. Leé `docs/reglas-de-negocio.md` y ubicá las reglas (RN) y vistas (VP, VU, VN, VA) que aplican a lo pedido.
2. Si alguna regla relevante está marcada **[A DEFINIR]**, o hay una contradicción entre reglas, frená y preguntá. No inventes la regla.
3. Proponé un plan corto: archivos a tocar, módulo de dominio, qué va en el backend y qué se testea. Esperá confirmación.
4. Implementá:
   - la lógica de negocio en el módulo de dominio, no en componentes;
   - la validación de entrada con Zod;
   - los componentes de UI solo presentan datos.
5. Escribí tests para la lógica de negocio. No hace falta testear estilos ni pantallas simples.
6. Al terminar, listá qué reglas (RN) quedaron cubiertas y seguí con la skill `cerrar-tarea`.
