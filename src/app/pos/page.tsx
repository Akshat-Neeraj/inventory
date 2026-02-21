import PosClient from '../../components/pos/pos-client';
import { getInventory } from '../../lib/data';

export default async function PosPage() {
  const inventory = await getInventory();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Point of Sale</h1>
          <p className="text-muted-foreground">Click products to add them to the cart</p>
        </div>
      </div>

      <PosClient inventory={inventory} />
    </div>
  );
}
