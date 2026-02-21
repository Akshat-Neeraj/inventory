'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { addInventoryItemAction } from '../../lib/actions';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

export default function AddItemForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    costPrice: '',
    stockLevel: '',
    lowStockThreshold: '10',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return alert('Name is required');
    if (!formData.category.trim()) return alert('Category is required');

    const price = Number(formData.price);
    const costPrice = Number(formData.costPrice);
    const stockLevel = Number(formData.stockLevel);
    const lowStockThreshold = Number(formData.lowStockThreshold);

    if (!Number.isFinite(price) || price <= 0) return alert('Price must be positive');
    if (!Number.isFinite(costPrice) || costPrice < 0) return alert('Cost price must be 0 or more');
    if (!Number.isFinite(stockLevel) || stockLevel < 0) return alert('Stock must be 0 or more');
    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) return alert('Low stock threshold must be 0 or more');

    startTransition(async () => {
      const res = await addInventoryItemAction({
        name: formData.name.trim(),
        category: formData.category.trim(),
        price,
        costPrice,
        stockLevel,
        lowStockThreshold,
      });

      if (!res.success) {
        alert(res.message);
        return;
      }

      router.push('/inventory');
      router.refresh();
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Add New Product</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Product Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Apsara Pencil"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Category</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Pencils"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Selling Price</label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Cost Price</label>
              <Input
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Stock Level</label>
              <Input
                type="number"
                value={formData.stockLevel}
                onChange={(e) => setFormData({ ...formData, stockLevel: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Low Stock Threshold</label>
              <Input
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => router.push('/inventory')} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Add Product
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
