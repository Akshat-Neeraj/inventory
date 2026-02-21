import type { LucideIcon } from 'lucide-react';
import { BarChart3, Home, Package, ShoppingCart } from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navLinks: NavLink[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/pos', label: 'New Sale', icon: ShoppingCart },
  { href: '/reports/sales', label: 'Analytics', icon: BarChart3 },
];
