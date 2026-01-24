import type { TimelineEvent } from '../types';
import './timeline.css';

interface Props {
  events: TimelineEvent[];
}

export function Timeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="timeline-empty">
        Empecemos el día. Podés registrar tu desayuno, una actividad o contar cómo dormiste.
      </div>
    );
  }

  return (
    <div className="timeline">
      {events.map(event => {
        if (event.type === 'coach_message') {
          return (
            <div key={event.id} className="bubble bubble-coach">
              <div className="bubble-label">Movio</div>
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
              <div className="bubble-label">{label}</div>
              <div className="bubble-text">{meal.items.join(', ') || 'Sin detalle'}</div>
            </div>
          );
        }

        if (event.type === 'activity') {
          const a = event.data.activity;
          return (
            <div key={event.id} className="bubble bubble-user">
              <div className="bubble-label">Actividad · {a.type}</div>
              <div className="bubble-text">
                {a.durationMinutes} min · intensidad {a.intensity}
              </div>
            </div>
          );
        }

        if (event.type === 'weight') {
          const w = event.data.weight;
          return (
            <div key={event.id} className="bubble bubble-user">
              <div className="bubble-label">Peso</div>
              <div className="bubble-text">{w.weightKg.toFixed(1)} kg</div>
            </div>
          );
        }

        if (event.type === 'note') {
          const n = event.data.note;
          return (
            <div key={event.id} className="bubble bubble-user">
              <div className="bubble-label">Nota</div>
              <div className="bubble-text">{n.text}</div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

