import type { LucideIcon } from 'lucide-react';

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stockLevel: number;
  lowStockThreshold: number;
  lastSoldDate: string | null;
};

export type SaleItem = {
  itemId: string;
  quantity: number;
  price: number;
};

export type Sale = {
  id: string;
  receiptNumber: number;
  items: SaleItem[];
  total: number;
  profit: number;
  date: string;
};

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};
