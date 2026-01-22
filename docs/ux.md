## UX Movio — MVP

Principios:

- **Registro en < 30 segundos**
- **Lenguaje calmo, adulto, sin culpa**
- **Pocas pantallas, acciones claras**

---

## Pantalla: Hoy

- **Objetivo**: que la persona entienda “cómo viene el día” y pueda registrar rápido.
- Elementos:
  - Cabecera con fecha y estado del día:
    - Punto 🟢🟡🔴 + texto corto:
      - Verde: “Día bien gestionado.”
      - Amarillo: “Desvío corregido.”
      - Rojo: “Hoy costó un poco más, mañana lo seguimos.”
  - Bloque de acciones rápidas (botones grandes):
    - “Registrar comida”
    - “Registrar actividad”
    - “Registrar peso”
    - “Agregar nota”
  - Resumen del día:
    - Lista de comidas (tipo, contexto, porción)
    - Actividad total (minutos + intensidad principal)
    - Peso del día (si existe) + frase sobre tendencia (baja / estable / sube)

Interacciones clave:

- Tap en “Registrar comida” abre modal o pantalla simple.
- Tap en estado del día abre detalle con explicación corta (sin juicio).

---

## Pantalla: Registrar comida

- **Objetivo**: registrar una comida en menos de 20 segundos.
- Campos:
  - Tipo de comida (chips): Desayuno, Almuerzo, Snack, Cena, Otro.
  - Ítems (campo de texto libre corto, placeholder “ej: 2 empanadas, ensalada simple”).
  - Tamaño de porción (chips grandes): Chico, Medio, Grande.
  - Contexto (chips con explicación corta):
    - Normal
    - Evento social
    - Uso de sobras
    - No planificado
    - Recuperación
- Botones:
  - “Guardar” (primario)
  - “Cancelar” (texto)

Ejemplos de copy contextual:

- Debajo de “Recuperación”: “Por ej. cena más ligera después de un almuerzo grande.”
- Mensaje después de guardar:
  - Caso normal: “Comida registrada. Día bien gestionado.”
  - Caso con `no_planificado` + `recuperacion`: “Desvío corregido. Eso es lo que construye consistencia.”

---

## Pantalla: Registrar actividad

- Campos:
  - Tipo: Bici, Caminata, Natación, Gym, Otro.
  - Duración (minutos).
  - Intensidad: Baja, Media, Alta.
  - (Opcional) Distancia.
  - (Opcional) Calorías (manual o futuro sync).
- Mensajes ejemplo:
  - Después de guardar: “Actividad sumada. Consistencia mantenida.”

---

## Pantalla: Peso & Tendencia

- Elementos:
  - Campo simple de peso de hoy (en kg).
  - Texto: “Solo miramos la tendencia, no el número de hoy.”
  - Indicador de tendencia:
    - Flecha hacia abajo + “Tendencia a la baja.”
    - Flecha lateral + “Tendencia estable.”
    - Flecha hacia arriba + “Tendencia al alza (normal, puede ser agua, comida, etc.).”
  - (Futuro) gráfico muy simple de los últimos 14 días.

Reglas de copy:

- Evitar:
  - “Subiste de peso”
  - “Bajaste poco”
- Usar:
  - “Lo importante es la dirección en varias semanas.”
  - “Un día no dice nada, seguimos sumando decisiones.”

---

## Pantalla: Historial

- Lista de días (tipo calendario compacto o lista):
  - Cada día muestra:
    - Fecha
    - Punto de color (verde / amarillo / rojo)
    - Breve resumen (ej: “2 comidas normales, 1 evento social, caminata 30 min”)
- Filtros futuros:
  - Ver solo días con actividad
  - Ver solo días con eventos sociales

Tap en un día → abre detalle del día con:

- Lista completa de comidas y contextos.
- Actividad registrada.
- Peso (si lo hay) + punto de la curva de tendencia.

---

## Flujo core: registrar día típico

1. Persona abre Movio a la mañana:
   - Nota el estado neutro o verde si ya hay registros previos.
2. Almuerza y registra:
   - Tap “Registrar comida” → elige Almuerzo, escribe 2-3 ítems, elige porción y contexto “normal”.
3. Más tarde hay un evento social:
   - Registra Snack/Cena con contexto “evento social”.
4. A la noche hace una cena ligera:
   - Registra Cena con porción “chico” y contexto “recuperacion”.
5. El día termina en 🟡 Amarillo con mensaje: “Desvío corregido. Eso es consistencia.”

---

## TODOs UX futuros

- Microcopys específicos según combinación de tags (ej. sobras + recuperación).
- Modo oscuro.
- Animaciones suaves al cambiar de estado de día.
- Asistente AI:
  - Mensaje corto de cierre de día basado en los datos + histórico de 2 semanas.
  - Sugerencia de foco para mañana (ej: “priorizar caminata corta después de almuerzo”). 

