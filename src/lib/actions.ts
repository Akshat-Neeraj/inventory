'use server';

import { revalidatePath } from 'next/cache';

import { addInventoryItem, clearSalesData, deleteInventoryItem, processSale, updateInventoryItem } from './data';
import type { SaleItem } from './types';

type ActionResult = { success: true; message: string } | { success: false; message: string };

export async function addInventoryItemAction(input: {
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stockLevel: number;
  lowStockThreshold: number;
}): Promise<ActionResult> {
  try {
    await addInventoryItem(input);
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/reports/sales');
    return { success: true, message: 'Product added' };
  } catch {
    return { success: false, message: 'Failed to add product' };
  }
}

export async function updateInventoryItemAction(id: string, updates: { stockLevel?: number }): Promise<ActionResult> {
  try {
    const updated = await updateInventoryItem(id, updates);
    if (!updated) return { success: false, message: 'Product not found' };
    revalidatePath('/');
    revalidatePath('/inventory');
    return { success: true, message: 'Updated' };
  } catch {
    return { success: false, message: 'Failed to update' };
  }
}

export async function deleteInventoryItemAction(id: string): Promise<ActionResult> {
  try {
    const ok = await deleteInventoryItem(id);
    if (!ok) return { success: false, message: 'Product not found' };
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/reports/sales');
    return { success: true, message: 'Deleted' };
  } catch {
    return { success: false, message: 'Failed to delete' };
  }
}

export async function processSaleAction(cart: SaleItem[]): Promise<ActionResult> {
  try {
    const res = await processSale(cart);
    if ('error' in res) return { success: false, message: res.error };
    revalidatePath('/');
    revalidatePath('/inventory');
    revalidatePath('/pos');
    revalidatePath('/reports/sales');
    return { success: true, message: 'Sale processed' };
  } catch {
    return { success: false, message: 'Failed to process sale' };
  }
}

export async function clearSalesDataAction(): Promise<ActionResult> {
  try {
    await clearSalesData();
    revalidatePath('/');
    revalidatePath('/reports/sales');
    return { success: true, message: 'Sales cleared' };
  } catch {
    return { success: false, message: 'Failed to clear sales' };
  }
}
