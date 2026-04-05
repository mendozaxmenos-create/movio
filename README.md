## Movio — Hábitos y salud en la vida real

Movio es un acompañante diario de hábitos y salud, no una app de dieta. Está pensada para personas que quieren **vivir mejor todos los días** sin obsesionarse con calorías, balanzas ni prohibiciones.

Como usuario, Movio te ayuda a:

- **Registrar tu día de forma simple**: qué comiste, qué ejercicio hiciste, cómo dormiste o cómo te sentís.
- **Tomar mejores decisiones en contexto**: qué conviene almorzar si a la noche tenés un asado, cómo usar las sobras sin salir del plan, qué comer cuando tenés hambre a media tarde.
- **Ver la película completa, no una foto suelta**: tendencia de peso en semanas, consistencia de actividad, días en los que te desviaste y si los corregiste.

Todo con lenguaje calmo, sin culpa y sin juicios.

Este repositorio contiene el MVP técnico de Movio con foco en:

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
- `web/` — app web móvil (Vite + React + Tailwind) con:
  - Pantalla `Hoy` tipo chat (timeline + acciones rápidas)
  - Pantalla `Peso` (dashboard de métricas, gráfico Recharts, objetivo y proyección)
  - Pantalla `Compras` (inventario + lista sugerida)
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
- `GET /shopping-list?from&to&forDays` — sugerencia de lista de compras mínima en base a tu consumo real y al inventario

**Peso (REST + analítica)**

- `GET /weights` / `POST /weights` — listar y crear `{ date, weight }` (compat. con modelo `{ id, date, weight }` usando `id` = fecha)
- `DELETE /weights/:id` — borrar por fecha `YYYY-MM-DD`
- `GET /weight/insights` — métricas, alertas, coach automático, objetivo y tendencia (lógica en `domain/weightAnalytics.ts`)
- `GET /weight/projection` — pendiente (kg/día) y estimaciones a 7 / 14 / 30 días
- `GET /settings` / `PUT /settings` — `targetWeightKg` y `startingWeightKg` opcionales (`null` limpia el campo)

Persistencia:

- **Sin `DATABASE_URL`**: archivo local `data/movio-data.json` (desarrollo).
- **Con `DATABASE_URL`**: PostgreSQL en la nube (Neon, Vercel Postgres, Supabase, etc.). El backend guarda un snapshot JSON en la tabla `movio_snapshot` (misma forma que el archivo local).

La web **no usa `localStorage`** para peso ni datos: todo pasa por la API.

### Vercel (frontend) + API en la nube

1. Creá una base **Postgres** (Neon gratis, o [Vercel Storage → Postgres](https://vercel.com/docs/storage/vercel-postgres)) y copiá la cadena `DATABASE_URL`.
2. Desplegá el **backend** donde puedas correr Node (Render, Railway, Fly.io, etc.) y definí ahí `DATABASE_URL` y opcionalmente `SKIP_SEED=1` para no cargar datos de demo en producción.
3. En el proyecto **Vercel de la web**, en Environment Variables, definí `VITE_API_BASE_URL` con la URL pública de esa API (ej. `https://movio-api.onrender.com`).
4. Rebuild del frontend. Ver `web/.env.example` y `backend/.env.example`.

---

## Cómo correr el proyecto localmente

### Backend

- Requisitos: Node 18+.
- Comandos:

```bash
cd backend
npm install
npm run dev  # backend en http://localhost:4000
```

Los datos (días, peso, inventario) se guardan en `data/movio-data.json` y se mantienen entre reinicios mientras uses la misma carpeta.

### Web (Hoy, Peso, Compras)

```bash
cd web
npm install
npm run dev  # web en http://localhost:5173
```

La web asume por defecto que el backend corre en `http://localhost:4000` (`VITE_API_BASE_URL`). Si no hay mediciones guardadas, el backend inserta un seed de demo al iniciar.

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

