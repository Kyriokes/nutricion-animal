# Reglas de negocio (borrador v0.5)

Ecommerce de comida natural para mascotas. Este documento es la fuente de verdad de lo que el sistema debe hacer. Va en el repo como `docs/reglas-de-negocio.md` y Claude Code lo lee antes de implementar cada funcionalidad.

Convenciones:
- Cada regla tiene un código (RN-001, RN-002...) para poder citarla en tareas, tests y commits.
- Lo marcado como **[A DEFINIR]** todavía no está decidido. No se implementa hasta resolverlo.
- Los roles se incorporan por fases, en el orden de la sección 1.

---

## 1. Roles y orden de incorporación

| Fase | Rol | Estado |
|---|---|---|
| 1 | Administrador general | Definido |
| 2 | Cliente | Definido |
| 3 | Nutricionista | Definido |
| 4 | Proveedor | Primera versión con productos mockeados, pero el sistema debe soportar su publicación real |
| 5 | Auditor | Versión posterior |

- **RN-002** Un usuario puede tener varios roles a la vez.
- **RN-003** El ingreso al sistema es con Google en primera instancia.

---

## 2. Definición de cada rol

### 2.1 Administrador general
- **RN-001** Tiene acceso total al sistema.

### 2.2 Cliente
- **RN-010** Puede inscribir sus mascotas.
- **RN-011** Puede comprar alimentos.
- **RN-012** Puede buscar nutricionistas dentro del sistema para contactarse con ellos.
- **RN-013** Puede buscar alimentos filtrando por mascota.
- **RN-014** Puede buscar alimentos filtrando por dieta.
- **RN-015** Puede ver las dietas que un nutricionista le asignó a sus mascotas.

### 2.3 Nutricionista
- **RN-020** Puede hacer todo lo que hace el Cliente (RN-010 a RN-015).
- **RN-021** Puede crear, editar, renombrar y borrar sus propias dietas. Cada nutricionista ve solo las suyas: no se comparten entre nutricionistas, y dos pueden tener dietas iguales sin saberlo.
- **RN-022** (absorbida por RN-021 y RN-023) Ya no hay distinción entre dieta genérica y específica: una misma dieta puede asignarse a varias mascotas.
- **RN-023** Puede asignar una dieta a una mascota para que el Cliente la vea. Una mascota puede tener varias dietas, de varios nutricionistas.
- **RN-024** En el primer ingreso con Google el usuario queda como Cliente; su nombre y su foto se toman de Google solo en ese primer ingreso. Para ser Nutricionista o Proveedor se postula desde su perfil, y queda pendiente hasta que un Administrador o un Auditor lo acepte. Volver a ingresar nunca cambia los roles de un usuario existente (un usuario bloqueado sigue bloqueado).
- **RN-025** Una dieta tiene versiones numeradas. Una versión que nunca se asignó se edita y se borra libremente (salvo la única que le queda a la dieta). Desde que se asigna por primera vez queda fija, y los cambios generan una versión nueva.
- **RN-026** Al hacer una versión nueva de una dieta con mascotas asignadas, el nutricionista ve una alerta con las mascotas afectadas y elige cuáles pasan a la versión nueva; el resto conserva la anterior.
- **RN-027** Puede clonar una de sus dietas para crear otra independiente, que de base es igual y se edita aparte.
- **RN-028** El Cliente ve solo la versión de la dieta que tiene asignada su mascota y se le avisa cuando cambia. **[A DEFINIR]** Cómo se avisa.

### 2.4 Proveedor
- **RN-030** Puede publicar sus productos a la venta.
- **RN-031** En la primera versión los productos se mockean, pero el modelo de datos y la arquitectura deben soportar la publicación real desde el inicio.

