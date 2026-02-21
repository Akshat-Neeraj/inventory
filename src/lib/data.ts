import type { InventoryItem, Sale, SaleItem } from './types';

import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

import { getSupabaseAdmin } from './supabase-server';

const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

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
  items: SaleItem[];
  total: number;
  profit: number;
  date: string;
  created_at?: string;
};

function mapInventoryRow(row: DbInventoryRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    costPrice: row.cost_price,
    stockLevel: row.stock_level,
    lowStockThreshold: row.low_stock_threshold,
    lastSoldDate: row.last_sold_date,
  };
}

function mapSaleRow(row: DbSaleRow): Sale {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    items: row.items,
    total: row.total,
    profit: row.profit,
    date: row.date,
  };
}

type DbState = {
  inventory: InventoryItem[];
  sales: Sale[];
  nextSaleNumber: number;
};

declare global {
  var __inventoryProDb: DbState | undefined;
  var __inventoryProDbInit: Promise<void> | undefined;
  var __inventoryProDbWrite: Promise<void> | undefined;
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDb(): DbState {
  if (!globalThis.__inventoryProDb) {
    globalThis.__inventoryProDb = {
      inventory: [],
      sales: [],
      nextSaleNumber: 1,
    };
  }
  return globalThis.__inventoryProDb;
}

function normalizeDbState(input: unknown): DbState | null {
  if (!input || typeof input !== 'object') return null;
  const parsed = input as Partial<DbState>;
  if (!Array.isArray(parsed.inventory) || !Array.isArray(parsed.sales)) return null;

  const maxReceipt = parsed.sales.reduce((max, s) => {
    const rn = typeof (s as Sale).receiptNumber === 'number' ? (s as Sale).receiptNumber : 0;
    return rn > max ? rn : max;
  }, 0);

  return {
    inventory: parsed.inventory as DbState['inventory'],
    sales: parsed.sales as DbState['sales'],
    nextSaleNumber:
      typeof parsed.nextSaleNumber === 'number' && parsed.nextSaleNumber > 0 ? parsed.nextSaleNumber : maxReceipt + 1,
  };
}

function getDbFilePath() {
  return path.join(process.cwd(), 'data', 'inventorypro-db.json');
}

async function ensureDbLoaded() {
  if (globalThis.__inventoryProDbInit) {
    await globalThis.__inventoryProDbInit;
    return;
  }

  globalThis.__inventoryProDbInit = (async () => {
    const filePath = getDbFilePath();
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      const normalized = normalizeDbState(parsed);
      if (normalized) {
        globalThis.__inventoryProDb = normalized;
        return;
      }
    } catch {
      // ignore
    }

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

export async function getInventory(): Promise<InventoryItem[]> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      await ensureDbLoaded();
      return [...getDb().inventory];
    }
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as DbInventoryRow[]).map(mapInventoryRow);
  }

  await ensureDbLoaded();
  return [...getDb().inventory];
}

export async function getSales(): Promise<Sale[]> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      await ensureDbLoaded();
      return [...getDb().sales];
    }
    const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data as DbSaleRow[]).map(mapSaleRow);
  }

  await ensureDbLoaded();
  return [...getDb().sales];
}

export async function addInventoryItem(
  item: Omit<InventoryItem, 'id' | 'lastSoldDate'> & { lastSoldDate?: string | null },
): Promise<InventoryItem> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      await ensureDbLoaded();
      const db = getDb();
      const newItem: InventoryItem = { ...item, id: createId(), lastSoldDate: null };
      db.inventory.push(newItem);
      await persistDb(db);
      return newItem;
    }
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
    if (!supabase) {
      await ensureDbLoaded();
      const db = getDb();
      const idx = db.inventory.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      const updated = { ...db.inventory[idx], ...updates };
      db.inventory = [...db.inventory.slice(0, idx), updated, ...db.inventory.slice(idx + 1)];
      await persistDb(db);
      return updated;
    }
    const patch: Record<string, unknown> = {};

    if (typeof updates.stockLevel === 'number') patch.stock_level = updates.stockLevel;
    if (typeof updates.lowStockThreshold === 'number') patch.low_stock_threshold = updates.lowStockThreshold;
    if (typeof updates.lastSoldDate === 'string' || updates.lastSoldDate === null) patch.last_sold_date = updates.lastSoldDate;
    if (typeof updates.price === 'number') patch.price = updates.price;
    if (typeof updates.costPrice === 'number') patch.cost_price = updates.costPrice;
    if (typeof updates.name === 'string') patch.name = updates.name;
    if (typeof updates.category === 'string') patch.category = updates.category;

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

  await ensureDbLoaded();
  const db = getDb();
  const idx = db.inventory.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const updated = { ...db.inventory[idx], ...updates };
  db.inventory = [...db.inventory.slice(0, idx), updated, ...db.inventory.slice(idx + 1)];
  await persistDb(db);
  return updated;
}

