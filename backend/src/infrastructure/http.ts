import express from 'express';
import cors from 'cors';
import { z } from 'zod';
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
  durationMinutes: z.number().int().positive(),
  distanceKm: z.number().positive().optional(),
  intensity: z.custom<ActivityIntensity>().transform(v => v as ActivityIntensity),
  calories: z.number().positive().optional(),
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

export function buildHttpApp(repo: DayLogRepository) {
  const app = express();
  app.use(cors());
  app.use(express.json());

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
      calories: body.calories,
      createdAt,
    });

    const dayLog = (await repo.getDay(day))!;
    const decision = computeDayDecisionSummary(dayLog);

    res.status(201).json({
      day: dayLog,
      decision,
    });
  });

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
    const dayLog = await repo.getDay(day);
    if (!dayLog) {
      return res.status(404).json({ error: 'Día no encontrado' });
    }
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

    const replyText = await generateCoachReply({
      dayLog,
      userMessage: body.text,
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

