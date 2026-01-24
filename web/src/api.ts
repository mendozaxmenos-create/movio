import type { TimelineResponse } from './types';

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

export async function registerActivity(day: string, payload: { type: string; durationMinutes: number }) {
  const res = await fetch(`${API_BASE_URL}/days/${day}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: payload.type,
      durationMinutes: payload.durationMinutes,
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

