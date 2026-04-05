import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { AppSettings, WeightEntry, WeightTrendDirection } from './models';

export type WeightTrendLabel = 'bajando' | 'subiendo' | 'estable';

export interface WeightMetrics {
  currentWeightKg: number | null;
  currentDate: string | null;
  avg7dKg: number | null;
  diffVsPreviousDayKg: number | null;
  weeklyChangeKg: number | null;
}

export interface WeightAlert {
  type: 'spike_up' | 'stagnation';
  message: string;
  deltaKg?: number;
  daysSinceDecrease?: number;
}

export interface GoalProgress {
  targetWeightKg: number;
  startingWeightKg: number;
  progressPercent: number;
  remainingKg: number;
}

export interface WeightInsightsResult {
  trend: WeightTrendLabel;
  trendFromRegression: WeightTrendDirection | 'insuficiente_datos';
  metrics: WeightMetrics;
  goal: GoalProgress | null;
  alerts: WeightAlert[];
  coachMessage: string;
}

export interface ProjectionResult {
  slopeKgPerDay: number | null;
  method: 'linear_regression';
  basedOnEntries: number;
  lastWeightKg: number | null;
  lastDate: string | null;
  projectedKg: {
    days7: number | null;
    days14: number | null;
    days30: number | null;
  };
}

function sortEntries(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

function daysBetweenIso(a: string, b: string): number {
  return Math.abs(differenceInCalendarDays(parseISO(a), parseISO(b)));
}

/** Regresión lineal simple: x = índice de día desde la primera medición, y = peso */
export function linearRegressionSlopeKgPerDay(entries: WeightEntry[]): number | null {
  const sorted = sortEntries(entries);
  if (sorted.length < 2) return null;
  const t0 = parseISO(sorted[0].day).getTime();
  const xs: number[] = [];
  const ys: number[] = [];
  for (const e of sorted) {
    const x = (parseISO(e.day).getTime() - t0) / (1000 * 60 * 60 * 24);
    xs.push(x);
    ys.push(e.weightKg);
  }
  const n = xs.length;
  let sumT = 0;
  let sumW = 0;
  let sumTW = 0;
  let sumTT = 0;
  for (let i = 0; i < n; i++) {
    sumT += xs[i];
    sumW += ys[i];
    sumTW += xs[i] * ys[i];
    sumTT += xs[i] * xs[i];
  }
  const denom = n * sumTT - sumT * sumT;
  if (denom === 0) return null;
  const slope = (n * sumTW - sumT * sumW) / denom;
  return Number.isFinite(slope) ? slope : null;
}

export function classifyTrendLabel(slopeKgPerDay: number | null): WeightTrendLabel {
  if (slopeKgPerDay === null) return 'estable';
  const t = 0.015;
  if (slopeKgPerDay < -t) return 'bajando';
  if (slopeKgPerDay > t) return 'subiendo';
  return 'estable';
}

function mapToWeightTrendDirection(label: WeightTrendLabel): WeightTrendDirection | 'insuficiente_datos' {
  if (label === 'bajando') return 'baja';
  if (label === 'subiendo') return 'sube';
  if (label === 'estable') return 'estable';
  return 'insuficiente_datos';
}

function computeAvg7d(sorted: WeightEntry[]): number | null {
  if (sorted.length === 0) return null;
  const lastDay = sorted[sorted.length - 1].day;
  const from = addDaysIso(lastDay, -6);
  const inWindow = sorted.filter(e => e.day >= from && e.day <= lastDay);
  if (inWindow.length === 0) return null;
  const sum = inWindow.reduce((s, e) => s + e.weightKg, 0);
  return Number((sum / inWindow.length).toFixed(2));
}

function addDaysIso(iso: string, delta: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysSinceLastDecrease(sorted: WeightEntry[]): number {
  if (sorted.length === 0) return 0;
  let lastDecreaseIndex = -1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].weightKg < sorted[i - 1].weightKg) {
      lastDecreaseIndex = i;
    }
  }
  const refDay = sorted[sorted.length - 1].day;
  if (lastDecreaseIndex <= 0) {
    return daysBetweenIso(sorted[0].day, refDay);
  }
  return daysBetweenIso(sorted[lastDecreaseIndex].day, refDay);
}

function computeGoal(
  sorted: WeightEntry[],
  settings: AppSettings,
): GoalProgress | null {
  if (settings.targetWeightKg === undefined || settings.targetWeightKg === null) return null;
  if (sorted.length === 0) return null;
  const current = sorted[sorted.length - 1];
  const startKg =
    settings.startingWeightKg !== undefined && settings.startingWeightKg !== null
      ? settings.startingWeightKg
      : sorted[0].weightKg;
  const target = settings.targetWeightKg;
  const currentKg = current.weightKg;

  const losing = target < startKg;
  if (!losing) {
    const remaining = Math.abs(target - currentKg);
    const span = Math.abs(startKg - target) || 1;
    const raw = ((currentKg - startKg) / span) * 100;
    const progressPercent = Math.min(100, Math.max(0, Number(raw.toFixed(1))));
    return {
      targetWeightKg: target,
      startingWeightKg: startKg,
      progressPercent,
      remainingKg: Number(remaining.toFixed(2)),
    };
  }

  const totalDrop = startKg - target;
  const done = startKg - currentKg;
  const progressPercent =
    totalDrop === 0 ? 0 : Math.min(100, Math.max(0, Number(((done / totalDrop) * 100).toFixed(1))));
  const remainingKg = Number(Math.max(0, currentKg - target).toFixed(2));
  return {
    targetWeightKg: target,
    startingWeightKg: startKg,
    progressPercent,
    remainingKg,
  };
}

