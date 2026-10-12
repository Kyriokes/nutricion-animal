# Propuesta: dieta versión 2

Estado: **borrador para revisar con quien define la nutrición**. Nada de esto está implementado ni decidido.
Fecha: 2026-10-12.

## Por qué

Revisamos cinco formulaciones reales de una nutricionista (cuatro perros y un gato, con distintas enfermedades). Todas siguen la misma plantilla, y esa plantilla no se parece a cómo el sitio guarda hoy una dieta. Hoy una dieta es una lista de alimentos, cada uno con "tantas veces por semana", y unas notas cortas. Una dieta real es otra cosa: una **ración diaria por grupos, con alternativas**, más suplementos, listas de permitidos y prohibidos, instrucciones y un control.

Este documento propone cómo debería ser la dieta en el sitio y deja las preguntas que hay que responder antes de programar.

## Qué tiene una dieta real

| Parte | Ejemplo (inventado, con la forma de las reales) |
|---|---|
| Ficha del paciente | Perra, 5 años, castrada. Peso 16,4 kg, ideal 15 kg. Condición corporal 3,8/5. Actividad moderada. Sin enfermedades. |
| Transición | "Se baja de a poco el balanceado y se suben carnes y vegetales de a 50 g…" |
| Ración diaria por grupos | Carnes: pollo o cerdo 300 g, **o** vaca 250 g (pesar en crudo). Vegetales: 150 g (cocidos). Arroz 150 g **o** batata 180 g. Aceite 8 ml. Huevo ¼ unidad. Frutas 50 g. |
| Comidas por día | "Dividido en 2 a 3 comidas" |
| Suplementos | Calcio en polvo 2 g por día. Tónico 4 g por día. Omega 3: 1 cápsula por día. Cada uno con cómo darlo. |
| Permitidos por grupo | Carnes: cuadril, bola de lomo, pechuga… Vegetales: zapallo, zanahoria, **poca** acelga ("no mezclar más de 3"). Frutas: manzana, pera, arándanos ("no más de 3 a 4"). |
| Prohibidos | Cebolla, ajo, puerro, verdeo, uvas y pasas. Iguales en las cinco. |
| Instrucciones | Cocción, remojo del arroz, cómo armar y freezar las viandas, higiene. Texto casi idéntico en todas. |
| Fotos | Cucharas medidoras, los suplementos, puntos de cocción, tamaños de huevo. |
| Control | "En 1 mes y medio" |
| Firma | Nombre, matrícula y logo de la profesional |

## Propuesta

### 1. Una dieta es para un paciente

Hoy una dieta se arma una vez y se asigna igual a varias mascotas. En la práctica, cada formulación es para un animal, con sus cantidades. La base es la misma (una plantilla) y se ajusta.

Propuesta: el nutricionista tiene **plantillas** propias (por ejemplo, "Casera perro adulto", "Gato diabético"). Para un paciente, parte de una plantilla, ajusta y guarda **la dieta de ese paciente**. Los cambios en cada control crean una versión nueva de esa dieta, como hoy.

### 2. Ficha del paciente en la dieta

La dieta guarda una foto de cómo estaba el paciente ese día: peso actual, peso ideal, condición corporal, masa muscular, materia fecal, actividad, enfermedades y quién lo deriva. En el control siguiente se carga otra, y queda la evolución.

Los datos que no cambian (sexo, si está castrado, fecha de nacimiento) van en la mascota.

### 3. Ración diaria por grupos, con alternativas

Reemplaza a "tantas veces por semana", que no aparece en ninguna de las dietas revisadas.

- La ración se organiza en **grupos**: carnes, vegetales, cereales y tubérculos, aceite, huevo, frutas, lácteos, legumbres.
- Cada grupo tiene **una o más alternativas**; cada alternativa, sus alimentos y su cantidad por día: "pollo o cerdo 300 g" / "vaca 250 g".
- Cada cantidad dice **cómo se pesa**: en crudo o cocido.
- Unidades: gramos, mililitros y **unidad** (con fracciones, para el huevo).
- La dieta indica en **cuántas comidas** se reparte ("2 a 3").

Los alimentos salen de la lista única que ya existe (pollo, zapallo, arroz integral…).

### 4. Suplementos

Sección propia. Cada suplemento: cuál es, la dosis por día (gramos, mililitros, gotas, cápsulas, pulsaciones, medidas) y cómo darlo.

Propuesta: que los suplementos sean **productos del catálogo**. Así el cliente ve en su dieta "Calcio en polvo, 2 g por día" con un botón para comprarlo, y el sitio puede estimar cuánto le dura.

### 5. Permitidos y prohibidos

- **Permitidos por grupo**: la lista de cortes, vegetales y frutas que puede usar, con una nota opcional por alimento ("poca", "no más de 3 a 4") y una regla del grupo ("no mezclar más de 3 variedades").
- **Prohibidos de la dieta**: los que indica el nutricionista para ese paciente.
- **Prohibidos por especie**: cebolla, ajo, puerro, verdeo, uvas y pasas se repiten siempre. Propuesta: que vengan cargados para perros y gatos, y que el catálogo y el carrito los tengan en cuenta sin que cada cliente los anote.

