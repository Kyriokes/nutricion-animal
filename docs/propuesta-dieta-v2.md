# Propuesta: dieta versión 2

Estado: **borrador**. Hay una parte decidida por Sergio (2026-10-12) y una parte que espera las respuestas de la nutricionista. Nada está implementado.

## Por qué

Revisamos cinco formulaciones reales de una nutricionista (cuatro perros y un gato, con distintas enfermedades). Todas siguen la misma plantilla, y esa plantilla no se parece a cómo el sitio guarda hoy una dieta. Hoy una dieta es una lista de alimentos, cada uno con "tantas veces por semana", y unas notas cortas. Una dieta real es otra cosa: una **ración diaria por grupos, con alternativas**, más suplementos, listas de permitidos y prohibidos, instrucciones y un control.

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

## Decidido (Sergio, 2026-10-12)

1. **Una dieta se hace para un paciente.** No hay "plantillas" como cosa aparte: se reutiliza **clonando** una dieta propia. Se puede clonar por dos caminos:
   - desde la vista de una dieta existente, con un botón "Clonar";
   - desde "Nueva dieta": el formulario empieza en blanco y ofrece buscar entre las dietas propias para partir de una.
2. **Ficha del paciente: todos los datos son opcionales por ahora.** Se ajusta cuando responda la nutricionista (pregunta A1).
3. **Sin logo ni firma.** La dieta no lleva logo ni firma del profesional.
4. **Qué vende la tienda:** viandas armadas y todo lo que vende un pet shop en su sección de alimentos.
5. **El sitio tiene que facilitar el seguimiento de la dieta.** **[A DEFINIR]** cómo. No se implementa hasta definirlo.
6. **La veterinaria que deriva al paciente no se guarda.** Fuera del alcance.

## Propuesta (pendiente de las respuestas)

### Ficha del paciente en la dieta

La dieta guarda una foto de cómo estaba el paciente ese día: peso actual, peso ideal, condición corporal, masa muscular, materia fecal, actividad y enfermedades. En el control siguiente se carga otra, y queda la evolución.

Los datos que no cambian (sexo, si está castrado, fecha de nacimiento) van en la mascota.

### Ración diaria por grupos, con alternativas

Reemplaza a "tantas veces por semana", que no aparece en ninguna de las dietas revisadas.

- La ración se organiza en **grupos**: carnes, vegetales, cereales y tubérculos, aceite, huevo, frutas, lácteos, legumbres.
- Cada grupo tiene **una o más alternativas**; cada alternativa, sus alimentos y su cantidad por día: "pollo o cerdo 300 g" / "vaca 250 g".
- Cada cantidad dice **cómo se pesa**: en crudo o cocido.
- Unidades: gramos, mililitros y **unidad** (con fracciones, para el huevo).
- La dieta indica en **cuántas comidas** se reparte ("2 a 3").

Los alimentos salen de la lista única que ya existe (pollo, zapallo, arroz integral…).

### Suplementos

Sección propia. Cada suplemento: cuál es, la dosis por día (gramos, mililitros, gotas, cápsulas, pulsaciones, medidas) y cómo darlo.

Como la tienda vende lo que vende un pet shop, los suplementos pueden ser **productos del catálogo**: el cliente ve en su dieta "Calcio en polvo, 2 g por día" con un botón para comprarlo.

### Permitidos y prohibidos

- **Permitidos por grupo**: la lista de cortes, vegetales y frutas que puede usar, con una nota opcional por alimento ("poca", "no más de 3 a 4") y una regla del grupo ("no mezclar más de 3 variedades").
- **Prohibidos de la dieta**: los que indica el nutricionista para ese paciente.
- **Prohibidos por especie**: cebolla, ajo, puerro, verdeo, uvas y pasas se repiten siempre. Propuesta: que vengan cargados para perros y gatos, y que el catálogo y el carrito los tengan en cuenta sin que cada cliente los anote.

### Instrucciones

Los textos de preparación, armado de viandas, higiene y "qué esperar" son casi iguales en todas las dietas. Al clonar una dieta se copian. Si además hacen falta **bloques de texto** guardados para insertar, depende de la pregunta E1.

La **transición** (cómo pasar del alimento anterior) es un texto por dieta.

### Control

La dieta guarda **cuándo es el próximo control**. El cliente lo ve en la dieta.

### Relación con la tienda

La tienda vende viandas armadas y alimentos de pet shop. Falta definir cómo se relaciona una vianda con una dieta (bloque G): de eso dependen el carrito asistido y el seguimiento.

## Preguntas para la nutricionista

Cada pregunta tiene un código para poder responder "A3: sí". Si una no aplica, se puede responder "no aplica".

### A. Ficha del paciente

- **A1.** De estos datos, ¿cuáles son obligatorios? Peso actual, peso ideal, condición corporal, masa muscular, materia fecal, actividad, enfermedades.
- **A2.** ¿Falta algún dato en esa lista?
- **A3.** ¿Con qué escala se anota la condición corporal? (por ejemplo, de 1 a 5 con decimales, o de 1 a 9)
- **A4.** ¿Qué valores puede tomar la masa muscular?
- **A5.** ¿Qué valores puede tomar la materia fecal?
- **A6.** ¿Qué valores puede tomar la actividad?
- **A7.** ¿El cliente tiene que ver la ficha completa, una parte o nada?

