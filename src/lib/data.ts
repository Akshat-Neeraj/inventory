import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getSupabaseAdmin } from './supabase-server';
import type { InventoryItem, Sale, SaleItem } from './types';

// Check environment once
const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- Type Definitions ---
type DbInventoryRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost_price: number;
  stock_level: number;
  low_stock_threshold: number;
  last_sold_date: string | null;
  created_at?: string;
};

type DbSaleRow = {
  id: string;
  receipt_number: number;
  items: SaleItem[] | string; // Supabase returns JSONB as string or object depending on config
  total: number;
  profit: number;
  date: string;
  created_at?: string;
};

type DbState = {
  inventory: InventoryItem[];
  sales: Sale[];
  nextSaleNumber: number;
};

// --- Global Cache for Local Dev ---
declare global {
  var __inventoryProDb: DbState | undefined;
  var __inventoryProDbInit: Promise<void> | undefined;
  var __inventoryProDbWrite: Promise<void> | undefined;
}

// --- Helpers ---
function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapInventoryRow(row: DbInventoryRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    costPrice: Number(row.cost_price),
    stockLevel: Number(row.stock_level),
    lowStockThreshold: Number(row.low_stock_threshold),
    lastSoldDate: row.last_sold_date,
  };
}

function mapSaleRow(row: DbSaleRow): Sale {
  // Handle potential stringified JSON from DB
  const parsedItems = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    items: parsedItems,
    total: Number(row.total),
    profit: Number(row.profit),
    date: row.date,
  };
}

// --- Local JSON DB Management ---
function getDbFilePath() {
  return path.join(process.cwd(), 'data', 'inventorypro-db.json');
}

function getDb(): DbState {
  if (!globalThis.__inventoryProDb) {
    globalThis.__inventoryProDb = { inventory: [], sales: [], nextSaleNumber: 1 };
  }
  return globalThis.__inventoryProDb;
}

async function ensureDbLoaded() {
  if (globalThis.__inventoryProDbInit) {
    await globalThis.__inventoryProDbInit;
    return;
  }
  globalThis.__inventoryProDbInit = (async () => {
    try {
      const raw = await readFile(getDbFilePath(), 'utf8');
      const parsed = JSON.parse(raw);
      // Basic normalization logic
      if (parsed && Array.isArray(parsed.inventory)) {
        globalThis.__inventoryProDb = parsed;
        return;
      }
    } catch { /* ignore missing file */ }
    const db = getDb();
    await persistDb(db);
  })();
  await globalThis.__inventoryProDbInit;
}

async function persistDb(db: DbState) {
  const filePath = getDbFilePath();
  const previous = globalThis.__inventoryProDbWrite ?? Promise.resolve();
  globalThis.__inventoryProDbWrite = previous.then(async () => {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(db, null, 2), 'utf8');
  });
  await globalThis.__inventoryProDbWrite;
}

// --- CRUD Operations ---

export async function getInventory(): Promise<InventoryItem[]> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as DbInventoryRow[]).map(mapInventoryRow);
    }
  }
  await ensureDbLoaded();
  return [...getDb().inventory];
}

export async function getSales(): Promise<Sale[]> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data as DbSaleRow[]).map(mapSaleRow);
    }
  }
  await ensureDbLoaded();
  return [...getDb().sales];
}

export async function addInventoryItem(
  item: Omit<InventoryItem, 'id' | 'lastSoldDate'> & { lastSoldDate?: string | null },
): Promise<InventoryItem> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          name: item.name,
          category: item.category,
          price: item.price,
          cost_price: item.costPrice,
          stock_level: item.stockLevel,
          low_stock_threshold: item.lowStockThreshold,
          last_sold_date: item.lastSoldDate ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapInventoryRow(data as DbInventoryRow);
    }
  }

  await ensureDbLoaded();
  const db = getDb();
  const newItem: InventoryItem = {
    id: createId(),
    lastSoldDate: item.lastSoldDate ?? null,
    name: item.name,
    category: item.category,
    price: item.price,
    costPrice: item.costPrice,
    stockLevel: item.stockLevel,
    lowStockThreshold: item.lowStockThreshold,
  };
  db.inventory = [newItem, ...db.inventory];
  await persistDb(db);
  return newItem;
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Omit<InventoryItem, 'id'>>,
): Promise<InventoryItem | null> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const patch: Record<string, any> = {};
      if (updates.stockLevel !== undefined) patch.stock_level = updates.stockLevel;
      if (updates.lowStockThreshold !== undefined) patch.low_stock_threshold = updates.lowStockThreshold;
      if (updates.lastSoldDate !== undefined) patch.last_sold_date = updates.lastSoldDate;
      if (updates.price !== undefined) patch.price = updates.price;
      if (updates.costPrice !== undefined) patch.cost_price = updates.costPrice;
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.category !== undefined) patch.category = updates.category;

      const { data, error } = await supabase
        .from('inventory_items')
        .update(patch)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapInventoryRow(data as DbInventoryRow);
    }
  }

  await ensureDbLoaded();
  const db = getDb();
  const idx = db.inventory.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const updated = { ...db.inventory[idx], ...updates };
  db.inventory[idx] = updated;
  await persistDb(db);
  return updated;
}

