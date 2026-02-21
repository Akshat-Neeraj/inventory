'use client';

import { useTransition } from 'react';
import type { InventoryItem } from '../../lib/types';
import { deleteInventoryItemAction } from '../../lib/actions';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import EditableStockCell from './editable-stock-cell';

function getStatus(item: InventoryItem) {
  if (item.stockLevel <= 0) return 'out';
  if (item.stockLevel <= item.lowStockThreshold) return 'low';
  return 'in';
}

export default function InventoryTable({ items }: { items: InventoryItem[] }) {
  const [isPending, startTransition] = useTransition();

  const onDelete = (id: string) => {
    // 1. Confirmation
    const ok = confirm('Are you sure you want to delete this product? This will also remove it from sales history.');
    if (!ok) return;

    // 2. Server Action with Auto-Refresh
    startTransition(async () => {
      const res = await deleteInventoryItemAction(id);
      
      if (!res.success) {
        alert(res.message);
      } 
      // No need for window.location.href! 
      // revalidatePath in actions.ts will automatically trigger a UI update.
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Product List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden lg:table-cell">Cost</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last Sold</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const status = getStatus(item);
                return (
                  <TableRow key={item.id} className={isPending ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{item.category}</TableCell>
                    <TableCell>₹{item.price}</TableCell>
                    <TableCell className="hidden lg:table-cell">₹{item.costPrice}</TableCell>
                    <TableCell>
                      <EditableStockCell
                        id={item.id}
                        stockLevel={item.stockLevel}
                        lowStockThreshold={item.lowStockThreshold}
                      />
                    </TableCell>
                    <TableCell>
                      {status === 'out' ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : status === 'low' ? (
                        <Badge variant="outline">Low Stock</Badge>
                      ) : (
                        <Badge variant="secondary">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {item.lastSoldDate ? new Date(item.lastSoldDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(item.id)}
                        disabled={isPending}
                      >
                        {isPending ? 'Deleting...' : 'Delete'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}