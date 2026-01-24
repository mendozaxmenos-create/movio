import { useRef, useState } from 'react';

interface Props {
  day: string;
  onRegisterMeal: (kind: 'real' | 'plan') => Promise<void>;
  onRegisterActivity: () => Promise<void>;
  onRegisterWeight: () => Promise<void>;
  onRegisterNote: () => Promise<void>;
  onUploadActivityImage: (file: File) => Promise<void>;
}

export function QuickActions({
  onRegisterMeal,
  onRegisterActivity,
  onRegisterWeight,
  onRegisterNote,
  onUploadActivityImage,
}: Props) {
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function wrap(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await wrap(() => onUploadActivityImage(file));
    e.target.value = '';
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
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
      >
        Foto act.
      </button>
      <button onClick={() => wrap(onRegisterWeight)} disabled={busy}>
        Peso
      </button>
      <button onClick={() => wrap(onRegisterNote)} disabled={busy}>
        Nota
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}

