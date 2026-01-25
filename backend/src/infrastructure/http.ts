import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { DayLogRepository } from './repository';
import {
  ActivityIntensity,
  ActivityType,
  ISODate,
  MealContextTag,
  MealType,
  PortionSize,
} from '../domain/models';
import { computeDayDecisionSummary, computeWeightTrend } from '../domain/decisions';
import { buildDayTimeline } from '../domain/timeline';
import { generateCoachReply } from '../application/coach';
import { computeOverviewStats, listDeviationDays } from '../application/stats';
import { computeShoppingList } from '../application/shopping';

const mealSchema = z.object({
  type: z.custom<MealType>().transform(v => v as MealType),
  items: z.array(z.string()).default([]),
  portionSize: z.custom<PortionSize>().transform(v => v as PortionSize),
  contextTags: z.array(z.custom<MealContextTag>()).default([]),
});

const activitySchema = z.object({
  type: z.custom<ActivityType>().transform(v => v as ActivityType),
  durationMinutes: z.number().int().positive().optional(),
  distanceKm: z.number().positive().optional(),
  intensity: z.custom<ActivityIntensity>().transform(v => v as ActivityIntensity),
  caloriesBurned: z.number().positive().optional(),
  caloriesTotal: z.number().positive().optional(),
});

const weightSchema = z.object({
  weightKg: z.number().positive(),
});

const notesSchema = z.object({
  text: z.string().min(1),
});

const messageSchema = z.object({
  text: z.string().min(1),
});

const inventoryItemSchema = z.object({
  name: z.string().min(1),
  quantityApprox: z.number().positive().default(1),
  unit: z.string().optional(),
  expiresAt: z.string().optional(),
});

