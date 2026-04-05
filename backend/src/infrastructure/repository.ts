import fs from 'fs';
import path from 'path';
import {
  ActivitySession,
  AppSettings,
  CoachMessage,
  DayLog,
  DayNotes,
  ISODate,
  InventoryItem,
  Meal,
  WeightEntry,
} from '../domain/models';

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
  addCoachMessage(day: ISODate, message: CoachMessage): Promise<void>;
  listCoachMessages(day: ISODate): Promise<CoachMessage[]>;
  addInventoryItem(item: InventoryItem): Promise<void>;
  listInventory(): Promise<InventoryItem[]>;
  getSettings(): Promise<AppSettings>;
  updateSettings(partial: Partial<AppSettings>): Promise<void>;
  setSettings(settings: AppSettings): Promise<void>;
  deleteWeight(day: ISODate): Promise<void>;
}

/**
 * Implementación en memoria para el MVP / prototipos.
 * No apta para producción, pero muy útil para probar la lógica.
 */
export class InMemoryDayLogRepository implements DayLogRepository {
  private days: Map<ISODate, DayLog> = new Map();
  private coachMessages: Map<ISODate, CoachMessage[]> = new Map();
  private inventory: InventoryItem[] = [];
  private settings: AppSettings = {};

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

  async deleteWeight(day: ISODate): Promise<void> {
    const log = this.days.get(day);
    if (!log?.weight) return;
    delete log.weight;
    if (log.meals.length === 0 && log.activities.length === 0 && !log.notes) {
      this.days.delete(day);
    }
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

  async addCoachMessage(day: ISODate, message: CoachMessage): Promise<void> {
    const existing = this.coachMessages.get(day) ?? [];
    existing.push(message);
    this.coachMessages.set(day, existing);
  }

  async listCoachMessages(day: ISODate): Promise<CoachMessage[]> {
    const list = this.coachMessages.get(day) ?? [];
    return [...list].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  }

  async addInventoryItem(item: InventoryItem): Promise<void> {
    this.inventory.push(item);
  }

  async listInventory(): Promise<InventoryItem[]> {
    return [...this.inventory];
  }

  async getSettings(): Promise<AppSettings> {
    return { ...this.settings };
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<void> {
    this.settings = { ...this.settings, ...partial };
  }

  async setSettings(settings: AppSettings): Promise<void> {
    this.settings = { ...settings };
  }
}

/** Snapshot completo para disco o Postgres (JSON/JSONB). */
export interface PersistedData {
  days: DayLog[];
  coachMessages: CoachMessage[];
  inventory: InventoryItem[];
  settings?: AppSettings;
}

/**
 * Repositorio que persiste en disco usando un archivo JSON sencillo.
 * No es una base de datos real, pero evita que se pierdan los datos
 * al reiniciar el servidor durante el desarrollo / MVIP.
 */
export class DiskDayLogRepository implements DayLogRepository {
  private inner: InMemoryDayLogRepository;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.join(process.cwd(), 'data', 'movio-data.json');
    this.ensureDataDir();
    this.inner = new InMemoryDayLogRepository();
    this.loadFromDisk();
  }

  private ensureDataDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadFromDisk() {
    if (!fs.existsSync(this.filePath)) return;
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(raw) as PersistedData;
      // Reconstruimos el repositorio en memoria
      for (const day of data.days ?? []) {
        // upsertMeal/upsertActivity/upsertWeight/upsertNotes ya crean el día
        for (const meal of day.meals ?? []) {
          void this.inner.upsertMeal(day.day, meal);
        }
        for (const act of day.activities ?? []) {
          void this.inner.upsertActivity(day.day, act);
        }
        if (day.weight) {
          void this.inner.upsertWeight(day.day, day.weight);
        }
        if (day.notes) {
          void this.inner.upsertNotes(day.day, day.notes);
        }
      }
      for (const msg of data.coachMessages ?? []) {
        void this.inner.addCoachMessage(msg.day, msg);
      }
      for (const item of data.inventory ?? []) {
        void this.inner.addInventoryItem(item);
      }
      if (data.settings) {
        void this.inner.updateSettings(data.settings);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('No se pudo leer movio-data.json, empezamos vacío.', e);
    }
  }

  private async saveToDisk() {
    const days = await this.inner.listDays('0000-01-01', '9999-12-31');
    // Coach messages e inventario no tienen un list global, así que persistimos desde inner
    // accediendo a sus campos privados no es posible, así que reconstruimos a partir de las APIs.
    // Dado que no tenemos un método para listar TODOS los mensajes, vamos a persistir sólo days e inventory.
    // TODO: si en el futuro los mensajes del coach son críticos, extender la interfaz para listarlos todos.
    const inventory = await this.inner.listInventory();
    const settings = await this.inner.getSettings();
    const data: PersistedData = {
      days,
      coachMessages: [],
      inventory,
      settings,
    };
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async getDay(day: ISODate): Promise<DayLog | null> {
    return this.inner.getDay(day);
  }

  async upsertMeal(day: ISODate, meal: Meal): Promise<void> {
    await this.inner.upsertMeal(day, meal);
    await this.saveToDisk();
  }

  async upsertActivity(day: ISODate, activity: ActivitySession): Promise<void> {
    await this.inner.upsertActivity(day, activity);
    await this.saveToDisk();
  }

  async upsertWeight(day: ISODate, weight: WeightEntry): Promise<void> {
    await this.inner.upsertWeight(day, weight);
    await this.saveToDisk();
  }

  async upsertNotes(day: ISODate, notes: DayNotes): Promise<void> {
    await this.inner.upsertNotes(day, notes);
    await this.saveToDisk();
  }

  async listDays(from: ISODate, to: ISODate): Promise<DayLog[]> {
    return this.inner.listDays(from, to);
  }

  async listWeightEntries(): Promise<WeightEntry[]> {
    return this.inner.listWeightEntries();
  }

  async addCoachMessage(day: ISODate, message: CoachMessage): Promise<void> {
    await this.inner.addCoachMessage(day, message);
    // Por simplicidad, no los persistimos aún (se recalcularán al reiniciar según se necesite).
  }

  async listCoachMessages(day: ISODate): Promise<CoachMessage[]> {
    return this.inner.listCoachMessages(day);
  }

  async addInventoryItem(item: InventoryItem): Promise<void> {
    await this.inner.addInventoryItem(item);
    await this.saveToDisk();
  }

  async listInventory(): Promise<InventoryItem[]> {
    return this.inner.listInventory();
  }

  async getSettings(): Promise<AppSettings> {
    return this.inner.getSettings();
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<void> {
    await this.inner.updateSettings(partial);
    await this.saveToDisk();
  }

  async setSettings(settings: AppSettings): Promise<void> {
    await this.inner.setSettings(settings);
    await this.saveToDisk();
  }

  async deleteWeight(day: ISODate): Promise<void> {
    await this.inner.deleteWeight(day);
    await this.saveToDisk();
  }

  /**
   * Si no hay mediciones, inserta el seed demo (útil para MVP y demos).
   */
  async seedIfEmpty(): Promise<void> {
    const existing = await this.listWeightEntries();
    if (existing.length > 0) return;
    const seed: { day: ISODate; weightKg: number }[] = [
      { day: '2026-03-28', weightKg: 93.5 },
      { day: '2026-03-29', weightKg: 93.7 },
      { day: '2026-03-30', weightKg: 93.6 },
      { day: '2026-03-31', weightKg: 93.1 },
      { day: '2026-04-01', weightKg: 93.2 },
    ];
    const createdAt = new Date().toISOString();
    for (const s of seed) {
      await this.upsertWeight(s.day, { day: s.day, weightKg: s.weightKg, createdAt });
    }
  }
}