### 2.5 Auditor
- **RN-040** Es un administrador con menos permisos.
- **RN-041** Su función es evaluar y aceptar los productos de los proveedores.
- **RN-042** Se incorpora en una versión posterior.
- **RN-043** Puede aceptar o rechazar las postulaciones de nutricionistas y de proveedores, igual que el Administrador (RN-024). No puede decidir su propia postulación.

Nota: mientras el rol Auditor no exista, solo el Administrador acepta nutricionistas.

### 2.6 Pedidos (transversal)
- **RN-060** El Cliente puede ver sus propios pedidos.
- **RN-061** El Administrador puede ver todos los pedidos.
- **RN-062** Cada pedido tiene un estado que ambos pueden consultar: pedido, preparado, en camino, entregado, etcétera (la lista completa se define aparte).
- **RN-063** Más adelante: integración con Google Maps y con servicios de envío tipo PedidosYa o Rappi. Queda fuera de la primera versión.

### 2.7 Apariencia (Administrador, VA-08)
- **RN-070** El Administrador define dos paletas de colores, una para el modo claro y otra para el oscuro. Cada paleta asigna un color a cada categoría: fondo, texto, primario, secundario, acento, error, éxito y advertencia. La lista de categorías puede crecer según lo que necesite el diseño.
- **RN-071** El Administrador puede abrir la paleta actual en coolors.co para editarla allí, y pegar un enlace de coolors.co para tomar sus colores; después asigna cada color a una categoría. También puede escribir un color a mano.
- **RN-072** No se puede guardar una paleta si algún texto no contrasta lo suficiente con su fondo (incluidos error, éxito y advertencia). Umbral: WCAG AA, 4,5:1 (confirmado por el desarrollador).
- **RN-073** Por defecto el sitio sigue el modo claro u oscuro del sistema del usuario. Un botón permite elegir claro, oscuro o sistema, y la elección se recuerda en su navegador.
- **RN-075** En cada categoría, el Administrador puede restaurar el color a su valor base y, si el color no contrasta lo suficiente (RN-072), pedir que el sistema lo aclare u oscurezca lo mínimo necesario para cumplir el mínimo, conservando su tono.
- **RN-074** Existe una paleta base en el código. Se usa si la base de datos no responde o tarda, cuando una paleta guardada no tiene alguna categoría, y para "restaurar valores por defecto".

---

## 3. Búsquedas y estadísticas

Objetivo: saber qué buscan los clientes y qué no encuentran.

- **RN-050** El sistema guarda en la base de datos las búsquedas de los usuarios.
- **RN-051** Con esos datos se debe poder obtener la estadística de los productos más buscados.
- **RN-052** Con esos datos se debe poder obtener la estadística de las búsquedas sin coincidencia.

**[A DEFINIR]** Qué se guarda exactamente de cada búsqueda. Propuesta para confirmar:

| Dato | Para qué sirve |
|---|---|
| Texto buscado, normalizado (minúsculas, sin tildes) | Agrupar "Pollo", "pollo" y "pollo " como la misma búsqueda |
| Filtros aplicados (mascota, dieta) | Saber qué perfil de cliente busca qué |
| Cantidad de resultados devueltos | Detectar las búsquedas sin coincidencia (resultados = 0) |
| Fecha y hora | Ver tendencias en el tiempo |
| Usuario, si tiene sesión iniciada | Asociar búsquedas a un cliente (ver pregunta de datos personales) |

---

## 4. Vistas

Lista aportada por Sergio. Los nombres de las vistas son los suyos. Las responsabilidades de cada rol dentro de cada vista se definen después.

### 4.1 Vistas sin login
- **VP-01** Landing page
- **VP-02** Términos y condiciones / Legales
- **VP-03** Contacto
- **VP-04** Catálogo de productos
- **VP-05** Detalle del producto
- **VP-06** Resultado de búsqueda
- **VP-07** Carrito de compras
- **VP-08** Pre-checkout, que pide ingresar (VP-09) y después vuelve al checkout
- **VP-09** Ingresar con Google (RN-003): modal con "Continuar con Google". No hay registro aparte: el primer ingreso crea la cuenta como Cliente (RN-024)
- **VP-10** FAQ
- **VP-11** About us
- **VP-12** Página no encontrada (404)
- **VP-13** Acceso sin permisos