function isIsoDate(value: string): value is ISODate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function offsetIsoDate(base: ISODate, deltaDays: number): ISODate {
  const [yearStr, monthStr, dayStr] = base.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function buildHttpApp(repo: DayLogRepository) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Configuración simple de subida de imágenes a carpeta local "uploads"
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const upload = multer({ dest: uploadsDir });

  // Healthcheck simple
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'movio-backend' });
  });

  // Registrar comida
  app.post('/days/:day/meals', async (req, res) => {
    const day = req.params.day;
    if (!isIsoDate(day)) {
      return res.status(400).json({ error: 'Formato de día inválido, esperado YYYY-MM-DD' });
    }
    const parseResult = mealSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parseResult.error.issues });
    }
    const body = parseResult.data;
    const id = `meal_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();

    await repo.upsertMeal(day, {
      id,
      day,
      type: body.type,
      kind: 'real',
      items: body.items,
      portionSize: body.portionSize,
      contextTags: body.contextTags,
      createdAt,
    });

    const dayLog = (await repo.getDay(day))!;
    const decision = computeDayDecisionSummary(dayLog);

    res.status(201).json({
      day: dayLog,
      decision,
    });
  });

  // Registrar comida planificada (plan del día)
  app.post('/days/:day/meals/plan', async (req, res) => {
    const day = req.params.day;
    if (!isIsoDate(day)) {
      return res.status(400).json({ error: 'Formato de día inválido, esperado YYYY-MM-DD' });
    }
    const parseResult = mealSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parseResult.error.issues });
    }
    const body = parseResult.data;
    const id = `meal_plan_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();

    await repo.upsertMeal(day, {
      id,
      day,
      type: body.type,
      kind: 'plan',
      items: body.items,
      portionSize: body.portionSize,
      contextTags: body.contextTags,
      createdAt,
    });

    const dayLog = (await repo.getDay(day))!;
    const decision = computeDayDecisionSummary(dayLog);

    res.status(201).json({
      day: dayLog,
      decision,
    });
  });

  // Registrar actividad
  app.post('/days/:day/activities', async (req, res) => {
    const day = req.params.day;
    if (!isIsoDate(day)) {
      return res.status(400).json({ error: 'Formato de día inválido, esperado YYYY-MM-DD' });
    }
    const parseResult = activitySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parseResult.error.issues });
    }
    const body = parseResult.data;
    const id = `act_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();

    await repo.upsertActivity(day, {
      id,
      day,
      type: body.type,
      durationMinutes: body.durationMinutes,
      distanceKm: body.distanceKm,
      intensity: body.intensity,
      caloriesBurned: body.caloriesBurned,
      caloriesTotal: body.caloriesTotal,
      createdAt,
    });

    const dayLog = (await repo.getDay(day))!;
    const decision = computeDayDecisionSummary(dayLog);

    res.status(201).json({
      day: dayLog,
      decision,
    });
  });

  // Registrar actividad a partir de una imagen (stub, futuro reconocimiento por visión)
  app.post(
    '/days/:day/activities/from-image',
    upload.single('image'),
    async (req, res) => {
      const day = req.params.day;
      if (!isIsoDate(day)) {
        return res
          .status(400)
          .json({ error: 'Formato de día inválido, esperado YYYY-MM-DD' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Se requiere un archivo de imagen en el campo "image"' });
      }

      const id = `act_img_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const createdAt = new Date().toISOString();

      // TODO: aquí se debería llamar a un servicio de visión (ChatGPT con imágenes u otro)
      // para extraer tipo de actividad, duración, distancia, etc. Por ahora usamos valores neutros.

      await repo.upsertActivity(day, {
        id,
        day,
        type: 'otro',
        durationMinutes: 30,
        intensity: 'media',
        attachmentPath: req.file.path,
        createdAt,
      });

      const dayLog = (await repo.getDay(day))!;
      const decision = computeDayDecisionSummary(dayLog);

      res.status(201).json({
        activity: {
          id,
          day,
          type: 'otro',
          durationMinutes: 30,
          intensity: 'media',
          attachmentPath: req.file.path,
          createdAt,
        },
        decision,
        recognition: {
          status: 'stub',
          message:
            'La actividad se registró a partir de la imagen. En una versión futura se leerán los datos exactos de la captura.',
        },
      });
    },
  );

  // Registrar peso
  app.post('/days/:day/weight', async (req, res) => {
    const day = req.params.day;
    if (!isIsoDate(day)) {
      return res.status(400).json({ error: 'Formato de día inválido, esperado YYYY-MM-DD' });
    }
    const parseResult = weightSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parseResult.error.issues });
    }
    const body = parseResult.data;
    const createdAt = new Date().toISOString();

    await repo.upsertWeight(day, {
      day,
      weightKg: body.weightKg,
      createdAt,
    });

    const dayLog = (await repo.getDay(day))!;
    const decision = computeDayDecisionSummary(dayLog);

    res.status(201).json({
      day: dayLog,
      decision,
    });
  });

  // Registrar nota
  app.post('/days/:day/notes', async (req, res) => {
    const day = req.params.day;
    if (!isIsoDate(day)) {
      return res.status(400).json({ error: 'Formato de día inválido, esperado YYYY-MM-DD' });
    }
    const parseResult = notesSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parseResult.error.issues });
    }
    const body = parseResult.data;
    const createdAt = new Date().toISOString();

    await repo.upsertNotes(day, {
      day,
      text: body.text,
      createdAt,
    });

    const dayLog = (await repo.getDay(day))!;
    const decision = computeDayDecisionSummary(dayLog);

    res.status(201).json({
      day: dayLog,
      decision,
    });
  });

  // Obtener un día con estado
  app.get('/days/:day', async (req, res) => {
    const day = req.params.day;
    if (!isIsoDate(day)) {
      return res.status(400).json({ error: 'Formato de día inválido, esperado YYYY-MM-DD' });
    }
    const dayLog = await repo.getDay(day);
    if (!dayLog) {
      return res.status(404).json({ error: 'Día no encontrado' });
    }
    const decision = computeDayDecisionSummary(dayLog);
    res.json({ day: dayLog, decision });
  });

  // Timeline del día (para vista tipo chat)
  app.get('/days/:day/timeline', async (req, res) => {
    const day = req.params.day;
    if (!isIsoDate(day)) {
      return res.status(400).json({ error: 'Formato de día inválido, esperado YYYY-MM-DD' });
    }
    const existing = await repo.getDay(day);
    const dayLog =
      existing ??
      ({
        day,
        meals: [],
        activities: [],
      } as const);
    const messages = await repo.listCoachMessages(day);
    const events = buildDayTimeline(dayLog, messages);
    res.json({ day: dayLog, events });
  });

  // Mensaje al coach (stub simple que en el futuro usará AI)
  app.post('/days/:day/messages', async (req, res) => {
    const day = req.params.day;
    if (!isIsoDate(day)) {
      return res.status(400).json({ error: 'Formato de día inválido, esperado YYYY-MM-DD' });
    }
    const parseResult = messageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parseResult.error.issues });
    }
    const body = parseResult.data;

    const dayLog = await repo.getDay(day);

    // Historial reciente para que el coach pueda responder preguntas tipo "cómo vengo"
    const rangeTo = day;
    const rangeFrom = offsetIsoDate(day, -6);
    const recentDays = await repo.listDays(rangeFrom, rangeTo);

    const weightEntries = await repo.listWeightEntries();
    const weightTrend = computeWeightTrend(weightEntries);

    const replyText = await generateCoachReply({
      dayLog,
      userMessage: body.text,
      recentDays,
      rangeFrom,
      rangeTo,
      weightTrendDirection: weightTrend.direction,
    });

    const id = `coach_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();

    await repo.addCoachMessage(day, {
      id,
      day,
      createdAt,
      text: replyText,
    });

    res.status(201).json({
      message: {
        id,
        day,
        createdAt,
        text: replyText,
      },
    });
  });

  // Resumen de rango de días (para historial y KPIs).
  app.get('/summary', async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    if (!from || !to || !isIsoDate(from) || !isIsoDate(to)) {
      return res.status(400).json({
        error: 'Parámetros inválidos, se esperan ?from=YYYY-MM-DD&to=YYYY-MM-DD',
      });
    }

    const days = await repo.listDays(from, to);
    const summaries = days.map(d => ({
      day: d.day,
      decision: computeDayDecisionSummary(d),
    }));

    const weightEntries = await repo.listWeightEntries();
    const weightTrend = computeWeightTrend(weightEntries);

    res.json({
      days: summaries,
      weightTrend,
    });
  });

  // Inventario simple de alimentos disponibles (sobras / stock)
  app.post('/inventory', async (req, res) => {
    const parseResult = inventoryItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parseResult.error.issues });
    }
    const body = parseResult.data;
    const id = `inv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toISOString();

    await repo.addInventoryItem({
      id,
      name: body.name,
      quantityApprox: body.quantityApprox,
      unit: body.unit,
      expiresAt: body.expiresAt,
      createdAt,
    });

    res.status(201).json({ id, createdAt });
  });

  app.get('/inventory', async (_req, res) => {
    const items = await repo.listInventory();
    res.json({ items });
  });

  // Stats de alto nivel y días con desvíos
  app.get('/stats/overview', async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    if (!from || !to || !isIsoDate(from) || !isIsoDate(to)) {
      return res.status(400).json({
        error: 'Parámetros inválidos, se esperan ?from=YYYY-MM-DD&to=YYYY-MM-DD',
      });
    }

    const days = await repo.listDays(from, to);
    const overview = computeOverviewStats(from, to, days);

    res.json({ overview });
  });

  app.get('/stats/deviations', async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    if (!from || !to || !isIsoDate(from) || !isIsoDate(to)) {
      return res.status(400).json({
        error: 'Parámetros inválidos, se esperan ?from=YYYY-MM-DD&to=YYYY-MM-DD',
      });
    }

    const days = await repo.listDays(from, to);
    const deviations = listDeviationDays(days);

    res.json({ deviations });
  });

  // Sugerencia de lista de compras para los próximos N días
  app.get('/shopping-list', async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const forDaysRaw = req.query.forDays as string | undefined;

    if (!from || !to || !isIsoDate(from) || !isIsoDate(to)) {
      return res.status(400).json({
        error: 'Parámetros inválidos, se esperan ?from=YYYY-MM-DD&to=YYYY-MM-DD',
      });
    }

    const forDaysParsed = forDaysRaw ? Number(forDaysRaw) : 3;
    const forDays = Number.isFinite(forDaysParsed) && forDaysParsed > 0 ? Math.min(forDaysParsed, 7) : 3;

    const days = await repo.listDays(from, to);
    const inventory = await repo.listInventory();

    const shoppingList = computeShoppingList(from, to, days, inventory, forDays);

    res.json({ shoppingList });
  });

  return app;
}

