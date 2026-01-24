import { DayLog, InventoryItem, ISODate, ShoppingList, ShoppingListItem } from '../domain/models';

// Ítems básicos que Movio sugiere trackear/comprar.
const CANONICAL_ITEMS = [
  { key: 'banana', unit: 'unidad', aliases: ['banana', 'bananas'] },
  { key: 'palta', unit: 'unidad', aliases: ['palta', 'paltas', 'avocado'] },
  { key: 'huevo', unit: 'unidad', aliases: ['huevo', 'huevos'] },
  { key: 'yogur descremado', unit: 'unidad', aliases: ['yogur', 'yogurt', 'yoghurt'] },
  { key: 'pan integral', unit: 'rebanada', aliases: ['pan integral', 'tostadas'] },
  { key: 'galleta de arroz', unit: 'unidad', aliases: ['galletas de arroz', 'galleta de arroz'] },
];

function detectCanonicalItemsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const item of CANONICAL_ITEMS) {
    if (item.aliases.some(alias => lower.includes(alias))) {
      found.push(item.key);
    }
  }
  return found;
}

function aggregateConsumption(days: DayLog[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const day of days) {
    for (const meal of day.meals) {
      if (meal.kind !== 'real') continue;
      for (const itemText of meal.items) {
        const detected = detectCanonicalItemsFromText(itemText);
        for (const key of detected) {
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  return counts;
}

function buildInventoryIndex(inventory: InventoryItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of inventory) {
    const key = item.name.toLowerCase();
    map.set(key, (map.get(key) ?? 0) + item.quantityApprox);
  }
  return map;
}

export function computeShoppingList(
  from: ISODate,
  to: ISODate,
  days: DayLog[],
  inventory: InventoryItem[],
  forDays: number,
): ShoppingList {
  if (days.length === 0) {
    return { from, to, forDays, items: [] };
  }

  const dayCount = days.length || 1;
  const consumptionCounts = aggregateConsumption(days);
  const inventoryIndex = buildInventoryIndex(inventory);

  const items: ShoppingListItem[] = [];

  for (const base of CANONICAL_ITEMS) {
    const totalConsumed = consumptionCounts.get(base.key) ?? 0;
    if (totalConsumed === 0) continue;

    const avgPerDay = totalConsumed / dayCount;
    const needed = avgPerDay * forDays;

    const currentStock =
      inventoryIndex.get(base.key) ??
      inventoryIndex.get(base.key.toLowerCase()) ??
      0;

    const suggested = Math.max(0, Math.round(needed - currentStock));
    if (suggested <= 0) continue;

    items.push({
      name: base.key,
      suggestedQty: suggested,
      unit: base.unit,
    });
  }

  return {
    from,
    to,
    forDays,
    items,
  };
}