### 4.2 Vistas con login (Cliente)
- **VU-01** Perfil y datos personales: mis direcciones, mis tarjetas
  - **RN-016** El usuario puede cambiar su foto de perfil: imágenes JPG, PNG o WebP de hasta 1 MB.
  - **RN-017** El usuario guarda una o más direcciones de entrega, como en un delivery de comida: ciudad, calle y altura (obligatorias), piso y departamento (opcionales).
- **VU-02** Historial de pedidos y seguimiento de envíos (RN-060, RN-062)
- **VU-03** Mis mascotas
- **VU-04** Detalle de mascota, con sección "Dieta actual" que muestra la dieta asignada (RN-015)
- **VU-05** Lista de deseos: productos favoritos y productos de mis dietas
- **VU-06** Mis reseñas: productos que compré y todavía no reseñé
- **VU-07** Pasarela de pago
- **VU-08** Buscar nutricionistas (RN-012)
- **VU-09** Perfil del nutricionista, con sus datos
- **VU-10** Resultado del pedido: confirmación, pago aprobado o pago rechazado

### 4.3 Vistas del Nutricionista
- **VN-01** Mis dietas
- **VN-02** Mis pacientes
- **VN-03** Crear dieta
- **VN-04** Asignar dieta a las mascotas de sus usuarios. Flujo provisorio (decidido por el desarrollador): el nutricionista busca al cliente por nombre o email, o a la mascota por nombre, y elige la mascota de una lista; por ahora cualquier nutricionista ve a todos los clientes y sus mascotas. Se revisa cuando se defina cómo se vuelve paciente un cliente (pregunta 5.1). **[A DEFINIR]** El alcance de la búsqueda (qué datos de qué clientes ve un nutricionista, por la Ley 25.326) queda pendiente hasta que el desarrollador lo consulte; mientras tanto la pantalla muestra un aviso de funcionamiento provisorio.
- **VN-05** Mi perfil profesional: donde el nutricionista carga sus datos

### 4.4 Vistas del Administrador
- **VA-01** Dashboard
- **VA-02** Gestión de catálogo
- **VA-03** Gestión de envíos live
- **VA-04** Gestión de compras (el Administrador ve todos los pedidos y sus estados, RN-061)
- **VA-05** Gestión de clientes
- **VA-06** Gestión de nutricionistas (incluye aceptar las solicitudes de registro, RN-024)
- **VA-07** Reportes, incluye las estadísticas de búsquedas (RN-051 y RN-052)
- **VA-08** Configuración del sistema
- **VA-09** Edición de FAQ, About us, términos y condiciones y legales
- **VA-10** Gestión de usuarios y roles

### 4.5 Vistas pendientes de definir

- **Nutricionista:** ordenar y cerrar la lista de vistas (VN-01 a VN-05, más detalle de paciente).
- **Selector de rol (RN-002):** depende de cómo se resuelva la pregunta 1 (cómo se combinan los roles).

### 4.6 Para versiones posteriores

- Moderación de reseñas.
- Vistas del Proveedor y del Auditor, cuando se incorporen esos roles.
- Mapa y seguimiento con Google Maps (RN-063).

Nota: con ingreso por Google no hace falta una vista de recuperar contraseña.

---

## 5. Decisiones técnicas

- **DT-001** La mayor cantidad posible de la lógica de negocio vive en el backend, no en el frontend.
- **DT-002** No se depende por completo del ORM: se usan consultas SQL directas, delegando el procesamiento a la base de datos cuando corresponda (por ejemplo, las estadísticas de búsquedas).
- **DT-003** Toda consulta SQL directa se escribe parametrizada, nunca armada concatenando texto.
- **DT-004** Los datos de tarjeta los guarda la pasarela de pago. El sistema conserva solo una referencia, nunca el número de la tarjeta.

