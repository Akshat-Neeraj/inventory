import Link from 'next/link';
import InventoryTable from '../../components/inventory/inventory-table';
import { Button } from '../../components/ui';
import { getInventory } from '../../lib/data';

export default async function InventoryPage() {
  const items = await getInventory();

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Inventory</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Manage products, pricing, and stock levels</p>
        </div>

        <Link href="/inventory/add">
          <Button className="w-full sm:w-auto">Add New Product</Button>
        </Link>
      </div>

      <InventoryTable items={items} />
    </div>
  );
 }