function buildAlerts(sorted: WeightEntry[], stagnationThresholdDays: number): WeightAlert[] {
  const alerts: WeightAlert[] = [];
  if (sorted.length >= 2) {
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const delta = last.weightKg - prev.weightKg;
    if (delta > 1) {
      alerts.push({
        type: 'spike_up',
        message: `Subida fuerte: +${delta.toFixed(1)} kg respecto al registro anterior. Vale la pena revisar hidratación, comidas recientes o el momento del día.`,
        deltaKg: Number(delta.toFixed(2)),
      });
    }
  }
  const d = daysSinceLastDecrease(sorted);
  if (sorted.length >= 2 && d > stagnationThresholdDays) {
    alerts.push({
      type: 'stagnation',
      message: `Llevas más de ${stagnationThresholdDays} días sin una bajada en la balanza. Puede ser normal; seguí midiendo con el mismo criterio.`,
      daysSinceDecrease: d,
    });
  }
  return alerts;
}

function buildCoachMessage(
  trend: WeightTrendLabel,
  metrics: WeightMetrics,
  alerts: WeightAlert[],
  weeklyChangeKg: number | null,
): string {
  const parts: string[] = [];
  if (alerts.some(a => a.type === 'spike_up')) {
    parts.push('Ojo con esta subida: conviene mirar el contexto (comida, sodio, sueño) sin dramatizar.');
  }
  if (alerts.some(a => a.type === 'stagnation')) {
    parts.push('Hay estancamiento reciente: a veces el cuerpo fija un plateau antes de seguir.');
  }
  if (trend === 'bajando') {
    parts.push('Vas bien: la tendencia general apunta a la baja.');
  } else if (trend === 'subiendo') {
    parts.push('La tendencia reciente sube: podés ajustar hábitos suaves si buscás bajar de peso.');
  } else {
    parts.push('La tendencia está estable: buen momento para afianzar rutinas.');
  }
  if (weeklyChangeKg !== null && weeklyChangeKg < -0.1) {
    parts.push('Buen ritmo semanal para seguir acumulando progreso.');
  } else if (weeklyChangeKg !== null && weeklyChangeKg > 0.15) {
    parts.push('El ritmo semanal sube un poco: observalo sin juicio, con datos.');
  }
  if (metrics.diffVsPreviousDayKg !== null) {
    const d = metrics.diffVsPreviousDayKg;
    if (d < -0.05) parts.push('Respecto al día anterior, bajaste un poco.');
    else if (d > 0.05) parts.push('Respecto al día anterior, subiste un poco.');
  }
  return parts.length > 0 ? [...new Set(parts)].join(' ') : 'Seguí registrando: con más datos, el mensaje será más preciso.';
}

export function computeWeightProjection(entries: WeightEntry[]): ProjectionResult {
  const sorted = sortEntries(entries);
  const slope = linearRegressionSlopeKgPerDay(sorted);
  const last = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const project = (days: number): number | null => {
    if (last === null || slope === null) return null;
    return Number((last.weightKg + slope * days).toFixed(2));
  };
  return {
    slopeKgPerDay: slope !== null ? Number(slope.toFixed(4)) : null,
    method: 'linear_regression',
    basedOnEntries: sorted.length,
    lastWeightKg: last?.weightKg ?? null,
    lastDate: last?.day ?? null,
    projectedKg: {
      days7: project(7),
      days14: project(14),
      days30: project(30),
    },
  };
}

export function computeWeightInsights(
  entries: WeightEntry[],
  settings: AppSettings,
): WeightInsightsResult {
  const sorted = sortEntries(entries);
  const slope = linearRegressionSlopeKgPerDay(sorted);
  const trend = classifyTrendLabel(slope);
  const last = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  const metrics: WeightMetrics = {
    currentWeightKg: last?.weightKg ?? null,
    currentDate: last?.day ?? null,
    avg7dKg: computeAvg7d(sorted),
    diffVsPreviousDayKg:
      sorted.length >= 2
        ? Number(
            (sorted[sorted.length - 1].weightKg - sorted[sorted.length - 2].weightKg).toFixed(2),
          )
        : null,
    weeklyChangeKg: slope !== null ? Number((slope * 7).toFixed(2)) : null,
  };

  const alerts = buildAlerts(sorted, 5);
  const coachMessage = buildCoachMessage(trend, metrics, alerts, metrics.weeklyChangeKg);
  const goal = computeGoal(sorted, settings);

  return {
    trend,
    trendFromRegression: sorted.length < 2 ? 'insuficiente_datos' : mapToWeightTrendDirection(trend),
    metrics,
    goal,
    alerts,
    coachMessage,
  };
}
