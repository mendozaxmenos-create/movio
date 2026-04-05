import { Pool, type PoolConfig } from 'pg';
import type {
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
import type { DayLogRepository } from './repository';
import { InMemoryDayLogRepository, type PersistedData } from './repository';

const SNAPSHOT_ID = 1;

function poolOptions(connectionString: string): PoolConfig {
  const local = /localhost|127\.0\.0\.1/.test(connectionString);
  return {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    ...(local ? {} : { ssl: { rejectUnauthorized: false } }),
  };
}

/**
 * Persistencia en PostgreSQL (Neon, Vercel Postgres, Supabase, etc.).
 * Un único snapshot JSON alineado con el archivo local `movio-data.json`.
 */
export class PostgresDayLogRepository implements DayLogRepository {
  private readonly pool: Pool;
  private readonly inner: InMemoryDayLogRepository;

  private constructor(pool: Pool) {
    this.pool = pool;
    this.inner = new InMemoryDayLogRepository();
  }

  static async connect(connectionString: string): Promise<PostgresDayLogRepository> {
    const pool = new Pool(poolOptions(connectionString));
    const repo = new PostgresDayLogRepository(pool);
    await repo.ensureSchema();
    await repo.loadSnapshot();
    return repo;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }


  private async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS movio_snapshot (
        id INTEGER PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  private async loadSnapshot(): Promise<void> {
    const { rows } = await this.pool.query<{ data: PersistedData }>(
      'SELECT data FROM movio_snapshot WHERE id = $1',
      [SNAPSHOT_ID],
    );
    if (rows.length === 0) return;

    const data = rows[0].data;
    try {
      for (const day of data.days ?? []) {
        for (const meal of day.meals ?? []) {
          await this.inner.upsertMeal(day.day, meal);
        }
        for (const act of day.activities ?? []) {
          await this.inner.upsertActivity(day.day, act);
        }
        if (day.weight) {
          await this.inner.upsertWeight(day.day, day.weight);
        }
        if (day.notes) {
          await this.inner.upsertNotes(day.day, day.notes);
        }
      }
      for (const msg of data.coachMessages ?? []) {
        await this.inner.addCoachMessage(msg.day, msg);
      }
      for (const item of data.inventory ?? []) {
        await this.inner.addInventoryItem(item);
      }
      if (data.settings) {
        await this.inner.updateSettings(data.settings);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error hidratando snapshot desde Postgres', e);
    }
  }

  private async saveSnapshot(): Promise<void> {
    const days = await this.inner.listDays('0000-01-01', '9999-12-31');
    const inventory = await this.inner.listInventory();
    const settings = await this.inner.getSettings();
    const data: PersistedData = {
      days,
      coachMessages: [],
      inventory,
      settings,
    };
    const json = JSON.stringify(data);
    await this.pool.query(
      `INSERT INTO movio_snapshot (id, data, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET
         data = EXCLUDED.data,
         updated_at = now()`,
      [SNAPSHOT_ID, json],
    );
  }

  async getDay(day: ISODate): Promise<DayLog | null> {
    return this.inner.getDay(day);
  }

  async upsertMeal(day: ISODate, meal: Meal): Promise<void> {
    await this.inner.upsertMeal(day, meal);
    await this.saveSnapshot();
  }

  async upsertActivity(day: ISODate, activity: ActivitySession): Promise<void> {
    await this.inner.upsertActivity(day, activity);
    await this.saveSnapshot();
  }

  async upsertWeight(day: ISODate, weight: WeightEntry): Promise<void> {
    await this.inner.upsertWeight(day, weight);
    await this.saveSnapshot();
  }

  async upsertNotes(day: ISODate, notes: DayNotes): Promise<void> {
    await this.inner.upsertNotes(day, notes);
    await this.saveSnapshot();
  }

  async listDays(from: ISODate, to: ISODate): Promise<DayLog[]> {
    return this.inner.listDays(from, to);
  }

  async listWeightEntries(): Promise<WeightEntry[]> {
    return this.inner.listWeightEntries();
  }

  async addCoachMessage(day: ISODate, message: CoachMessage): Promise<void> {
    await this.inner.addCoachMessage(day, message);
  }

  async listCoachMessages(day: ISODate): Promise<CoachMessage[]> {
    return this.inner.listCoachMessages(day);
  }

  async addInventoryItem(item: InventoryItem): Promise<void> {
    await this.inner.addInventoryItem(item);
    await this.saveSnapshot();
  }

  async listInventory(): Promise<InventoryItem[]> {
    return this.inner.listInventory();
  }

  async getSettings(): Promise<AppSettings> {
    return this.inner.getSettings();
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<void> {
    await this.inner.updateSettings(partial);
    await this.saveSnapshot();
  }

  async setSettings(settings: AppSettings): Promise<void> {
    await this.inner.setSettings(settings);
    await this.saveSnapshot();
  }

  async deleteWeight(day: ISODate): Promise<void> {
    await this.inner.deleteWeight(day);
    await this.saveSnapshot();
  }

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
