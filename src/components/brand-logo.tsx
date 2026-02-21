import Link from 'next/link';
import { Package } from 'lucide-react';

export default function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Package className="h-5 w-5 text-primary" />
      <span className="font-headline text-lg font-semibold">InventoryPro</span>
    </Link>
  );
}
