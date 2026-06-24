// Dashboard API - Enhanced with analytics, daily trends, VAT return data, profit/loss
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Sales metrics
    const salesInvoices = await db.invoice.findMany({
      where: { businessId, status: { not: 'cancelled' }, createdAt: { gte: startOfMonth } },
    });

    const totalSales = salesInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalVat = salesInvoices.reduce((sum, inv) => sum + inv.totalVat, 0);
    const todayInvoices = salesInvoices.filter(inv => new Date(inv.createdAt) >= startOfToday);
    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const weekInvoices = salesInvoices.filter(inv => new Date(inv.createdAt) >= startOfWeek);
    const weekSales = weekInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Payment method breakdown
    const cashSales = salesInvoices.filter(i => i.paymentMethod === 'cash').reduce((s, i) => s + i.totalAmount, 0);
    const mpesaSales = salesInvoices.filter(i => i.paymentMethod === 'mpesa').reduce((s, i) => s + i.totalAmount, 0);
    const bankSales = salesInvoices.filter(i => i.paymentMethod === 'bank_transfer').reduce((s, i) => s + i.totalAmount, 0);
    const creditSales = salesInvoices.filter(i => i.paymentMethod === 'credit').reduce((s, i) => s + i.totalAmount, 0);

    // Sync status counts
    const [queued, syncing, synced, failed, totalInvoices] = await Promise.all([
      db.invoice.count({ where: { businessId, status: 'queued' } }),
      db.invoice.count({ where: { businessId, status: 'syncing' } }),
      db.invoice.count({ where: { businessId, status: 'synced' } }),
      db.invoice.count({ where: { businessId, status: 'failed' } }),
      db.invoice.count({ where: { businessId, status: { not: 'cancelled' } } }),
    ]);

    // Purchase metrics
    const purchases = await db.purchaseRecord.findMany({
      where: { businessId, purchaseDate: { gte: startOfMonth } },
    });
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalInputVat = purchases.reduce((sum, p) => sum + p.totalVat, 0);
    const compliantPurchases = purchases.filter(p => p.isEtimesCompliant).length;
    const nonCompliantPurchases = purchases.filter(p => !p.isEtimesCompliant).length;

    // M-Pesa metrics
    const mpesaTransactions = await db.mpesaTransaction.findMany({
      where: { businessId, status: 'completed' },
    });
    const mpesaReconciled = mpesaTransactions.filter(t => t.reconciled).length;
    const mpesaTotal = mpesaTransactions.reduce((sum, t) => sum + t.amount, 0);
    const mpesaReconciliationRate = mpesaTransactions.length > 0
      ? Math.round((mpesaReconciled / mpesaTransactions.length) * 100 * 10) / 10
      : 0;

    // Recent activity
    const recentInvoices = await db.invoice.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, invoiceNumber: true, buyerName: true, totalAmount: true, status: true, paymentMethod: true, createdAt: true },
    });

    const recentPurchases = await db.purchaseRecord.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, supplierName: true, description: true, totalAmount: true, isEtimesCompliant: true, createdAt: true },
    });

    // Low stock alerts
    const lowStockProducts = await db.product.findMany({
      where: { businessId, isActive: true, quantity: { lte: 10 } },
      take: 5,
    });

    // ===== NEW: Daily sales trend (last 7 days) =====
    const dailyTrend: { date: string; sales: number; invoices: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      
      const dayInvoices = salesInvoices.filter(inv => {
        const d = new Date(inv.createdAt);
        return d >= dayStart && d < dayEnd;
      });
      
      dailyTrend.push({
        date: dayStart.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' }),
        sales: Math.round(dayInvoices.reduce((s, inv) => s + inv.totalAmount, 0) * 100) / 100,
        invoices: dayInvoices.length,
      });
    }

    // ===== NEW: VAT Return Summary =====
    const vatPayable = totalVat; // Output VAT
    const vatRecoverable = totalInputVat; // Input VAT
    const netVat = vatPayable - vatRecoverable;

    // ===== NEW: Profit/Loss Summary =====
    const costOfGoods = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const grossProfit = totalSales - costOfGoods;
    const grossProfitMargin = totalSales > 0 ? Math.round((grossProfit / totalSales) * 100 * 10) / 10 : 0;

    // ===== NEW: Top selling products =====
    const allInvoiceItems = await db.invoiceItem.findMany({
      where: { invoice: { businessId, status: { not: 'cancelled' }, createdAt: { gte: startOfMonth } } },
      include: { product: { select: { id: true, name: true, category: true } } },
    });

    const productSalesMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>();
    allInvoiceItems.forEach(item => {
      const key = item.productId || item.itemName;
      const existing = productSalesMap.get(key) || { name: item.itemName, category: item.product?.category || 'Other', quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.lineTotal;
      productSalesMap.set(key, existing);
    });
    const topProducts = Array.from(productSalesMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ===== NEW: Notifications =====
    const notifications: { id: string; type: 'error' | 'warning' | 'info'; title: string; message: string; time: string; action?: string }[] = [];
    
    if (failed > 0) {
      notifications.push({ id: 'n1', type: 'error', title: 'Failed KRA Sync', message: `${failed} invoice(s) failed to sync with KRA. Action required to maintain compliance.`, time: 'Now', action: 'invoices' });
    }
    if (nonCompliantPurchases > 0) {
      notifications.push({ id: 'n2', type: 'warning', title: 'Non-Compliant Purchases', message: `${nonCompliantPurchases} purchase(s) from non-eTIMS suppliers. These expenses may be disallowed by KRA.`, time: 'This month', action: 'purchases' });
    }
    if (lowStockProducts.length > 0) {
      notifications.push({ id: 'n3', type: 'warning', title: 'Low Stock Alert', message: `${lowStockProducts.length} product(s) are running low on stock.`, time: 'Now', action: 'products' });
    }
    if (queued > 0) {
      notifications.push({ id: 'n4', type: 'info', title: 'Pending Sync', message: `${queued} invoice(s) queued for KRA sync. Will auto-retry.`, time: 'Now', action: 'invoices' });
    }
    if (mpesaReconciliationRate < 100 && mpesaTransactions.length > 0) {
      const unmatched = mpesaTransactions.filter(t => !t.reconciled).length;
      notifications.push({ id: 'n5', type: 'info', title: 'M-Pesa Reconciliation', message: `${unmatched} M-Pesa transaction(s) need reconciliation.`, time: 'Now', action: 'mpesa' });
    }
    if (notifications.length === 0) {
      notifications.push({ id: 'n0', type: 'info', title: 'All Clear', message: 'No pending actions. Your business is fully compliant!', time: 'Now' });
    }

    // Compliance score calculation
    const syncRate = totalInvoices > 0 ? (synced / totalInvoices) * 100 : 100;
    const purchaseComplianceRate = purchases.length > 0 ? (compliantPurchases / purchases.length) * 100 : 100;
    const complianceScore = Math.round((syncRate * 0.6 + purchaseComplianceRate * 0.3 + mpesaReconciliationRate * 0.1));

    return NextResponse.json({
      sales: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalVat: Math.round(totalVat * 100) / 100,
        todaySales: Math.round(todaySales * 100) / 100,
        weekSales: Math.round(weekSales * 100) / 100,
        invoiceCount: salesInvoices.length,
        averageInvoiceValue: salesInvoices.length > 0 ? Math.round((totalSales / salesInvoices.length) * 100) / 100 : 0,
        paymentBreakdown: { cash: cashSales, mpesa: mpesaSales, bank: bankSales, credit: creditSales },
      },
      sync: { queued, syncing, synced, failed, total: totalInvoices, syncRate: Math.round(syncRate * 10) / 10 },
      purchases: { total: totalPurchases, inputVat: totalInputVat, count: purchases.length, compliant: compliantPurchases, nonCompliant: nonCompliantPurchases, complianceRate: Math.round(purchaseComplianceRate * 10) / 10 },
      mpesa: { totalTransactions: mpesaTransactions.length, totalAmount: mpesaTotal, reconciled: mpesaReconciled, reconciliationRate: mpesaReconciliationRate },
      compliance: { score: complianceScore, status: complianceScore >= 90 ? 'good' : complianceScore >= 70 ? 'warning' : 'critical' },
      recent: { invoices: recentInvoices, purchases: recentPurchases },
      alerts: { lowStock: lowStockProducts, failedSyncs: failed, nonCompliantPurchases },
      // NEW
      dailyTrend,
      vatReturn: { vatPayable: Math.round(vatPayable * 100) / 100, vatRecoverable: Math.round(vatRecoverable * 100) / 100, netVat: Math.round(netVat * 100) / 100, period: startOfMonth.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }) },
      profitLoss: { revenue: Math.round(totalSales * 100) / 100, costOfGoods: Math.round(costOfGoods * 100) / 100, grossProfit: Math.round(grossProfit * 100) / 100, grossProfitMargin, netVat: Math.round(netVat * 100) / 100 },
      topProducts,
      notifications,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
