import {
  ActivitySession,
  DayBehaviorKpis,
  DayLog,
  DayStatus,
  Meal,
  WeightEntry,
  WeightTrendDirection,
  WeightTrendPoint,
  WeightTrendSummary,
} from './models';

/**
 * Calcula KPIs básicos de comportamiento a partir de un DayLog.
 * Esta función NO juzga, solo observa patrones.
 */
export function computeDayBehaviorKpis(dayLog: DayLog): DayBehaviorKpis {
  const meals = dayLog.meals ?? [];
  const activities = dayLog.activities ?? [];

  const hasDeviation = meals.some(m => m.contextTags.includes('no_planificado'));
  const hasRecovery = meals.some(m => m.contextTags.includes('recuperacion'));
  const hasSocialContext = meals.some(m =>
    m.contextTags.some(tag => tag === 'evento_social' || tag === 'uso_sobras'),
  );

  const hasAnyLog =
    meals.length > 0 || activities.length > 0 || dayLog.weight !== undefined || !!dayLog.notes;

  return {
    hasAnyLog,
    mealsCount: meals.length,
    activitiesCount: activities.length,
    hasDeviation,
    hasRecovery,
    hasSocialContext,
  };
}

export interface DayDecisionSummary {
  status: DayStatus;
  kpis: DayBehaviorKpis;
  copyKey: 'dia_bien_gestionado' | 'desvio_gestionado' | 'desvio_no_gestionado';
}

/**
 * Motor simplificado de decisiones para el MVP.
 *
 * Filosofía:
 * - Registrar ya es un éxito.
 * - Eventos sociales y sobras no cuentan como fallo.
 * - Un desvío sin recuperación clara se marca como rojo, pero el copy es siempre neutro.
 */
export function computeDayDecisionSummary(dayLog: DayLog): DayDecisionSummary | null {
  const kpis = computeDayBehaviorKpis(dayLog);

  if (!kpis.hasAnyLog) {
    // Día vacío: todavía no emitimos juicio. El cliente puede tratarlo como "sin estado".
    return null;
  }

  // Regla 1: si no hay desvíos explícitos, el día es verde.
  if (!kpis.hasDeviation) {
    return {
      status: 'verde',
      kpis,
      copyKey: 'dia_bien_gestionado',
    };
  }

  // Regla 2: si hay desvíos y también hay recuperación, es amarillo (desvío gestionado).
  if (kpis.hasDeviation && kpis.hasRecovery) {
    return {
      status: 'amarillo',
      kpis,
      copyKey: 'desvio_gestionado',
    };
  }

  // Regla 3: si hay desvíos sin recuperación y casi no hay actividad, es rojo.
  const lowActivity = kpis.activitiesCount === 0;

  if (kpis.hasDeviation && !kpis.hasRecovery && lowActivity) {
    return {
      status: 'rojo',
      kpis,
      copyKey: 'desvio_no_gestionado',
    };
  }

  // Caso intermedio: desvío no claramente recuperado pero con algo de actividad → amarillo.
  return {
    status: 'amarillo',
    kpis,
    copyKey: 'desvio_gestionado',
  };
}

/**
 * Calcula la serie de promedio móvil de 7 días y la tendencia global.
 * Recibe entradas de peso ORDENADAS por día ascendente.
 */
export function computeWeightTrend(entries: WeightEntry[]): WeightTrendSummary {
  if (entries.length === 0) {
    return { points: [], direction: 'insuficiente_datos' };
  }

  // Aseguramos orden por día, por si acaso.
  const sorted = [...entries].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  const points: WeightTrendPoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const window = sorted.slice(Math.max(0, i - 6), i + 1);
    const avg =
      window.reduce((sum, e) => sum + e.weightKg, 0) / (window.length === 0 ? 1 : window.length);
    points.push({
      day: sorted[i].day,
      movingAverage7d: Number(avg.toFixed(2)),
    });
  }

  if (points.length < 4) {
    // Muy pocos datos para hablar de tendencia robusta
    return { points, direction: 'insuficiente_datos' };
  }

  // Comparamos el promedio de las últimas 3 medias vs las 3 anteriores.
  const last3 = points.slice(-3);
  const prev3 = points.slice(-6, -3);

  const avgLast3 = last3.reduce((s, p) => s + p.movingAverage7d, 0) / last3.length;
  const avgPrev3 = prev3.reduce((s, p) => s + p.movingAverage7d, 0) / prev3.length;

  const diff = avgLast3 - avgPrev3;
  const threshold = 0.2; // 200g es un cambio suave pero perceptible a nivel tendencia.

  let direction: WeightTrendDirection;
  if (diff > threshold) {
    direction = 'sube';
  } else if (diff < -threshold) {
    direction = 'baja';
  } else {
    direction = 'estable';
  }

  return { points, direction };
}

