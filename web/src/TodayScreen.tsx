import { useEffect, useState } from 'react';
import { Timeline } from './components/Timeline';
import { MessageInput } from './components/MessageInput';
import { QuickActions } from './components/QuickActions';
import { fetchTimeline, getDefaultDay, registerActivity, registerMeal, registerNote, registerWeight, sendCoachMessage } from './api';
import type { TimelineEvent } from './types';

export function TodayScreen() {
  const [day] = useState<string>(() => getDefaultDay());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTimeline() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTimeline(day);
      setEvents(data.events);
    } catch (e) {
      setError('No pudimos cargar el día. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  async function handleSendMessage(text: string) {
    await sendCoachMessage(day, text);
    await loadTimeline();
  }

  async function askShortPrompt(prompt: string) {
    await sendCoachMessage(day, prompt);
    await loadTimeline();
  }

  async function handleRegisterMeal(kind: 'real' | 'plan') {
    const what = window.prompt(
      kind === 'plan'
        ? '¿Qué tenés pensado comer? Ej: 2 huevos, palta y café'
        : '¿Qué comiste? Ej: 2 huevos, palta y café',
    );
    if (!what) return;
    const type = window.prompt('¿Qué tipo de comida es? desayuno / almuerzo / snack / cena / otro', 'otro');
    const normalizedType = (type ?? 'otro').toLowerCase();
    if (kind === 'plan') {
      await registerMeal(day, { type: normalizedType, items: [what] });
    } else {
      await registerMeal(day, { type: normalizedType, items: [what] });
    }
    await askShortPrompt(
      kind === 'plan'
        ? `Voy a comer esto más tarde: ${what}`
        : `Acabo de comer esto: ${what}`,
    );
  }

  async function handleRegisterActivity() {
    const what = window.prompt('¿Qué actividad hiciste? bici / caminata / natacion / gym / otro', 'caminata');
    if (!what) return;
    const minutesRaw = window.prompt('¿Cuántos minutos?', '30');
    if (!minutesRaw) return;
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    await registerActivity(day, { type: what.toLowerCase(), durationMinutes: minutes });
    await askShortPrompt(`Este fue mi ejercicio: ${minutes} minutos de ${what}`);
  }

  async function handleRegisterWeight() {
    const raw = window.prompt('Peso de hoy (kg):', '100.0');
    if (!raw) return;
    const weight = Number(raw.replace(',', '.'));
    if (!Number.isFinite(weight) || weight <= 0) return;
    await registerWeight(day, weight);
    await askShortPrompt(`El peso de hoy es ${weight} kg, registralo para seguir la tendencia.`);
  }

  async function handleRegisterNote() {
    const text = window.prompt('Nota del día (cómo dormiste, cómo te sentís, etc.)');
    if (!text) return;
    await registerNote(day, text);
    await askShortPrompt(`Nota del día: ${text}`);
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <div className="screen-title">Hoy</div>
          <div className="screen-subtitle">
            Un día a la vez. Movio te ayuda a decidir, no a juzgar.
          </div>
        </div>
        <button className="screen-chip" onClick={() => askShortPrompt('Quiero que me digas cómo vengo hoy en general.')}>
          ¿Cómo vengo?
        </button>
      </header>
      <main className="screen-main">
        {loading && <div className="status">Cargando día...</div>}
        {error && <div className="status status-error">{error}</div>}
        {!loading && !error && <Timeline events={events} />}
      </main>
      <div className="screen-footer">
        <QuickActions
          day={day}
          onRegisterMeal={handleRegisterMeal}
          onRegisterActivity={handleRegisterActivity}
          onRegisterWeight={handleRegisterWeight}
          onRegisterNote={handleRegisterNote}
        />
        <MessageInput disabled={loading} onSend={handleSendMessage} />
      </div>
    </div>
  );
}

