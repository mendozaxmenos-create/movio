import type { TimelineEvent } from '../types';
import './timeline.css';

interface Props {
  events: TimelineEvent[];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function Timeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="timeline-empty">
        Empecemos el día. Podés registrar tu desayuno, una actividad o contar cómo dormiste.
      </div>
    );
  }

  // Para mantener la pantalla limpia, mostramos solo el último evento
  const visible = events.slice(-1);

  return (
    <div className="timeline">
      {visible.map(event => {
        if (event.type === 'coach_message') {
          return (
            <div key={event.id} className="bubble bubble-coach">
              <div className="bubble-label-row">
                <div className="bubble-label">Movio</div>
                <div className="bubble-time">{formatTime(event.createdAt)}</div>
              </div>
              <div className="bubble-text">{event.data.message.text}</div>
            </div>
          );
        }

        if (event.type === 'meal') {
          const meal = event.data.meal;
          const label =
            meal.kind === 'plan'
              ? `Plan: ${meal.type}`
              : `${meal.type[0].toUpperCase()}${meal.type.slice(1)}`;
          return (
            <div key={event.id} className="bubble bubble-user">
              <div className="bubble-label-row">
                <div className="bubble-label">{label}</div>
                <div className="bubble-time">{formatTime(event.createdAt)}</div>
              </div>
              <div className="bubble-text">{meal.items.join(', ') || 'Sin detalle'}</div>
            </div>
          );
        }

        if (event.type === 'activity') {
          const a = event.data.activity;
          const parts: string[] = [];
          if (typeof a.durationMinutes === 'number') {
            parts.push(`${a.durationMinutes} min`);
          }
          if (typeof a.distanceKm === 'number') {
            parts.push(`${a.distanceKm} km`);
          }
          if (typeof a.caloriesBurned === 'number') {
            parts.push(`${a.caloriesBurned} kcal quemadas`);
          }

          return (
            <div key={event.id} className="bubble bubble-user">
              <div className="bubble-label-row">
                <div className="bubble-label">Actividad · {a.type}</div>
                <div className="bubble-time">{formatTime(event.createdAt)}</div>
              </div>
              <div className="bubble-text">
                {parts.length > 0 ? parts.join(' · ') : 'Actividad registrada'} · intensidad {a.intensity}
              </div>
            </div>
          );
        }

        if (event.type === 'weight') {
          const w = event.data.weight;
          return (
            <div key={event.id} className="bubble bubble-user">
              <div className="bubble-label-row">
                <div className="bubble-label">Peso</div>
                <div className="bubble-time">{formatTime(event.createdAt)}</div>
              </div>
              <div className="bubble-text">{w.weightKg.toFixed(1)} kg</div>
            </div>
          );
        }

        if (event.type === 'note') {
          const n = event.data.note;
          return (
            <div key={event.id} className="bubble bubble-user">
              <div className="bubble-label-row">
                <div className="bubble-label">Nota</div>
                <div className="bubble-time">{formatTime(event.createdAt)}</div>
              </div>
              <div className="bubble-text">{n.text}</div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

