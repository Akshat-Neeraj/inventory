'use client';

import { useEffect, useState, useTransition } from 'react';

import { updateInventoryItemAction } from '../../lib/actions';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function EditableStockCell({
  id,
  stockLevel,
  lowStockThreshold,
}: {
  id: string;
  stockLevel: number;
  lowStockThreshold: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(stockLevel));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isEditing) setValue(String(stockLevel));
  }, [stockLevel, isEditing]);

  const save = () => {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) {
      alert('Stock must be 0 or more');
      return;
    }

    startTransition(async () => {
      const res = await updateInventoryItemAction(id, { stockLevel: next });
      if (!res.success) {
        alert(res.message);
        return;
      }
      setIsEditing(false);
      if (next > 0 && next <= lowStockThreshold) {
        alert('Low stock warning: please restock soon');
      }
      // Force hard refresh with cache bypass for mobile
      window.location.href = window.location.href;
    });
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        className="rounded-md px-2 py-1 text-left hover:bg-accent/40"
        onClick={() => setIsEditing(true)}
      >
        {stockLevel}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-24"
        inputMode="numeric"
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        disabled={isPending}
      />
      <Button size="sm" onClick={save} disabled={isPending}>
        Save
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsEditing(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}
