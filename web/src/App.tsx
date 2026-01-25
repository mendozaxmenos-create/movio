import { useState } from 'react';
import { TodayScreen } from './TodayScreen';
import { InventoryScreen } from './InventoryScreen';

type View = 'today' | 'inventory';

export function App() {
  const [view, setView] = useState<View>('today');

  if (view === 'inventory') {
    return <InventoryScreen onBack={() => setView('today')} />;
  }

  return <TodayScreen onGoToInventory={() => setView('inventory')} />;
}