### 6. Instrucciones con plantillas

Los textos de preparación, armado de viandas, higiene y "qué esperar" son casi iguales en todas las dietas. Propuesta: cada nutricionista guarda sus **bloques de texto** y los inserta en la dieta; puede editarlos para ese paciente.

Lo mismo con la **transición** (cómo pasar del alimento anterior), que es un texto por dieta.

Las fotos de referencia (cucharas, puntos de cocción) quedan para una segunda etapa.

### 7. Control

La dieta guarda **cuándo es el próximo control**. El cliente lo ve en la dieta. Avisar por email queda para cuando haya emails.

### 8. Entrega en PDF

El cliente puede descargar su dieta como PDF, con el nombre, la matrícula y el logo del nutricionista. Segunda etapa.

### 9. Relación con la tienda

Con cantidades por día, el sitio puede calcular cuánto hace falta por semana o por mes: es la base del carrito asistido. Pero antes hay que definir qué vende la tienda en relación con estas dietas (pregunta 18).

## Preguntas para quien define la nutrición

**Sobre la dieta y el paciente**
1. ¿Una dieta es siempre para un solo paciente? ¿Sirve trabajar con plantillas propias que se ajustan?
2. ¿Qué datos de la ficha son obligatorios y cuáles opcionales?
3. ¿Qué valores puede tomar cada dato? Condición corporal (¿de 1 a 5, con decimales?), masa muscular (¿baja, normal, alta?), materia fecal, actividad (¿sedentaria, moderada, activa?).
4. ¿El cliente ve la ficha completa o solo una parte?

**Sobre la ración**
5. ¿Los grupos son siempre los mismos (carnes, vegetales, cereales y tubérculos, aceite, huevo, frutas, lácteos, legumbres) o cada dieta arma los suyos?
6. ¿Hay dietas en las que un alimento va algunos días sí y otros no ("pescado 2 veces por semana")? Si no existen, se quita esa opción.
7. Además de gramos, mililitros y unidad, ¿hace falta otra unidad para los alimentos?
8. ¿"Pesar en crudo" o "cocido" va siempre por grupo, o puede cambiar por alimento?

**Sobre los suplementos**
9. ¿Cuáles son los suplementos que se recetan habitualmente? ¿Conviene que estén en el catálogo de la tienda?
10. ¿Hay reemplazos ("este reemplaza a aquel") o suplementos por tiempo limitado ("empezar cuando termine el otro")? ¿Hace falta registrarlo o alcanza con escribirlo en la indicación?

**Sobre permitidos y prohibidos**
11. Las listas de permitidos, ¿se arman en cada dieta o hay una lista estándar por especie que se ajusta?
12. ¿Hay una lista de alimentos prohibidos por especie que podamos cargar de base? ¿Cuál es para perros y cuál para gatos?
13. Si un producto de la tienda contiene un alimento que no está entre los permitidos de la dieta, ¿hay que avisar, bloquear o nada?

**Sobre instrucciones y control**
14. ¿Sirven los bloques de texto reutilizables? ¿Cuáles serían los bloques típicos?
15. ¿Las fotos son necesarias desde el principio o pueden esperar?
16. ¿El control se indica como plazo ("en 1 mes y medio") o como fecha? ¿Quién tiene que recibir el recordatorio?

**Sobre el PDF**
17. ¿Cada nutricionista usa su propio logo y firma? ¿El PDF tiene que parecerse al que entrega hoy?

**Sobre la tienda**
18. ¿Qué vende la tienda en relación con estas dietas? ¿Viandas ya armadas según la dieta, ingredientes sueltos, suplementos, alimentos naturales envasados? De esto depende casi todo lo demás.
19. ¿Tiene sentido que el sitio calcule cuánto comprar según la dieta y su duración?

**Sobre los datos**
20. La veterinaria que deriva al paciente, ¿hay que guardarla? ¿Es un dato que ve el cliente?

## Qué cambiaría en el sistema, en orden

1. **Contenido de la dieta**: grupos con alternativas, comidas por día, ficha del paciente, permitidos y prohibidos, instrucciones, transición y control. Reemplaza al contenido actual; la dieta de prueba que existe se convierte.
2. **Suplementos**, vinculados a productos del catálogo.
3. **Plantillas** del nutricionista: de dieta y de bloques de texto.
4. **Prohibidos por especie**, y que el catálogo y el carrito los usen.
5. **PDF** con logo y firma, y fotos de referencia.
6. **Cálculo de compra** según la dieta (depende de la pregunta 18).

Lo que ya está hecho y se aprovecha: la lista única de alimentos, las versiones de una dieta, clonar, y las alergias y restricciones de cada mascota.

## Qué queda fuera de esta propuesta

- Avisos por email o WhatsApp (controles, cambios de dieta).
- Cómo un cliente se vuelve paciente de un nutricionista y qué datos puede ver el nutricionista (sigue pendiente).
- Cálculo automático de requerimientos nutricionales: el sitio guarda lo que formula el profesional, no formula.
