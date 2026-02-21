'use server';

import { revalidatePath } from 'next/cache';
import { 
  addInventoryItem, 
  clearSalesData, 
  deleteInventoryItem, 
  processSale, 
  updateInventoryItem 
} from './data';
import type { SaleItem } from './types';

type ActionResult = { success: true; message: string } | { success: false; message: string };

// Helper to revalidate all necessary paths
function revalidateAll() {
  revalidatePath('/', 'layout'); // Clears everything including dashboard stats
  revalidatePath('/inventory');
  revalidatePath('/pos');
  revalidatePath('/reports/sales');
}

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
    revalidateAll(); 
    return { success: true, message: 'Product added successfully' };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to add product' };
  }
}

export async function updateInventoryItemAction(
  id: string, 
  updates: { stockLevel?: number; price?: number; costPrice?: number; name?: string; category?: string; lowStockThreshold?: number }
): Promise<ActionResult> {
  try {
    const updated = await updateInventoryItem(id, updates);
    if (!updated) return { success: false, message: 'Product not found' };
    revalidateAll();
    return { success: true, message: 'Product updated successfully' };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to update product' };
  }
}

export async function deleteInventoryItemAction(id: string): Promise<ActionResult> {
  try {
    const ok = await deleteInventoryItem(id);
    if (!ok) return { success: false, message: 'Product not found or could not be deleted' };
    revalidateAll(); // Critical: Updates POS so deleted item disappears from lists
    return { success: true, message: 'Product and related sales deleted' };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to delete product' };
  }
}

export async function processSaleAction(cart: SaleItem[]): Promise<ActionResult> {
  try {
    const res = await processSale(cart);
    if ('error' in res) return { success: false, message: res.error };
    revalidateAll();
    return { success: true, message: 'Sale processed successfully' };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to process sale' };
  }
}

export async function clearSalesDataAction(): Promise<ActionResult> {
  try {
    await clearSalesData();
    revalidateAll();
    return { success: true, message: 'All sales history cleared' };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to clear sales' };
  }
}