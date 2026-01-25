import { useEffect, useState } from 'react';
import { Timeline } from './components/Timeline';
import { MessageInput } from './components/MessageInput';
import { QuickActions } from './components/QuickActions';
import { fetchTimeline, getDefaultDay, registerActivity, registerMeal, registerNote, registerWeight, sendCoachMessage } from './api';
import type { TimelineEvent } from './types';

type ActiveForm = 'meal-real' | 'meal-plan' | 'activity' | 'weight' | 'note' | null;

interface Props {
  onGoToInventory?: () => void;
}

export function TodayScreen({ onGoToInventory }: Props) {
  const [day] = useState<string>(() => getDefaultDay());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [mealText, setMealText] = useState('');
  const [mealType, setMealType] = useState<'desayuno' | 'almuerzo' | 'snack' | 'cena' | 'otro'>('otro');
  const [activityType, setActivityType] = useState<'bici' | 'caminata' | 'natacion' | 'gym' | 'otro'>('caminata');
  const [activityMinutes, setActivityMinutes] = useState('');
  const [activityDistance, setActivityDistance] = useState('');
  const [activityKcal, setActivityKcal] = useState('');
  const [weightText, setWeightText] = useState('');
  const [noteText, setNoteText] = useState('');

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

  async function handleSubmitMeal(kind: 'real' | 'plan') {
    const trimmed = mealText.trim();
    if (!trimmed) return;
    await registerMeal(day, { type: mealType, items: [trimmed] });
    await askShortPrompt(
      kind === 'plan'
        ? `Voy a comer esto más tarde: ${trimmed}`
        : `Acabo de comer esto: ${trimmed}`,
    );
    setMealText('');
    setActiveForm(null);
  }

  async function handleSubmitActivity() {
    const minutes = activityMinutes ? Number(activityMinutes.replace(',', '.')) : undefined;
    const distanceKm = activityDistance ? Number(activityDistance.replace(',', '.')) : undefined;
    const kcal = activityKcal ? Number(activityKcal.replace(',', '.')) : undefined;

    await registerActivity(day, {
      type: activityType,
      durationMinutes: Number.isFinite(minutes as number) && (minutes as number) > 0 ? (minutes as number) : undefined,
      distanceKm: Number.isFinite(distanceKm as number) && (distanceKm as number) > 0 ? (distanceKm as number) : undefined,
      caloriesBurned: Number.isFinite(kcal as number) && (kcal as number) > 0 ? (kcal as number) : undefined,
    });

    await askShortPrompt(
      `Este fue mi ejercicio: ${activityMinutes || 'sin tiempo específico'} min de ${activityType}`,
    );

    setActivityMinutes('');
    setActivityDistance('');
    setActivityKcal('');
    setActiveForm(null);
  }

  async function handleSubmitWeight() {
    const trimmed = weightText.trim();
    if (!trimmed) return;
    const weight = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(weight) || weight <= 0) return;
    await registerWeight(day, weight);
    await askShortPrompt(`El peso de hoy es ${weight} kg, registralo para seguir la tendencia.`);
    setWeightText('');
    setActiveForm(null);
  }

  async function handleSubmitNote() {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    await registerNote(day, trimmed);
    await askShortPrompt(`Nota del día: ${trimmed}`);
    setNoteText('');
    setActiveForm(null);
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
        <div className="screen-chip-row">
          <button className="screen-chip" onClick={() => askShortPrompt('Quiero que me digas cómo vengo hoy en general.')}>
            ¿Cómo vengo?
          </button>
          {onGoToInventory && (
            <button className="screen-chip" onClick={onGoToInventory}>
              Compras
            </button>
          )}
        </div>
      </header>
      <main className="screen-main">
        {loading && <div className="status">Cargando día...</div>}
        {error && <div className="status status-error">{error}</div>}
        {!loading && !error && <Timeline events={events} />}
      </main>
      <div className="screen-footer">
        {activeForm && (
          <div className="form-panel">
            {activeForm === 'meal-real' || activeForm === 'meal-plan' ? (
              <div className="form-card">
                <div className="form-title">
                  {activeForm === 'meal-plan' ? 'Plan de comida' : 'Registrar comida'}
                </div>
                <div className="form-row form-row-chips">
                  {['desayuno', 'almuerzo', 'snack', 'cena', 'otro'].map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`chip ${mealType === t ? 'chip-active' : ''}`}
                      onClick={() => setMealType(t as typeof mealType)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder={
                      activeForm === 'meal-plan'
                        ? 'Ej: 2 huevos, palta y café (plan)'
                        : 'Ej: 2 huevos, palta y café'
                    }
                    value={mealText}
                    onChange={e => setMealText(e.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setActiveForm(null)} className="btn-secondary">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmitMeal(activeForm === 'meal-plan' ? 'plan' : 'real')}
                    className="btn-primary"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ) : null}

            {activeForm === 'activity' && (
              <div className="form-card">
                <div className="form-title">Registrar actividad</div>
                <div className="form-row form-row-chips">
                  {['bici', 'caminata', 'natacion', 'gym', 'otro'].map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`chip ${activityType === t ? 'chip-active' : ''}`}
                      onClick={() => setActivityType(t as typeof activityType)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="form-row">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Minutos (opcional)"
                    value={activityMinutes}
                    onChange={e => setActivityMinutes(e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Distancia km (opcional)"
                    value={activityDistance}
                    onChange={e => setActivityDistance(e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Kcal quemadas (opcional)"
                    value={activityKcal}
                    onChange={e => setActivityKcal(e.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setActiveForm(null)} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSubmitActivity} className="btn-primary">
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {activeForm === 'weight' && (
              <div className="form-card">
                <div className="form-title">Registrar peso</div>
                <div className="form-row">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Peso de hoy (kg)"
                    value={weightText}
                    onChange={e => setWeightText(e.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setActiveForm(null)} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSubmitWeight} className="btn-primary">
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {activeForm === 'note' && (
              <div className="form-card">
                <div className="form-title">Nota del día</div>
                <div className="form-row">
                  <textarea
                    rows={2}
                    placeholder="Cómo dormiste, cómo te sentís, algo que quieras registrar..."
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setActiveForm(null)} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSubmitNote} className="btn-primary">
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <QuickActions
          onSelectMeal={kind => setActiveForm(kind === 'plan' ? 'meal-plan' : 'meal-real')}
          onSelectActivity={() => setActiveForm('activity')}
          onSelectWeight={() => setActiveForm('weight')}
          onSelectNote={() => setActiveForm('note')}
        />
        <MessageInput disabled={loading} onSend={handleSendMessage} />
      </div>
    </div>
  );
}

