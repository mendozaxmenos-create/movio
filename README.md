## Movio — MVP Hábitos y Salud

Movio es un acompañante diario de hábitos y salud, no una app de dieta. Este repositorio contiene el MVP con foco en:

- **Registro diario rápido**
- **Motor de decisiones sin juicio (verde / amarillo / rojo)**
- **Tendencias de peso y consistencia de actividad**
- **Arquitectura modular preparada para mobile y futuras integraciones AI**

### Filosofía del producto

- **Consistencia > perfección**
- **Decisiones > números**
- **Eventos sociales y sobras son parte del plan**
- **Nada de culpa, juicio o lenguaje punitivo**

Ejemplos de copy:

- “Día bien gestionado.”
- “Desvío corregido.”
- “Consistencia mantenida.”

---

## Arquitectura del MVP

El repo se organiza en capas claras:

- `backend/` — API Node + TypeScript con arquitectura modular
  - `src/domain/` — modelos de dominio y motor de decisiones
  - `src/application/` — casos de uso (registro, consulta, KPIs)
  - `src/infrastructure/` — HTTP, persistencia, wiring
- `docs/` — diseño de pantallas, flujos y notas de producto

Pensado para:

- **Mobile first** (futuro cliente Expo/React Native que consuma esta API)
- **Offline-first** en cliente (sincronización futura vía endpoints idempotentes)
- **Integración futura de AI coach** (comentarios sobre el día y sugerencias)

---

## Modelo de dominio (resumen)

### Día (`DayLog`)

Un día es la unidad central de Movio.

- Fecha (YYYY-MM-DD)
- Comidas
- Actividades
- Peso (opcional, máx. 1 por día)
- Notas (texto libre)
- Estado calculado (verde / amarillo / rojo)

### Comidas (`Meal`)

- Tipo: desayuno, almuerzo, snack, cena, otro
- Ítems: texto libre (lista corta)
- Tamaño de porción: chico / medio / grande
- Tags de contexto:
  - `normal`
  - `evento_social`
  - `uso_sobras`
  - `no_planificado`
  - `recuperacion`

> **Importante**: no se cuentan calorías ni macros. La clave es el contexto y las decisiones.

### Actividad (`ActivitySession`)

- Tipo: bici, caminata, natación, gym, otro
- Duración (minutos)
- Distancia (opcional)
- Intensidad: baja / media / alta
- Calorías (opcional)

### Peso (`WeightEntry`)

- Fecha
- Peso (kg)

La app calcula:

- Promedio móvil 7 días
- Tendencia: baja / estable / sube

### KPIs de comportamiento

Definidos a nivel de semana o rango:

- Días registrados
- Días “en plan”
- Días con desvíos gestionados
- Días con desvíos no gestionados
- Consistencia de actividad
- Calidad de distribución de comidas
- Frecuencia de sobre-ingesta nocturna

---

## Motor de decisiones diario (estado del día)

Cada día recibe un estado:

- 🟢 **Verde** — “en camino / día bien gestionado”
- 🟡 **Amarillo** — “hubo desvíos, pero se gestionaron en parte”
- 🔴 **Rojo** — “desvío no gestionado (o el día quedó en blanco)”

Reglas iniciales (MVP, ajustables):

- **Eventos sociales** (`evento_social`) y **uso de sobras** (`uso_sobras`) NO cuentan como fallo.
- `no_planificado` marca un desvío.
- `recuperacion` marca una corrección (por ejemplo, ajustar siguiente comida o porción).

Heurística base:

- Si no hay ningún registro → sin estado / neutro.
- Si hay registros y **no hay desvíos (`no_planificado`)** → 🟢 Verde.
- Si hay desvíos y también al menos una `recuperacion` en el mismo día → 🟡 Amarillo (desvío gestionado).
- Si hay desvíos sin ninguna recuperación y poca actividad → 🔴 Rojo (desvío no gestionado).

El lenguaje en la UI siempre será:

- “Día bien gestionado.”
- “Desvío corregido.”
- “Hoy costó un poco más, mañana lo seguimos.”

Nunca:

- “Fallaste”
- “Mala elección”
- “Fracaso”

---

## Pantallas principales (MVP)

Ver detalles en `docs/ux.md`, pero el MVP incluye:

- **Hoy**
  - Estado del día (punto verde/amarillo/rojo + frase corta)
  - Botones rápidos: “Registrar comida”, “Registrar actividad”, “Registrar peso”, “Nota”
  - Resumen del día (comidas, actividad, peso, breve feedback)
- **Registrar comida**
  - Tipo de comida
  - Ítems (texto libre)
  - Tamaño de porción (chips grandes)
  - Tag de contexto (chips)
  - Guardar en un toque
- **Registrar actividad**
  - Tipo
  - Duración
  - Intensidad
  - (Opcional) distancia y calorías
- **Peso & Tendencia**
  - Campo simple de peso
  - Gráfico ligero de 7 días (futuro)
  - Etiqueta de tendencia (baja / estable / sube) con lenguaje neutro
- **Historial**
  - Lista tipo calendario con punto de color por día
  - Tap para ver detalle

---

## Backend (resumen)

El backend expone una API REST simple:

- `POST /days/:date/meals` — registrar comida
- `POST /days/:date/meals/plan` — registrar comida planificada (ej. “esto es lo que voy a cenar”)
- `POST /days/:date/activities` — registrar actividad
- `POST /days/:date/weight` — registrar peso
- `GET /days/:date` — obtener día con estado y KPIs base
- `GET /summary` — KPIs de rango (ej. última semana)
- `GET /days/:date/timeline` — timeline del día (comidas, actividad, peso, nota, mensajes del coach)
- `POST /days/:date/messages` — enviar mensaje al coach (stub, futuro AI)
- `POST /inventory` / `GET /inventory` — inventario simple de alimentos / sobras
- `GET /stats/overview` — resumen de días y estados en un rango
- `GET /stats/deviations` — listado de días con desvíos y si hubo recuperación

Persistencia:

- MVP: repositorio en memoria (para simplicidad)
- Futuro: Supabase / Postgres con sync preparado (IDs de cliente, timestamps, `deletedAt`)

---

## Próximos pasos sugeridos

- **Expo + Supabase**
  - Crear app móvil Expo usando esta API como base de dominio.
  - Implementar caché local (AsyncStorage) + sincronización optimista.
- **AI Coach**
  - Endpoint que, dado el resumen diario + últimas 2 semanas, genere un mensaje corto y calmo.
  - Guardar estos mensajes junto al `DayLog`.
- **Notificaciones**
  - Recordatorios suaves para registrar al final del día o después de eventos clave.
- **Modelo de datos exacto**
  - Migrar interfaces de dominio a esquemas persistentes (SQL / Supabase).

