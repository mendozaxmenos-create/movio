# Backlog Movio — pendientes

Última revisión: alineado con el estado del repo (web Vercel, API Render/Node, Postgres vía `DATABASE_URL`).

---

## En curso / corto plazo

| Item | Detalle |
|------|---------|
| **CORS en producción** | Restringir `cors()` al dominio de Vercel (y previews si aplica); hoy está abierto. |
| **Variables y docs** | Unificar checklist deploy (Vercel + Render + Neon) en un solo doc si hace falta. |
| **Cold start Render** | Documentar para usuarios que el primer request puede tardar ~30–60 s en plan gratis. |

---

## Producto

| Prioridad | Item | Notas |
|-----------|------|--------|
| Alta | **Coach con LLM** | Reemplazar stub en `application/coach.ts` por API (OpenAI u otro) con contexto de día + peso + historial. |
| Alta | **Persistir mensajes del coach** | Hoy el snapshot guarda `coachMessages: []`; los mensajes no sobreviven al reinicio en Postgres igual que en JSON local. Extender snapshot o tabla aparte. |
| Media | **Notificaciones** | Recordatorios (web push o futuro móvil). |
| Media | **Importación masiva de pesos** | CSV o pegar lista `fecha,kg` para cargar historial sin un guardado por día. |
| Media | **UX “cómo vengo”** | Alinear con `docs/ux.md`: estado 🟢🟡🔴 más visible en cabecera si aplica. |
| Media | **Foto de la comida → detección** | Subir imagen de lo que se está comiendo y que un modelo con visión (tipo ChatGPT) describa / estime plato y contexto; guardar como comida o borrador. Requiere API de visión + flujo en `TodayScreen` (hoy solo texto). |
| Media | **Captura de ejercicio → calorías / datos** | Subir screenshot del reloj, app de gym o resumen (como en ChatGPT) y extraer kcal, duración, distancia, etc. Hoy existe stub `POST /days/:day/activities/from-image` en `http.ts` que crea actividad genérica; reemplazar por parsing con visión + confirmación del usuario. |
| Baja | **Módulos hábitos / nutrición** | Placeholders en `backend/src/modules/`; definir modelo y rutas. |

---

## Técnico / deuda

| Item | Detalle |
|------|---------|
| **Multer** | Evaluar subida a 2.x (avisos de seguridad en `npm audit`). |
| **Tests** | API (peso, timeline) y smoke del front. |
| **CI** | GitHub Actions: `npm run build` en `web` y `backend`. |
| **Esquema SQL** | Hoy: snapshot JSON en `movio_snapshot`. Opcional: tablas normalizadas si el producto crece. |
| **Seed en producción** | Ya existe `SKIP_SEED=1`; revisar que demos no se carguen por error en prod. |

---

## Ideas ya cubiertas (referencia)

- Web en Vercel (`web/`, root `web`, `VITE_API_BASE_URL`).
- API pública + Postgres (Neon, etc.).
- Peso con fechas pasadas, dashboard Peso, insights y proyección.
- Sin `localStorage` para datos de negocio.

---

## Referencias README históricas

- Cliente **Expo** + sync offline (idea futura).
- **Dominio propio** en Vercel ya gestionable desde Settings → Domains.
