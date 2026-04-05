interface Props {
  onSelectMeal: (kind: 'real' | 'plan') => void;
  onSelectBreakfast: () => void;
  onSelectActivity: () => void;
  onSelectWeight: () => void;
  onSelectNote: () => void;
}

export function QuickActions({
  onSelectMeal,
  onSelectBreakfast,
  onSelectActivity,
  onSelectWeight,
  onSelectNote,
}: Props) {
  return (
    <div className="quick-actions">
      <button type="button" onClick={onSelectWeight}>
        Peso
      </button>
      <button type="button" onClick={onSelectBreakfast}>
        Desayuno
      </button>
      <button type="button" onClick={() => onSelectMeal('real')}>
        Comida
      </button>
      <button type="button" onClick={() => onSelectMeal('plan')}>
        Plan comida
      </button>
      <button type="button" onClick={onSelectActivity}>
        Actividad
      </button>
      <button type="button" onClick={onSelectNote}>
        Nota
      </button>
    </div>
  );
}



