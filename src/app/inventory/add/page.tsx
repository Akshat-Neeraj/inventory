import Link from 'next/link';
import AddItemForm from '../../../components/inventory/add-item-form';

export default function AddItemPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        >
          ← Back to Inventory
        </Link>
      </div>

      <AddItemForm />
    </div>
  );
 }
