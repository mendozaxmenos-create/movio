import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  deleteWeightByDate,
  fetchSettings,
  fetchWeightInsights,
  fetchWeightProjection,
  fetchWeights,
  getDefaultDay,
  postWeight,
  putSettings,
} from './api';
import type {
  GoalProgress,
  WeightAlert,
  WeightInsightsResponse,
  WeightProjectionResponse,
  WeightRecord,
} from './types';

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-3 shadow-sm backdrop-blur-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function trendLabel(t: WeightInsightsResponse['trend']): string {
  if (t === 'bajando') return 'Bajando';
  if (t === 'subiendo') return 'Subiendo';
  return 'Estable';
}

export function WeightScreen() {
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [insights, setInsights] = useState<WeightInsightsResponse | null>(null);
  const [projection, setProjection] = useState<WeightProjectionResponse | null>(null);
  const [goalDraft, setGoalDraft] = useState<{ target: string; start: string }>({ target: '', start: '' });
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(() => getDefaultDay());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, ins, proj, settings] = await Promise.all([
        fetchWeights(),
        fetchWeightInsights(),
        fetchWeightProjection(),
        fetchSettings(),
      ]);
      setWeights(w.weights);
      setInsights(ins);
      setProjection(proj);
      setGoalDraft({
        target: settings.targetWeightKg != null ? String(settings.targetWeightKg) : '',
        start: settings.startingWeightKg != null ? String(settings.startingWeightKg) : '',
      });
    } catch {
      setError('No pudimos cargar los datos de peso. ¿Está el backend en marcha?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const chartData = useMemo(() => {
    return [...weights]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map(r => ({
        date: r.date,
        label: formatDateShort(r.date),
        peso: r.weight,
      }));
  }, [weights]);

  async function handleSaveWeight() {
    const trimmed = weightInput.trim();
    if (!trimmed) return;
    const w = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(w) || w <= 0) return;
    await postWeight(dateInput, w);
    setWeightInput('');
    await loadAll();
  }

  async function handleSaveGoal() {
    const t = goalDraft.target.trim();
    const s = goalDraft.start.trim();
    await putSettings({
      targetWeightKg: t === '' ? null : Number(t.replace(',', '.')),
      startingWeightKg: s === '' ? null : Number(s.replace(',', '.')),
    });
    await loadAll();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este registro de peso?')) return;
    await deleteWeightByDate(id);
    await loadAll();
  }

  const goal: GoalProgress | null = insights?.goal ?? null;
  const alerts: WeightAlert[] = insights?.alerts ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-black text-slate-100">
      <header className="border-b border-slate-800/80 px-4 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Peso</h1>
        <p className="mt-1 text-sm text-slate-400">
          Dashboard minimalista: métricas, tendencia y proyección a partir de tus registros.
        </p>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6 pb-24">
        {loading && <p className="text-sm text-slate-500">Cargando…</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}

        {!loading && !error && insights && (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-300">Resumen inteligente</h2>
              <div className="rounded-2xl border border-slate-800/90 bg-slate-900/50 p-4 backdrop-blur-md">
                <p className="text-sm leading-relaxed text-slate-200">{insights.coachMessage}</p>
                {alerts.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                    {alerts.map((a, i) => (
                      <li
                        key={`${a.type}-${i}`}
                        className="flex gap-2 text-xs text-amber-200/90"
                      >
                        <span className="mt-0.5 shrink-0 font-semibold text-amber-400/90">
                          {a.type === 'spike_up' ? '▲' : '◆'}
                        </span>
                        <span>{a.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Peso actual"
                value={
                  insights.metrics.currentWeightKg != null
                    ? `${insights.metrics.currentWeightKg} kg`
                    : '—'
                }
                hint={
                  insights.metrics.currentDate
                    ? `Último registro: ${insights.metrics.currentDate}`
                    : undefined
                }
              />
              <MetricCard
                label="vs día anterior"
                value={
                  insights.metrics.diffVsPreviousDayKg != null
                    ? `${insights.metrics.diffVsPreviousDayKg > 0 ? '+' : ''}${insights.metrics.diffVsPreviousDayKg} kg`
                    : '—'
                }
              />
              <MetricCard
                label="Promedio 7 días"
                value={
                  insights.metrics.avg7dKg != null ? `${insights.metrics.avg7dKg} kg` : '—'
                }
              />
              <MetricCard
                label="Ritmo semanal (estim.)"
                value={
                  insights.metrics.weeklyChangeKg != null
                    ? `${insights.metrics.weeklyChangeKg > 0 ? '+' : ''}${insights.metrics.weeklyChangeKg} kg`
                    : '—'
                }
                hint="Basado en regresión lineal de tu serie."
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Tendencia" value={trendLabel(insights.trend)} />
              {goal ? (
                <MetricCard
                  label="Objetivo"
                  value={`${goal.targetWeightKg} kg`}
                  hint={`Progreso ${goal.progressPercent}% · Faltan ${goal.remainingKg} kg`}
                />
              ) : (
                <MetricCard label="Objetivo" value="Sin definir" hint="Configuralo abajo." />
              )}
            </section>

            {projection && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-slate-300">Proyección</h2>
                <p className="text-xs text-slate-500">
                  Estimación lineal desde tu historial (no es consejo médico). Pendiente:{' '}
                  {projection.slopeKgPerDay != null
                    ? `${projection.slopeKgPerDay > 0 ? '+' : ''}${projection.slopeKgPerDay} kg/día`
                    : '—'}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ['7 días', projection.projectedKg.days7],
                      ['14 días', projection.projectedKg.days14],
                      ['30 días', projection.projectedKg.days30],
                    ] as const
                  ).map(([label, val]) => (
                    <MetricCard
                      key={label}
                      label={label}
                      value={val != null ? `${val} kg` : '—'}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4">
              <h2 className="text-sm font-medium text-slate-300">Objetivo de peso</h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
                  Objetivo (kg)
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-600 focus:ring-1"
                    type="text"
                    inputMode="decimal"
                    placeholder="ej. 85"
                    value={goalDraft.target}
                    onChange={e => setGoalDraft(g => ({ ...g, target: e.target.value }))}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
                  Peso inicial (opcional)
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-600 focus:ring-1"
                    type="text"
                    inputMode="decimal"
                    placeholder="Si vacío, primera medición"
                    value={goalDraft.start}
                    onChange={e => setGoalDraft(g => ({ ...g, start: e.target.value }))}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleSaveGoal()}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white"
                >
                  Guardar objetivo
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-300">Nuevo registro</h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
                  Fecha
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                    type="date"
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
                  Peso (kg)
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                    type="text"
                    inputMode="decimal"
                    placeholder="ej. 72,4"
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleSaveWeight()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Guardar
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-300">Evolución</h2>
              <div className="h-64 w-full rounded-xl border border-slate-800/80 bg-slate-900/40 p-2">
                {chartData.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">Aún no hay datos para el gráfico.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis
                        domain={['dataMin - 0.5', 'dataMax + 0.5']}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        width={44}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(v: number) => [`${v} kg`, 'Peso']}
                        labelFormatter={(_, items) => {
                          const p = items?.[0]?.payload as { date?: string } | undefined;
                          return p?.date ?? '';
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        stroke="#34d399"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#34d399' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-300">Histórico</h2>
              <div className="overflow-hidden rounded-xl border border-slate-800/80">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Peso</th>
                      <th className="px-3 py-2 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...weights]
                      .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
                      .map(row => (
                        <tr key={row.id} className="border-t border-slate-800/80">
                          <td className="px-3 py-2 tabular-nums text-slate-300">{row.date}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-100">{row.weight} kg</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              className="text-xs text-rose-400/90 hover:text-rose-300"
                              onClick={() => void handleDelete(row.id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {weights.length === 0 && (
                  <p className="p-4 text-sm text-slate-500">No hay registros todavía.</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
