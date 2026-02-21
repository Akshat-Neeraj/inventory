import ClearSalesButton from '../../../components/reports/clear-sales-button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui';
import { getInventory, getSales } from '../../../lib/data';

export default async function SalesReportPage() {
  const [inventory, sales] = await Promise.all([getInventory(), getSales()]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const totalSales = sales.length;
  const averageSaleValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
  const itemsSold = sales.reduce((sum, s) => sum + s.items.reduce((s2, l) => s2 + l.quantity, 0), 0);

  const inventoryById = new Map(inventory.map((i) => [i.id, i] as const));
  const agg = new Map<string, { itemId: string; revenue: number; quantity: number }>();
  for (const sale of sales) {
    for (const line of sale.items) {
      const current = agg.get(line.itemId) ?? { itemId: line.itemId, revenue: 0, quantity: 0 };
      current.quantity += line.quantity;
      current.revenue += line.price * line.quantity;
      agg.set(line.itemId, current);
    }
  }

  const topProducts = [...agg.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => {
      const item = inventoryById.get(p.itemId);
      return {
        name: item?.name ?? p.itemId,
        category: item?.category ?? '—',
        revenue: p.revenue,
        quantity: p.quantity,
      };
    });

  const lowStockItems = inventory
    .filter((i) => i.stockLevel <= i.lowStockThreshold)
    .sort((a, b) => a.stockLevel - b.stockLevel)
    .slice(0, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Sales and inventory health at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">{totalSales} sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalProfit.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">
              {totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0}% profit margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{averageSaleValue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{itemsSold.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total items sold</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No sales yet
                </div>
              ) : (
                topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹{product.revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{product.quantity} sold</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No low stock items
                </div>
              ) : (
                lowStockItems.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3">
                    <div>
                      <p className="font-medium">{i.name}</p>
                      <p className="text-sm text-muted-foreground">{i.category}</p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">Low Stock</span>
                      <p className="font-bold text-red-600">{i.stockLevel}</p>
                      <p className="text-sm text-muted-foreground">Threshold: {i.lowStockThreshold}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="max-w-sm">
          <ClearSalesButton />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">This action cannot be undone. Use with caution.</p>
      </div>
    </div>
  );
 }
