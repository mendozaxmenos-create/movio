import { DayLog, ISODate, Meal, ActivitySession, WeightEntry, DayNotes } from '../domain/models';

/**
 * Interfaz de repositorio para permitir cambiar fácilmente de
 * almacenamiento en memoria a Supabase / Postgres en el futuro.
 */
export interface DayLogRepository {
  getDay(day: ISODate): Promise<DayLog | null>;
  upsertMeal(day: ISODate, meal: Meal): Promise<void>;
  upsertActivity(day: ISODate, activity: ActivitySession): Promise<void>;
  upsertWeight(day: ISODate, weight: WeightEntry): Promise<void>;
  upsertNotes(day: ISODate, notes: DayNotes): Promise<void>;
  listDays(from: ISODate, to: ISODate): Promise<DayLog[]>;
  listWeightEntries(): Promise<WeightEntry[]>;
}

/**
 * Implementación en memoria para el MVP / prototipos.
 * No apta para producción, pero muy útil para probar la lógica.
 */
export class InMemoryDayLogRepository implements DayLogRepository {
  private days: Map<ISODate, DayLog> = new Map();

  private getOrCreateDay(day: ISODate): DayLog {
    const existing = this.days.get(day);
    if (existing) return existing;
    const created: DayLog = { day, meals: [], activities: [] };
    this.days.set(day, created);
    return created;
  }

  async getDay(day: ISODate): Promise<DayLog | null> {
    return this.days.get(day) ?? null;
  }

  async upsertMeal(day: ISODate, meal: Meal): Promise<void> {
    const d = this.getOrCreateDay(day);
    const existingIndex = d.meals.findIndex(m => m.id === meal.id);
    if (existingIndex >= 0) {
      d.meals[existingIndex] = meal;
    } else {
      d.meals.push(meal);
    }
  }

  async upsertActivity(day: ISODate, activity: ActivitySession): Promise<void> {
    const d = this.getOrCreateDay(day);
    const existingIndex = d.activities.findIndex(a => a.id === activity.id);
    if (existingIndex >= 0) {
      d.activities[existingIndex] = activity;
    } else {
      d.activities.push(activity);
    }
  }

  async upsertWeight(day: ISODate, weight: WeightEntry): Promise<void> {
    const d = this.getOrCreateDay(day);
    d.weight = weight;
  }

  async upsertNotes(day: ISODate, notes: DayNotes): Promise<void> {
    const d = this.getOrCreateDay(day);
    d.notes = notes;
  }

  async listDays(from: ISODate, to: ISODate): Promise<DayLog[]> {
    const result: DayLog[] = [];
    for (const [day, log] of this.days.entries()) {
      if (day >= from && day <= to) {
        result.push(log);
      }
    }
    return result.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  }

  async listWeightEntries(): Promise<WeightEntry[]> {
    const entries: WeightEntry[] = [];
    for (const log of this.days.values()) {
      if (log.weight) {
        entries.push(log.weight);
      }
    }
    return entries.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  }
}

