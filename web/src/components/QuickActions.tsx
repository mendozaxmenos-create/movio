import { useState } from 'react';

interface Props {
  day: string;
  onRegisterMeal: (kind: 'real' | 'plan') => Promise<void>;
  onRegisterActivity: () => Promise<void>;
  onRegisterWeight: () => Promise<void>;
  onRegisterNote: () => Promise<void>;
}

export function QuickActions({
  onRegisterMeal,
  onRegisterActivity,
  onRegisterWeight,
  onRegisterNote,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function wrap(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="quick-actions">
      <button onClick={() => wrap(() => onRegisterMeal('real'))} disabled={busy}>
        Comida
      </button>
      <button onClick={() => wrap(() => onRegisterMeal('plan'))} disabled={busy}>
        Plan comida
      </button>
      <button onClick={() => wrap(onRegisterActivity)} disabled={busy}>
        Actividad
      </button>
      <button onClick={() => wrap(onRegisterWeight)} disabled={busy}>
        Peso
      </button>
      <button onClick={() => wrap(onRegisterNote)} disabled={busy}>
        Nota
      </button>
    </div>
  );
}

