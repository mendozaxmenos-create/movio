interface Props {
  onSelectMeal: (kind: 'real' | 'plan') => void;
  onSelectActivity: () => void;
  onSelectWeight: () => void;
  onSelectNote: () => void;
}

export function QuickActions({
  onSelectMeal,
  onSelectActivity,
  onSelectWeight,
  onSelectNote,
}: Props) {
  return (
    <div className="quick-actions">
      <button onClick={() => onSelectMeal('real')}>Comida</button>
      <button onClick={() => onSelectMeal('plan')}>Plan comida</button>
      <button onClick={onSelectActivity}>Actividad</button>
      <button onClick={onSelectWeight}>Peso</button>
      <button onClick={onSelectNote}>Nota</button>
    </div>
  );
}



