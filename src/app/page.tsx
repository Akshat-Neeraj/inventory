import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui';

import { getInventory, getSales } from '../lib/data';

export default async function DashboardPage() {
  const [inventory, sales] = await Promise.all([getInventory(), getSales()]);
  const totalProducts = inventory.length;
  const lowStockItems = inventory.filter((i) => i.stockLevel <= i.lowStockThreshold).length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const latestSale = sales[0] ?? null;

  const latestSaleLines = latestSale?.items.reduce((sum, l) => sum + l.quantity, 0) ?? 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Overview of your shop performance</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
            <p className="text-sm text-muted-foreground">Products in inventory</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{lowStockItems}</div>
            <p className="text-sm text-muted-foreground">Items need restock</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">From sales</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalProfit.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Net profit</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/inventory/add">
              <Button className="w-full">Add New Product</Button>
            </Link>
            <Link href="/pos">
              <Button variant="secondary" className="w-full">Process Sale</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestSale ? (
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <p className="font-medium">Receipt #{String(latestSale.receiptNumber).padStart(6, '0')}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(latestSale.date).toLocaleString()} • {latestSaleLines} items
                </p>
                <p className="font-semibold">₹{latestSale.total.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">₹{latestSale.profit.toLocaleString()} profit</p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No sales yet
              </div>
            )}
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <p className="font-medium">Low Stock Alert</p>
              <p className="text-sm text-muted-foreground">{lowStockItems} items need restocking</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
