// Dashboard API - Compliance metrics & summary
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get current period dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Sales metrics
    const salesInvoices = await db.invoice.findMany({
      where: {
        businessId,
        status: { not: 'cancelled' },
        createdAt: { gte: startOfMonth },
      },
    });

    const totalSales = salesInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalVat = salesInvoices.reduce((sum, inv) => sum + inv.totalVat, 0);
    const todayInvoices = salesInvoices.filter(inv => new Date(inv.createdAt) >= startOfToday);
    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

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

    // Recent activity (last 10 events)
    const recentInvoices = await db.invoice.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        buyerName: true,
        totalAmount: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
      },
    });

    const recentPurchases = await db.purchaseRecord.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        supplierName: true,
        description: true,
        totalAmount: true,
        isEtimesCompliant: true,
        createdAt: true,
      },
    });

    // Low stock alerts
    const lowStockProducts = await db.product.findMany({
      where: {
        businessId,
        isActive: true,
        quantity: { lte: 10 },
      },
      take: 5,
    });

    // Compliance score calculation
    const syncRate = totalInvoices > 0 ? (synced / totalInvoices) * 100 : 100;
    const purchaseComplianceRate = purchases.length > 0
      ? (compliantPurchases / purchases.length) * 100
      : 100;
    const complianceScore = Math.round((syncRate * 0.6 + purchaseComplianceRate * 0.3 + mpesaReconciliationRate * 0.1));

    return NextResponse.json({
      sales: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalVat: Math.round(totalVat * 100) / 100,
        todaySales: Math.round(todaySales * 100) / 100,
        invoiceCount: salesInvoices.length,
        averageInvoiceValue: salesInvoices.length > 0 ? Math.round((totalSales / salesInvoices.length) * 100) / 100 : 0,
      },
      sync: {
        queued,
        syncing,
        synced,
        failed,
        total: totalInvoices,
        syncRate: Math.round(syncRate * 10) / 10,
      },
      purchases: {
        total: totalPurchases,
        inputVat: totalInputVat,
        count: purchases.length,
        compliant: compliantPurchases,
        nonCompliant: nonCompliantPurchases,
        complianceRate: Math.round(purchaseComplianceRate * 10) / 10,
      },
      mpesa: {
        totalTransactions: mpesaTransactions.length,
        totalAmount: mpesaTotal,
        reconciled: mpesaReconciled,
        reconciliationRate: mpesaReconciliationRate,
      },
      compliance: {
        score: complianceScore,
        status: complianceScore >= 90 ? 'good' : complianceScore >= 70 ? 'warning' : 'critical',
      },
      recent: {
        invoices: recentInvoices,
        purchases: recentPurchases,
      },
      alerts: {
        lowStock: lowStockProducts,
        failedSyncs: failed,
        nonCompliantPurchases,
      },
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
