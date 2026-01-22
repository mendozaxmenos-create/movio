export type ISODate = string; // YYYY-MM-DD

export type MealType = 'desayuno' | 'almuerzo' | 'snack' | 'cena' | 'otro';
export type PortionSize = 'chico' | 'medio' | 'grande';

export type MealContextTag =
  | 'normal'
  | 'evento_social'
  | 'uso_sobras'
  | 'no_planificado'
  | 'recuperacion';

export interface Meal {
  id: string;
  day: ISODate;
  type: MealType;
  items: string[]; // texto libre corto
  portionSize: PortionSize;
  contextTags: MealContextTag[];
  createdAt: string;
}

export type ActivityType = 'bici' | 'caminata' | 'natacion' | 'gym' | 'otro';
export type ActivityIntensity = 'baja' | 'media' | 'alta';

export interface ActivitySession {
  id: string;
  day: ISODate;
  type: ActivityType;
  durationMinutes: number;
  distanceKm?: number;
  intensity: ActivityIntensity;
  calories?: number;
  createdAt: string;
}

export interface WeightEntry {
  day: ISODate;
  weightKg: number;
  createdAt: string;
}

export interface DayNotes {
  day: ISODate;
  text: string;
  createdAt: string;
}

export type DayStatus = 'verde' | 'amarillo' | 'rojo';

export interface DayLog {
  day: ISODate;
  meals: Meal[];
  activities: ActivitySession[];
  weight?: WeightEntry;
  notes?: DayNotes;
}

export type WeightTrendDirection = 'baja' | 'estable' | 'sube' | 'insuficiente_datos';

export interface WeightTrendPoint {
  day: ISODate;
  movingAverage7d: number;
}

export interface WeightTrendSummary {
  points: WeightTrendPoint[];
  direction: WeightTrendDirection;
}

export interface DayBehaviorKpis {
  hasAnyLog: boolean;
  mealsCount: number;
  activitiesCount: number;
  hasDeviation: boolean; // hay no_planificado
  hasRecovery: boolean; // hay recuperacion
  hasSocialContext: boolean; // evento_social / uso_sobras
}

