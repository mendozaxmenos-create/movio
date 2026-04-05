import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchWeights } from '../api';
import type { WeightRecord } from '../types';

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function WeightHistoryPanel() {
  const [open, setOpen] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [rows, setRows] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchWeights()
      .then(data => {
        if (!cancelled) setRows(data.weights);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el historial.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const chartData = useMemo(() => {
    return [...rows]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map(r => ({ date: r.date, label: shortDate(r.date), peso: r.weight }));
  }, [rows]);

  return (
    <div className="today-weight-history">
      <button
        type="button"
        className="section-action"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {open ? 'Ocultar historial de peso' : 'Ver historial de peso (opcional)'}
      </button>
      {open && (
        <div className="today-weight-history-body">
          {loading && <p className="section-empty">Cargando…</p>}
          {error && <p className="status-error">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <p className="section-empty">Todavía no hay registros.</p>
          )}
          {!loading && !error && rows.length > 0 && (
            <>
              <label className="today-weight-chart-toggle">
                <input
                  type="checkbox"
                  checked={showChart}
                  onChange={e => setShowChart(e.target.checked)}
                />
                Mostrar gráfico
              </label>
              {showChart && (
                <div className="today-weight-chart-wrap">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis
                        domain={['dataMin - 0.5', 'dataMax + 0.5']}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: 8,
                          fontSize: 12,
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
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="today-weight-table">
                {[...rows]
                  .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
                  .map(r => (
                    <li key={r.id}>
                      <span>{r.date}</span>
                      <span>{r.weight} kg</span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
