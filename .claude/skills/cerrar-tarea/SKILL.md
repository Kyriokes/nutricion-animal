---
name: cerrar-tarea
description: Usar al terminar una tarea, antes de commitear. Verifica que todo funcione, actualiza los documentos del proyecto y deja listo el commit.
---

# Cerrar tarea

1. Corré lint, typecheck y tests (comandos en `CLAUDE.md`). Si algo falla, no declares la tarea terminada: arreglalo o decí qué falla.
2. Actualizá `docs/plan.md`: qué quedó hecho y cuál es el próximo paso.
3. Registrá en `docs/decisiones.md` las decisiones de diseño tomadas, con el porqué en una o dos líneas.
4. Si descubriste una regla nueva o una contradicción, proponé el cambio a `docs/reglas-de-negocio.md`. No lo edites sin confirmación.
5. Dejá un commit chico, con mensaje en español que cite la regla (RN) cuando aplique.
6. Cerrá con un resumen de tres líneas: qué se hizo, qué reglas cubre y qué sigue.

El objetivo es que la próxima sesión pueda retomar leyendo los archivos del repo, sin depender del historial de la conversación.
