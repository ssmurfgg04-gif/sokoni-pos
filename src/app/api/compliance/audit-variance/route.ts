// Audit Variance Detection API
// Detects discrepancies between eTIMS data and income tax returns
// Based on KRA's 2026 audit priorities: eTIMS vs Income Tax variance
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    // Get current year data
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    
    // === REVENUE ANALYSIS ===
    const invoices = await db.invoice.findMany({
      where: { businessId, status: { not: 'cancelled' }, createdAt: { gte: yearStart } },
      select: { totalAmount: true, totalVat: true, subtotal: true, paymentMethod: true, createdAt: true },
    });

    const totalRevenue = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalVatOutput = invoices.reduce((sum, i) => sum + i.totalVat, 0);
    const cashRevenue = invoices.filter(i => i.paymentMethod === 'cash').reduce((sum, i) => sum + i.totalAmount, 0);
    const mpesaRevenue = invoices.filter(i => i.paymentMethod === 'mpesa').reduce((sum, i) => sum + i.totalAmount, 0);

    // === PURCHASE ANALYSIS ===
    const purchases = await db.purchaseRecord.findMany({
      where: { businessId, purchaseDate: { gte: yearStart } },
      select: { totalAmount: true, totalVat: true, isEtimesCompliant: true, buyerInitiated: true },
    });

    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalVatInput = purchases.reduce((sum, p) => sum + p.totalVat, 0);
    const nonCompliantPurchases = purchases.filter(p => !p.isEtimesCompliant);
    const nonCompliantAmount = nonCompliantPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const buyerInitiatedAmount = purchases.filter(p => p.buyerInitiated).reduce((sum, p) => sum + p.totalAmount, 0);

    // === M-PESA ANALYSIS ===
    const mpesaTxns = await db.mpesaTransaction.findMany({
      where: { businessId, status: 'completed', createdAt: { gte: yearStart } },
      select: { amount: true, reconciled: true },
    });
    const mpesaTotal = mpesaTxns.reduce((sum, t) => sum + t.amount, 0);
    const mpesaReconciled = mpesaTxns.filter(t => t.reconciled).reduce((sum, t) => sum + t.amount, 0);
    const mpesaUnreconciled = mpesaTotal - mpesaReconciled;

    // === VARIANCE DETECTION ===
    const variances: any[] = [];

    // 1. M-Pesa vs Revenue variance
    const mpesaVariance = mpesaTotal - mpesaRevenue;
    if (Math.abs(mpesaVariance) > 1000) {
      variances.push({
        type: 'mpesa_revenue_mismatch',
        severity: Math.abs(mpesaVariance) > 50000 ? 'critical' : Math.abs(mpesaVariance) > 10000 ? 'warning' : 'info',
        title: 'M-Pesa vs Invoiced Revenue Mismatch',
        description: `M-Pesa received KES ${mpesaTotal.toLocaleString()} but only KES ${mpesaRevenue.toLocaleString()} is recorded as M-Pesa invoices.`,
        variance: mpesaVariance,
        risk: Math.abs(mpesaVariance) > 50000 ? 'KRA may flag this as unreported income' : 'Reconcile M-Pesa transactions with invoices',
      });
    }

    // 2. Non-compliant purchase risk
    if (nonCompliantAmount > 0) {
      const vatAtRisk = nonCompliantAmount * 0.16;
      variances.push({
        type: 'non_compliant_purchases',
        severity: nonCompliantAmount > 100000 ? 'critical' : 'warning',
        title: `${nonCompliantPurchases.length} Non-eTIMS Purchases`,
        description: `KES ${nonCompliantAmount.toLocaleString()} in purchases lack eTIMS compliance. KRA may disallow KES ${vatAtRisk.toLocaleString()} in input VAT claims.`,
        variance: -vatAtRisk,
        risk: 'Use Buyer-Initiated Records to claim input VAT from non-compliant suppliers',
      });
    }

    // 3. Cash-heavy business flag
    const cashRatio = totalRevenue > 0 ? cashRevenue / totalRevenue : 0;
    if (cashRatio > 0.6 && totalRevenue > 100000) {
      variances.push({
        type: 'cash_heavy',
        severity: 'warning',
        title: 'High Cash Transaction Ratio',
        description: `${Math.round(cashRatio * 100)}% of your revenue is in cash (KES ${cashRevenue.toLocaleString()}). KRA audits cash-heavy businesses more frequently.`,
        variance: 0,
        risk: 'Ensure every cash sale is recorded and synced to eTIMS. Consider encouraging M-Pesa payments.',
      });
    }

    // 4. M-Pesa unreconciled
    if (mpesaUnreconciled > 5000) {
      variances.push({
        type: 'mpesa_unreconciled',
        severity: mpesaUnreconciled > 50000 ? 'critical' : 'warning',
        title: 'Unreconciled M-Pesa Payments',
        description: `KES ${mpesaUnreconciled.toLocaleString()} in M-Pesa payments are not matched to invoices. This could indicate unrecorded sales.`,
        variance: mpesaUnreconciled,
        risk: 'Run Smart Reconcile to match M-Pesa payments with invoices. Unreconciled payments may be treated as unreported income.',
      });
    }

    // 5. VAT return check
    const netVat = totalVatOutput - totalVatInput;
    if (totalVatOutput > 0 && totalVatInput === 0) {
      variances.push({
        type: 'no_input_vat',
        severity: 'info',
        title: 'No Input VAT Claimed',
        description: `You\'ve collected KES ${totalVatOutput.toLocaleString()} in output VAT but claimed KES 0 in input VAT. If you have business expenses, you may be overpaying VAT.`,
        variance: 0,
        risk: 'Record purchases with compliant suppliers to claim input VAT and reduce your VAT liability.',
      });
    }

    // Overall audit risk
    const criticalCount = variances.filter(v => v.severity === 'critical').length;
    const warningCount = variances.filter(v => v.severity === 'warning').length;
    const auditRisk: 'low' | 'medium' | 'high' | 'critical' = 
      criticalCount > 0 ? 'critical' : warningCount > 2 ? 'high' : warningCount > 0 ? 'medium' : 'low';

    return NextResponse.json({
      auditRisk,
      variances,
      summary: {
        totalRevenue,
        totalVatOutput,
        totalPurchases,
        totalVatInput,
        netVat,
        cashRevenue,
        mpesaRevenue,
        mpesaTotal,
        mpesaReconciled,
        mpesaUnreconciled,
        nonCompliantPurchases: nonCompliantPurchases.length,
        nonCompliantAmount,
        buyerInitiatedAmount,
        cashRatio: Math.round(cashRatio * 100),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