---

## 6. Glosario

- **Dieta:** plan de alimentación recetado por un nutricionista. Es el único término del sistema: no se usa "receta".
- **Versión:** estado numerado del contenido de una dieta. Cada mascota tiene asignada una versión concreta.
- **Clonar:** crear una dieta nueva, independiente, a partir de otra propia.
- **Asignar:** vincular una dieta a una mascota para que su Cliente pueda verla.

---

## 7. Definiciones técnicas (resueltas)

**Roles (pregunta 1):**
- Un usuario tiene una lista de roles (RN-002). Cada rol es único y lleva su propio conjunto de permisos, sin herencia entre roles; los permisos de varios roles se suman. Un usuario sin roles no tiene ningún permiso, lo que permite bloquearlo sin borrarlo. Cada usuario tiene un campo de nota del administrador donde se anota, por ejemplo, el motivo por el que se lo dejó sin roles.

**Nutricionista: registro y aprobación (preguntas 2 y 8):**
- Un usuario se registra con Google (login modal).
- Para ser nutricionista o proveedor: botón en perfil > formulario de postulación.
- Admin y Auditor revisan la postulación y aprueban o rechazan (notificación por email, detalles de email a resolver).
- Mientras está pendiente, el usuario conserva sus roles (Cliente): puede comprar, buscar, ver sus mascotas. Al aprobarse se agrega el rol; al rechazarse no cambia nada y puede volver a postularse.
- Auditor es un usuario que el Administrador elige desde el dashboard.
- Proveedor también requiere aprobación.
- Nadie decide su propia postulación, salvo el Administrador.
- **RN-044** Al rechazar, quien decide escribe una nota corta con el motivo, que el postulante ve.
- **RN-045** El resultado (aprobada o rechazada) se informa dentro de la aplicación: el postulante ve un aviso hasta que lo marca como leído. Los emails quedan para una versión avanzada.
- Formulario de proveedor: en la primera versión solo el nombre del negocio; el resto, en una versión avanzada.
- El Administrador es omnipotente (RN-001): puede dar cualquier rol directamente, sin postulación.
- **RN-046** Un usuario bloqueado (sin roles) solo ve una pantalla estilo "página no encontrada" que le indica que contacte a soporte (soporte: versión avanzada). No ve nada más del sitio ni puede hacer ninguna acción, salvo cerrar sesión. No ve la nota del administrador.

**Perfil del nutricionista (pregunta 3):**
- Públicamente visible: nombre, foto, dirección, número de contacto.
- Privado (solo para él): número de matrícula/certificación.
- **RN-029** Al aprobarse la postulación, sus datos pasan a un perfil profesional (VN-05) que el nutricionista puede editar y que ven los clientes con sesión iniciada (VU-08, VU-09), sin la matrícula.
- **RN-047** Si quien emitió una dieta deja de formar parte de la plataforma (pierde el rol de nutricionista, queda bloqueado o se da de baja), sus dietas no se borran: el cliente sigue viéndolas, con un aviso en la misma dieta de que quien la emitió ya no forma parte de la plataforma y que la plataforma desaconseja continuarla.
- Al clonar una dieta ajena, el administrador queda como dueño de la copia (confirmado).
- No se valida la matrícula al dar de alta: es responsabilidad del Administrador/Auditor revisar en el formulario.

**Dietas (pregunta 4):**
- Cada nutricionista tiene sus propias dietas y solo él las ve y las maneja (RN-021). No existe la distinción entre dieta genérica y específica.
- El nombre pertenece a la dieta, no a la versión: renombrar no crea una versión.