// ---------------- UPDATED & FIXED DELETE FUNCTION ----------------
export async function deleteInventoryItem(id: string): Promise<boolean> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        // 1. Fetch sales that might contain this item
        // Note: For very large DBs, this requires a JSONB index or a different structure.
        // For standard shop inventory, this is acceptable.
        const { data: sales, error: fetchError } = await supabase
          .from('sales')
          .select('id, items');

        if (fetchError) throw fetchError;

        if (sales && sales.length > 0) {
          const salesToDelete = sales
            .filter((sale) => {
              const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
              return Array.isArray(items) && items.some((i: any) => i.itemId === id);
            })
            .map((s) => s.id);

          // 2. Delete related sales first (Cleanup)
          if (salesToDelete.length > 0) {
            const { error: deleteSalesError } = await supabase
              .from('sales')
              .delete()
              .in('id', salesToDelete);
            if (deleteSalesError) throw deleteSalesError;
          }
        }

        // 3. Delete the inventory item
        const { error: deleteItemError } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', id);

        if (deleteItemError) throw deleteItemError;

        return true;
      } catch (err) {
        console.error('Delete operation failed:', err);
        return false;
      }
    }
  }

  // Local Fallback
  await ensureDbLoaded();
  const db = getDb();
  const initialSalesCount = db.sales.length;
  
  // Filter out sales containing the item
  db.sales = db.sales.filter((sale) => !sale.items.some((item) => item.itemId === id));
  
  // Filter out the item
  const initialInventoryCount = db.inventory.length;
  db.inventory = db.inventory.filter((i) => i.id !== id);

  if (db.inventory.length === initialInventoryCount) return false; // Item didn't exist

  await persistDb(db);
  return true;
}

export async function processSale(
  cart: SaleItem[],
): Promise<{ sale: Sale; updatedInventory: InventoryItem[] } | { error: string }> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      // Use RPC for atomic transaction if available, otherwise fallback logic could be here
      // Assuming RPC 'process_sale' exists and handles stock deduction
      const { data, error } = await supabase.rpc('process_sale', { cart });
      
      if (error) {
        // Fallback: If RPC fails or doesn't exist, we might want to do it manually (omitted for brevity)
        return { error: error.message };
      }

      // Supabase RPC usually returns the inserted sale record. 
      // We need to fetch the updated inventory to keep frontend in sync.
      const sale = mapSaleRow(data as DbSaleRow);
      const updatedInventory = await getInventory(); 
      
      return { sale, updatedInventory };
    }
  }

  // Local Fallback
  await ensureDbLoaded();
  const db = getDb();

  // Validate Stock
  for (const line of cart) {
    const item = db.inventory.find((i) => i.id === line.itemId);
    if (!item) return { error: `Item not found: ${line.itemId}` };
    if (item.stockLevel < line.quantity) return { error: `Not enough stock for ${item.name}` };
  }

  const now = new Date().toISOString();
  let total = 0;
  let profit = 0;
  const receiptNumber = db.nextSaleNumber++;

  const updatedInventory = db.inventory.map((item) => {
    const line = cart.find((c) => c.itemId === item.id);
    if (!line) return item;
    
    total += line.price * line.quantity;
    profit += (line.price - item.costPrice) * line.quantity;
    
    return {
      ...item,
      stockLevel: item.stockLevel - line.quantity,
      lastSoldDate: now,
    };
  });

  const sale: Sale = {
    id: createId(),
    receiptNumber,
    items: cart,
    total,
    profit,
    date: now,
  };

  db.inventory = updatedInventory;
  db.sales = [sale, ...db.sales];
  await persistDb(db);

  return { sale, updatedInventory };
}

export async function clearSalesData(): Promise<void> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.from('sales').delete().gt('receipt_number', -1);
      if (error) throw error;
      return;
    }
  }
  await ensureDbLoaded();
  const db = getDb();
  db.sales = [];
  await persistDb(db);
}