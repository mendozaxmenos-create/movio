import type {
  AppSettingsResponse,
  InventoryItem,
  ShoppingListResponse,
  TimelineResponse,
  WeightInsightsResponse,
  WeightProjectionResponse,
  WeightRecord,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

function todayAsIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const getDefaultDay = todayAsIso;

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      // ignore
    }
    const error = new Error('Error en la llamada a la API');
    (error as any).details = details;
    throw error;
  }
  return res.json() as Promise<T>;
}

export async function fetchTimeline(day: string): Promise<TimelineResponse> {
  const res = await fetch(`${API_BASE_URL}/days/${day}/timeline`);
  return handleJson<TimelineResponse>(res);
}

export async function sendCoachMessage(day: string, text: string) {
  const res = await fetch(`${API_BASE_URL}/days/${day}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return handleJson<{ message: { id: string; text: string; createdAt: string } }>(res);
}

export async function registerMeal(day: string, payload: { type: string; items: string[] }) {
  const res = await fetch(`${API_BASE_URL}/days/${day}/meals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: payload.type,
      items: payload.items,
      portionSize: 'medio',
      contextTags: ['normal'],
    }),
  });
  return handleJson<unknown>(res);
}

export async function registerActivity(day: string, payload: {
  type: string;
  durationMinutes?: number;
  distanceKm?: number;
  caloriesBurned?: number;
  caloriesTotal?: number;
}) {
  const res = await fetch(`${API_BASE_URL}/days/${day}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: payload.type,
      durationMinutes: payload.durationMinutes,
      distanceKm: payload.distanceKm,
      caloriesBurned: payload.caloriesBurned,
      caloriesTotal: payload.caloriesTotal,
      intensity: 'media',
    }),
  });
  return handleJson<unknown>(res);
}

export async function registerWeight(day: string, weightKg: number) {
  const res = await fetch(`${API_BASE_URL}/days/${day}/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weightKg }),
  });
  return handleJson<unknown>(res);
}

export async function registerNote(day: string, text: string) {
  const res = await fetch(`${API_BASE_URL}/days/${day}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return handleJson<unknown>(res);
}

export async function fetchInventory(): Promise<{ items: InventoryItem[] }> {
  const res = await fetch(`${API_BASE_URL}/inventory`);
  return handleJson<{ items: InventoryItem[] }>(res);
}

export async function addInventoryItem(payload: {
  name: string;
  quantityApprox: number;
  unit?: string;
  expiresAt?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson<{ id: string; createdAt: string }>(res);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchShoppingList(forDays = 3): Promise<ShoppingListResponse> {
  const to = todayAsIso();
  const from = isoDaysAgo(6);
  const params = new URLSearchParams({ from, to, forDays: String(forDays) });
  const res = await fetch(`${API_BASE_URL}/shopping-list?${params.toString()}`);
  return handleJson<ShoppingListResponse>(res);
}

export async function fetchWeights(): Promise<{ weights: WeightRecord[] }> {
  const res = await fetch(`${API_BASE_URL}/weights`);
  return handleJson<{ weights: WeightRecord[] }>(res);
}

export async function postWeight(date: string, weight: number): Promise<WeightRecord> {
  const res = await fetch(`${API_BASE_URL}/weights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, weight }),
  });
  return handleJson<WeightRecord>(res);
}

export async function deleteWeightByDate(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/weights/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      // ignore
    }
    const error = new Error('Error al eliminar el registro');
    (error as { details?: unknown }).details = details;
    throw error;
  }
}

export async function fetchWeightInsights(): Promise<WeightInsightsResponse> {
  const res = await fetch(`${API_BASE_URL}/weight/insights`);
  return handleJson<WeightInsightsResponse>(res);
}

export async function fetchWeightProjection(): Promise<WeightProjectionResponse> {
  const res = await fetch(`${API_BASE_URL}/weight/projection`);
  return handleJson<WeightProjectionResponse>(res);
}

export async function fetchSettings(): Promise<AppSettingsResponse> {
  const res = await fetch(`${API_BASE_URL}/settings`);
  return handleJson<AppSettingsResponse>(res);
}

export async function putSettings(body: {
  targetWeightKg?: number | null;
  startingWeightKg?: number | null;
}): Promise<AppSettingsResponse> {
  const res = await fetch(`${API_BASE_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleJson<AppSettingsResponse>(res);
}