### B. Ración diaria

- **B1.** ¿Los grupos son siempre los mismos? (carnes, vegetales, cereales y tubérculos, aceite, huevo, frutas, lácteos, legumbres)
- **B2.** Si no, ¿cada dieta arma sus propios grupos?
- **B3.** ¿Hay dietas donde un alimento va solo algunos días? (por ejemplo, "pescado 2 veces por semana")
- **B4.** Además de gramos, mililitros y unidad, ¿hace falta otra unidad para los alimentos?
- **B5.** "Pesar en crudo" o "cocido", ¿se indica por grupo o puede cambiar por alimento?
- **B6.** ¿La cantidad de comidas por día es siempre un rango ("2 a 3") o a veces un número fijo?

### C. Suplementos

- **C1.** ¿Cuáles son los suplementos que recetás habitualmente?
- **C2.** ¿Conviene que estén a la venta en la tienda?
- **C3.** ¿Hay suplementos que reemplazan a otro? ("este en lugar de aquel")
- **C4.** ¿Hay suplementos por tiempo limitado? ("empezar cuando termine el otro")
- **C5.** Para C3 y C4, ¿alcanza con escribirlo en la indicación, o hace falta que el sitio lo registre aparte?

### D. Permitidos y prohibidos

- **D1.** La lista de alimentos permitidos, ¿la armás de cero en cada dieta o partís de una lista estándar?
- **D2.** Si hay lista estándar, ¿es una por especie?
- **D3.** ¿Cuáles son los alimentos prohibidos para todos los perros?
- **D4.** ¿Cuáles son los alimentos prohibidos para todos los gatos?
- **D5.** Si un producto de la tienda contiene un alimento que no está entre los permitidos de la dieta, ¿el sitio tiene que avisar, impedir la compra o no hacer nada?

### E. Instrucciones

- **E1.** Al clonar una dieta se copian sus textos. ¿Alcanza con eso, o además querés guardar textos sueltos para insertar en cualquier dieta?
- **E2.** ¿Cuáles son las secciones de texto que lleva siempre una dieta? (por ejemplo: transición, preparación, armado de viandas, higiene, qué esperar)
- **E3.** ¿Las fotos de referencia (cucharas, puntos de cocción) son necesarias desde el principio?

### F. Control y seguimiento

- **F1.** El próximo control, ¿se indica como plazo ("en 1 mes y medio") o como fecha?
- **F2.** ¿Quién tiene que recibir el recordatorio del control: el cliente, la nutricionista o los dos?
- **F3.** ¿Qué le cuesta más al cliente para sostener la dieta?
- **F4.** ¿Qué información del cliente te serviría recibir entre un control y el siguiente? (por ejemplo: peso, materia fecal, si comió todo)
- **F5.** ¿Cada cuánto te serviría recibirla?

### G. Viandas y tienda

- **G1.** Una vianda armada, ¿se prepara a medida de la dieta de cada paciente, o son viandas estándar que se eligen según la dieta?
- **G2.** Si son a medida, ¿quién las prepara y con cuánta anticipación hay que pedirlas?
- **G3.** Si son estándar, ¿qué las diferencia entre sí? (especie, tamaño, enfermedad, tipo de carne)
- **G4.** ¿Una vianda cubre la ración completa del día, o el cliente tiene que agregarle algo? (suplementos, aceite, huevo)
- **G5.** ¿Sirve que el sitio calcule cuántas viandas hacen falta por semana o por mes según la dieta?
- **G6.** ¿El cliente que cocina en casa también tiene que poder comprar los ingredientes sueltos en la tienda?

### H. Entrega de la dieta

- **H1.** ¿El cliente necesita descargar o imprimir la dieta (PDF), o alcanza con verla en el sitio?

## Qué cambiaría en el sistema, en orden

1. **Contenido de la dieta**: grupos con alternativas, comidas por día, ficha del paciente (todo opcional), permitidos y prohibidos, instrucciones, transición y control. Reemplaza al contenido actual; la dieta de prueba que existe se convierte.
2. **Una dieta para un paciente**, y clonar también desde "Nueva dieta". Cambia RN-022 y RN-023 (hoy una misma dieta se asigna a varias mascotas) y amplía RN-027.
3. **Suplementos**, vinculados a productos del catálogo.
4. **Prohibidos por especie**, y que el catálogo y el carrito los usen.
5. **Viandas y cálculo de compra** (depende del bloque G).
6. **Seguimiento de la dieta** (**[A DEFINIR]**, depende del bloque F).
7. **PDF y fotos de referencia**, si hacen falta (H1, E3).

Lo que ya está hecho y se aprovecha: la lista única de alimentos, las versiones de una dieta, clonar, y las alergias y restricciones de cada mascota.

Con lo decidido se puede empezar por el punto 2. El punto 1 necesita al menos el bloque B.

## Qué queda fuera de esta propuesta

- Logo y firma del profesional en la dieta.
- La veterinaria que deriva al paciente.
- Avisos por email o WhatsApp (controles, cambios de dieta).
- Cómo un cliente se vuelve paciente de un nutricionista y qué datos puede ver el nutricionista (sigue pendiente).
- Cálculo automático de requerimientos nutricionales: el sitio guarda lo que formula el profesional, no formula.