**Asignar dieta (pregunta 5):**
- El nutricionista busca al usuario por nombre/email, elige una de sus mascotas de una lista, y asigna una dieta.
- Una misma mascota puede tener múltiples dietas de múltiples nutricionistas simultáneamente.
- Una misma dieta puede asignarse a varias mascotas. Al asignar queda vinculada a una versión concreta, por defecto la última.
- Terminar una asignación no la borra: queda como historial y la versión sigue fija (RN-025).
- Al editar una dieta con mascotas asignadas se crea una versión nueva y el nutricionista decide a cuáles mascotas se la pasa (RN-026).
- **No** se aplica el vínculo a otras dietas: dos dietas clonadas son independientes (RN-027).
- **[A DEFINIR]** Cómo se vuelve paciente un cliente (condiciones, registro, etc.).

**Contacto cliente-nutricionista (pregunta 6):**
- **[A DEFINIR]** Método específico (mensaje interno, WhatsApp, formulario, turno).

**Negocio (pregunta 7):**
- El negocio está en la venta de comida, no en los servicios de nutrición.
- Las dietas no tienen costo en el sistema.

**Campos de una mascota (RN-010):**
- Nombre y especie (obligatorios). La especie es texto libre; la interfaz sugiere las especies que ya existen en la base de datos. Raza, fecha de nacimiento y peso en kg (opcionales).
- Condiciones de salud, alergias, alimentos no permitidos y alimentos de necesidad (listas, pueden estar vacías).
- Un alimento no puede ser a la vez de necesidad y alergénico o no permitido.

**Campos de una dieta (pregunta 14):**
- Nombre, descripción (texto).
- Duración: número de días (1-999) O indefinida (bool).
- Frecuencia: lista de alimentos con patrón de consumo.
  - Patrón semanal: "X veces por semana".
  - Patrón corto: "cada N días" donde N < 10, que se repite desde el día 1.
- Notas: texto libre, no afecta la lógica del sistema. Solo para aclaraciones.

**Campos de un producto (pregunta 15):**
- Nombre, descripción, precio, imagen, stock (asumido).
- Peso (número, unidad) y volumen (número, unidad).
- Marca (texto).
- Lista de tipos de mascota (perro, gato, etc.).
- Lista de tipos de dieta (genérica o referencias a dietas específicas).
- Tabla nutricional (opcional): proteína %, grasa %, fibra %, etc.

## 7.1 Preguntas abiertas (pendientes)

10. **[A DEFINIR]** Búsquedas: ¿se guardan también las de usuarios sin sesión? ¿Por cuánto tiempo se conservan?
11. **[A DEFINIR]** Datos personales: revisar qué exige la normativa argentina de protección de datos personales antes de guardar búsquedas asociadas a usuarios.
12. **[A DEFINIR]** Primera versión: ¿qué entra de pagos y envíos (costo de envío, quién reparte)?
13. **[A DEFINIR]** Cuando exista el Proveedor real, ¿un producto puede publicarse sin aprobación mientras el rol Auditor no exista?

---

## Historial de cambios

- v0.1: primer borrador con los cinco roles y las búsquedas.
- v0.2: usuarios con varios roles (RN-002), alta de nutricionistas por administradores y auditores (RN-024, RN-043), propuesta de datos a guardar por búsqueda, decisiones técnicas (DT-001 a DT-003), sección de vistas pendiente.
- v0.3: lista inicial de vistas por rol (VP, VU, VN, VA), vistas sugeridas para revisar y tres preguntas nuevas.
- v0.4: ingreso con Google (RN-003), pedidos y estados (RN-060 a RN-063), vistas nuevas (buscar nutricionistas, perfil del nutricionista, asignar dieta, mi perfil profesional), término único "dieta", DT-004 sobre tarjetas, preguntas abiertas reordenadas.
- v0.5: se resuelve parte de 4.5 (dieta en detalle de mascota, resultado del pedido, páginas de error, gestión de usuarios y roles, estadísticas dentro de Reportes). Nuevo flujo de registro con elección de rol y aceptación de nutricionistas por un administrador (RN-024).
