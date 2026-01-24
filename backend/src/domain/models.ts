export type ISODate = string; // YYYY-MM-DD

export type MealType = 'desayuno' | 'almuerzo' | 'snack' | 'cena' | 'otro';
export type PortionSize = 'chico' | 'medio' | 'grande';
export type MealKind = 'plan' | 'real';

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
  kind: MealKind;
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
  durationMinutes?: number;
  distanceKm?: number;
  intensity: ActivityIntensity;
  caloriesBurned?: number;
  caloriesTotal?: number;
  attachmentPath?: string;
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

export type TimelineEventType = 'meal' | 'activity' | 'weight' | 'note' | 'coach_message';

export interface CoachMessage {
  id: string;
  day: ISODate;
  createdAt: string;
  text: string;
}

export interface TimelineEvent {
  id: string;
  day: ISODate;
  createdAt: string;
  type: TimelineEventType;
  data:
    | { kind: 'meal'; meal: Meal }
    | { kind: 'activity'; activity: ActivitySession }
    | { kind: 'weight'; weight: WeightEntry }
    | { kind: 'note'; note: DayNotes }
    | { kind: 'coach_message'; message: CoachMessage };
}

export interface InventoryItem {
  id: string;
  name: string;
  quantityApprox: number;
  unit?: string;
  expiresAt?: string; // ISODate aproximada
  createdAt: string;
}

export interface ShoppingListItem {
  name: string;
  suggestedQty: number;
  unit?: string;
}

export interface ShoppingList {
  from: ISODate;
  to: ISODate;
  forDays: number;
  items: ShoppingListItem[];
}

