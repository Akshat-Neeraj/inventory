'use client';

import { useTransition } from 'react';

import { clearSalesDataAction } from '../../lib/actions';
import { Button } from '../ui/button';

export default function ClearSalesButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      disabled={isPending}
      onClick={() => {
        const ok = confirm('Clear all sales data? This cannot be undone.');
        if (!ok) return;
        startTransition(async () => {
          const res = await clearSalesDataAction();
          if (!res.success) alert(res.message);
        });
      }}
    >
      Clear All Sales Data
    </Button>
  );
}