// ---------------- FIXED DELETE FUNCTION ----------------
export async function deleteInventoryItem(id: string): Promise<boolean> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      await ensureDbLoaded();
      const db = getDb();
      db.inventory = db.inventory.filter((i) => i.id !== id);
      db.sales = db.sales.filter((sale) => !sale.items.some((item) => item.itemId === id));
      await persistDb(db);
      return true;
    }

    try {
      // 1️⃣ Get all sales
      const { data: sales, error } = await supabase
        .from('sales')
        .select('id, items');

      if (error) throw error;

      // 2️⃣ Find sales containing this product
      const salesToDelete: string[] = [];

      for (const sale of sales || []) {
        const items =
          typeof sale.items === 'string'
            ? JSON.parse(sale.items)
            : sale.items || [];

        const containsProduct = items.some(
          (item: any) => item.itemId === id
        );

        if (containsProduct) {
          salesToDelete.push(sale.id);
        }
      }

      // 3️⃣ Delete those sales
      if (salesToDelete.length > 0) {
        await supabase
          .from('sales')
          .delete()
          .in('id', salesToDelete);
      }

      // 4️⃣ Delete the product itself
      await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  // ---------------- Local JSON DB ----------------
  await ensureDbLoaded();
  const db = getDb();

  // Remove inventory item
  db.inventory = db.inventory.filter((i) => i.id !== id);

  // Remove sales that contain this item
  db.sales = db.sales.filter((sale) => !sale.items.some((item) => item.itemId === id));

  await persistDb(db);
  return true;
}
// ---------------------------------------------------------

export async function processSale(
  cart: SaleItem[],
): Promise<{ sale: Sale; updatedInventory: InventoryItem[] } | { error: string }> {
  if (hasSupabase) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      await ensureDbLoaded();
      const db = getDb();
      const inventoryById = new Map(db.inventory.map((i) => [i.id, i] as const));
      
      const sale: Sale = {
        id: createId(),
        receiptNumber: db.nextSaleNumber,
        date: new Date().toISOString(),
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        profit: cart.reduce((sum, item) => {
          const inventoryItem = inventoryById.get(item.itemId);
          if (!inventoryItem) return sum;
          return sum + (item.price - inventoryItem.costPrice) * item.quantity;
        }, 0),
      };
      
      const updatedInventory: InventoryItem[] = [];
      for (const cartItem of cart) {
        const item = db.inventory.find((i) => i.id === cartItem.itemId);
        if (!item) return { error: `Item ${cartItem.itemId} not found` };
        if (item.stockLevel < cartItem.quantity) return { error: `Insufficient stock for ${item.name}` };
        item.stockLevel -= cartItem.quantity;
        item.lastSoldDate = new Date().toISOString();
        updatedInventory.push({ ...item });
      }
      
      db.sales.push(sale);
      db.nextSaleNumber += 1;
      await persistDb(db);
      
      return { sale, updatedInventory };
    }
    const { data, error } = await supabase.rpc('process_sale', { cart });
    if (error) return { error: error.message };
    const sale = mapSaleRow(data as DbSaleRow);
    const updatedInventory = await getInventory();
    return { sale, updatedInventory };
  }

  await ensureDbLoaded();
  const db = getDb();

  for (const line of cart) {
    const item = db.inventory.find((i) => i.id === line.itemId);
    if (!item) return { error: `Item not found: ${line.itemId}` };
    if (line.quantity <= 0) return { error: 'Quantity must be positive' };
    if (item.stockLevel < line.quantity) return { error: `Not enough stock for ${item.name}` };
  }

  let total = 0;
  let profit = 0;
  const now = new Date().toISOString();

  const receiptNumber = db.nextSaleNumber;
  db.nextSaleNumber += 1;

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
    if (!supabase) {
      await ensureDbLoaded();
      const db = getDb();
      db.sales = [];
      await persistDb(db);
      return;
    }
    const { error } = await supabase.from('sales').delete().gt('receipt_number', -1);
    if (error) throw error;
    return;
  }

  await ensureDbLoaded();
  const db = getDb();
  db.sales = [];
  await persistDb(db);
}