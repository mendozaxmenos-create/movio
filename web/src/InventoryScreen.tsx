import { useEffect, useState } from 'react';
import { addInventoryItem, fetchInventory, fetchShoppingList } from './api';
import type { InventoryItem, ShoppingListItem } from './types';

interface Props {
  onBack: () => void;
}

export function InventoryScreen({ onBack }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const inv = await fetchInventory();
      setItems(inv.items);
      const list = await fetchShoppingList(3);
      setShoppingItems(list.shoppingList.items);
    } catch (e) {
      setError('No pudimos cargar inventario y sugerencias. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function handleAdd() {
    const name = window.prompt('¿Qué tenés? Ej: palta, empanadas, yogur descremado');
    if (!name) return;
    const qtyRaw = window.prompt('¿Cantidad aproximada? (por ejemplo 4)', '1');
    if (!qtyRaw) return;
    const qty = Number(qtyRaw.replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) return;
    const unit = window.prompt('Unidad (opcional). Ej: unidad, paquete, porción', 'unidad') || undefined;

    await addInventoryItem({
      name,
      quantityApprox: qty,
      unit,
    });
    await loadAll();
  }

  async function handleRefreshShopping() {
    setLoading(true);
    try {
      const list = await fetchShoppingList(3);
      setShoppingItems(list.shoppingList.items);
    } catch {
      // ignore, error ya se maneja en loadAll
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <div>
          <div className="screen-title">Compras</div>
          <div className="screen-subtitle">
            Lo que tenés hoy y lo mínimo que conviene comprar para los próximos días.
          </div>
        </div>
        <button className="screen-chip" onClick={onBack}>
          Volver a Hoy
        </button>
      </header>
      <main className="screen-main">
        {loading && <div className="status">Cargando inventario y sugerencias...</div>}
        {error && <div className="status status-error">{error}</div>}

        {!loading && !error && (
          <>
            <section className="section">
              <div className="section-header">
                <div className="section-title">Lo que hay</div>
                <button className="section-action" onClick={handleAdd}>
                  Agregar
                </button>
              </div>
              {items.length === 0 ? (
                <div className="section-empty">
                  Todavía no cargaste nada. Podés empezar por lo que querés aprovechar: empanadas,
                  sándwiches, paltas, yogur, bananas...
                </div>
              ) : (
                <ul className="list">
                  {items.map(item => (
                    <li key={item.id} className="list-item">
                      <div className="list-main">
                        <span className="list-name">{item.name}</span>
                        <span className="list-qty">
                          {item.quantityApprox} {item.unit ?? ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="section">
              <div className="section-header">
                <div className="section-title">Sugerencia de compras (3 días)</div>
                <button className="section-action" onClick={handleRefreshShopping}>
                  Actualizar
                </button>
              </div>
              {shoppingItems.length === 0 ? (
                <div className="section-empty">
                  Con lo que venís comiendo y lo que tenés, no hace falta comprar nada más para estos
                  días. Podés seguir usando sobras e inventario.
                </div>
              ) : (
                <ul className="list">
                  {shoppingItems.map(item => (
                    <li key={item.name} className="list-item">
                      <div className="list-main">
                        <span className="list-name">{item.name}</span>
                        <span className="list-qty">
                          {item.suggestedQty} {item.unit ?? ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

