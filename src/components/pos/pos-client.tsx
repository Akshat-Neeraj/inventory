'use client';

import { useMemo, useRef, useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import type { InventoryItem } from '../../lib/types';
import { processSaleAction } from '../../lib/actions';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type CartLine = {
  itemId: string;
  name: string;
  category: string;
  price: number;
  stockLevel: number;
  quantity: number;
};

export default function PosClient({ inventory }: { inventory: InventoryItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<CartLine[]>([]);
  const cartRef = useRef<HTMLDivElement | null>(null);

  // 1. Auto-cleanup: If an item is deleted from DB, remove it from Cart automatically
  // This runs whenever 'inventory' updates (which happens after router.refresh)
  useEffect(() => {
    setCart((prev) => 
      prev.filter((cartItem) => 
        inventory.some((invItem) => invItem.id === cartItem.itemId)
      )
    );
  }, [inventory]);

  // 2. Calculate current quantities in cart
  const cartQtyById = useMemo(() => {
    const m = new Map<string, number>();
    for (const line of cart) {
      m.set(line.itemId, (m.get(line.itemId) ?? 0) + line.quantity);
    }
    return m;
  }, [cart]);

  // 3. Derived state for products (calculating availability)
  const products = useMemo(() => {
    return inventory.map((p) => {
      const inCart = cartQtyById.get(p.id) ?? 0;
      return {
        ...p,
        available: Math.max(0, p.stockLevel - inCart),
      };
    });
  }, [inventory, cartQtyById]);

  // 4. Helper Functions
  const addToCart = (p: { id: string; name: string; category: string; price: number; stockLevel: number; available: number }) => {
    if (p.available <= 0) {
      // Optional: You could use a Toast notification here instead of alert
      alert('This product is out of stock');
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.itemId === p.id);
      if (idx === -1) {
        return [
          ...prev, 
          { itemId: p.id, name: p.name, category: p.category, price: p.price, stockLevel: p.stockLevel, quantity: 1 }
        ];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      return next;
    });
  };

  const dec = (itemId: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.itemId === itemId);
      if (idx === -1) return prev;
      const line = prev[idx];
      if (line.quantity <= 1) return prev.filter((x) => x.itemId !== itemId);
      const next = [...prev];
      next[idx] = { ...line, quantity: line.quantity - 1 };
      return next;
    });
  };

  const inc = (itemId: string) => {
    const prod = products.find((p) => p.id === itemId);
    if (!prod || prod.available <= 0) return;
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.itemId === itemId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      return next;
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => prev.filter((x) => x.itemId !== itemId));
  };

  const total = useMemo(() => cart.reduce((sum, l) => sum + l.price * l.quantity, 0), [cart]);

  // 5. The Critical Fix: Soft Refresh
  const completeSale = () => {
    if (cart.length === 0) return;

    startTransition(async () => {
      const saleData = cart.map((l) => ({ 
        itemId: l.itemId, 
        quantity: l.quantity, 
        price: l.price 
      }));

      const res = await processSaleAction(saleData);

      if (!res.success) {
        alert(res.message);
        return;
      }

      alert('Sale completed successfully!');
      setCart([]); // Clear UI immediately
      router.refresh(); // Fetch new stock levels from server without page reload
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Product Grid */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={
                    `rounded-lg border border-border p-3 text-left transition-all active:scale-[0.98] ` +
                    (p.available <= 0 ? 'opacity-50 bg-muted/50 cursor-not-allowed' : 'hover:bg-accent/40 hover:border-primary/50')
                  }
                  onClick={() => addToCart(p)}
                  disabled={p.available <= 0 || isPending}
                >
                  <div className="mb-1 text-sm font-medium line-clamp-2">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                  <div className="mt-2 text-base font-semibold">₹{p.price}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {p.available === 0 ? 'No Stock' : `Stock: ${p.stockLevel}`}
                  </div>
                  {p.available <= 0 && <div className="mt-2 text-xs font-semibold text-destructive">Out of Stock</div>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart Sidebar */}
      <div className="lg:col-span-1" ref={cartRef}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shopping Cart</CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Cart is empty
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((line) => (
                  <div key={line.itemId} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{line.name}</h4>
                      <p className="text-sm text-muted-foreground">₹{line.price} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => dec(line.itemId)} disabled={isPending}>
                        −
                      </Button>
                      <span className="w-8 text-center text-sm">{line.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => inc(line.itemId)}
                        disabled={isPending || (products.find((p) => p.id === line.itemId)?.available ?? 0) <= 0}
                      >
                        +
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(line.itemId)}
                        disabled={isPending}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="border-t border-border pt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-lg font-bold">₹{total.toLocaleString()}</span>
                  </div>
                  <Button className="w-full" onClick={completeSale} disabled={isPending}>
                    {isPending ? 'Processing...' : 'Complete Sale'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur lg:hidden pb-safe">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              className="min-w-0 text-left"
              onClick={() => cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <div className="text-xs text-muted-foreground">Cart total</div>
              <div className="truncate text-base font-semibold">₹{total.toLocaleString()}</div>
            </button>
            <Button onClick={completeSale} disabled={isPending}>
              {isPending ? 'Processing...' : 'Complete Sale'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}