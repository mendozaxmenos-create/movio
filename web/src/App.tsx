import { useState } from 'react';
import { TodayScreen } from './TodayScreen';
import { InventoryScreen } from './InventoryScreen';
import { WeightScreen } from './WeightScreen';

type View = 'today' | 'weight' | 'inventory';

export function App() {
  const [view, setView] = useState<View>('today');

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="sticky top-0 z-40 flex items-center justify-center gap-1 border-b border-slate-800/90 bg-slate-950/95 px-2 py-2 backdrop-blur-md">
        {(
          [
            ['today', 'Hoy'],
            ['weight', 'Peso'],
            ['inventory', 'Compras'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              view === id
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      {view === 'inventory' && <InventoryScreen onBack={() => setView('today')} />}
      {view === 'weight' && <WeightScreen />}
      {view === 'today' && <TodayScreen />}
    </div>
  );
}

