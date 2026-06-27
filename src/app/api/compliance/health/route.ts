// Compliance Health Check API
// Comprehensive eTIMS compliance audit — the moat
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Check 1: KRA PIN Valid
    const kraPinValid = !!(business.kraPin && business.kraPin.match(/^[A-Z]\d{9}[A-Z]$/));

    // Check 2: eTIMS Onboarded
    const etimsOnboarded = !!(business.kraUsername && business.kraBranchId);

    // Check 3: Invoice Sync Rate
    const totalInvoices = await db.invoice.count({ where: { businessId } });
    const syncedInvoices = await db.invoice.count({ where: { businessId, status: 'synced' } });
    const failedInvoices = await db.invoice.count({ where: { businessId, status: 'failed' } });
    const syncRate = totalInvoices > 0 ? Math.round((syncedInvoices / totalInvoices) * 100) : 100;

    // Check 4: Purchase Compliance
    const totalPurchases = await db.purchaseRecord.count({ where: { businessId } });
    const compliantPurchases = await db.purchaseRecord.count({ where: { businessId, isEtimesCompliant: true } });
    const purchaseComplianceRate = totalPurchases > 0 ? Math.round((compliantPurchases / totalPurchases) * 100) : 100;

    // Check 5: M-Pesa Reconciliation
    const totalMpesa = await db.mpesaTransaction.count({ where: { businessId, status: 'completed' } });
    const reconciledMpesa = await db.mpesaTransaction.count({ where: { businessId, reconciled: true } });
    const mpesaReconRate = totalMpesa > 0 ? Math.round((reconciledMpesa / totalMpesa) * 100) : 100;

    // Check 6: VAT Return Readiness
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthInvoices = await db.invoice.findMany({
      where: { businessId, status: { not: 'cancelled' }, createdAt: { gte: currentMonth } },
      select: { totalVat: true, totalAmount: true },
    });
    const vatPayable = monthInvoices.reduce((sum, inv) => sum + inv.totalVat, 0);
    const monthPurchases = await db.purchaseRecord.findMany({
      where: { businessId, purchaseDate: { gte: currentMonth } },
      select: { totalVat: true },
    });
    const vatRecoverable = monthPurchases.reduce((sum, p) => sum + p.totalVat, 0);
    const netVat = vatPayable - vatRecoverable;

    // Check 7: Credit Note Compliance
    const creditNotes = await db.invoice.count({ 
      where: { businessId, invoiceType: { in: ['credit_note', 'debit_note'] } } 
    });
    const orphanCreditNotes = await db.invoice.count({
      where: { businessId, invoiceType: { in: ['credit_note', 'debit_note'] }, relatedInvoiceId: null },
    });

    // Check 8: Product Item Codes
    const totalProducts = await db.product.count({ where: { businessId, isActive: true } });
    const productsWithItemCode = await db.product.count({ 
      where: { businessId, isActive: true, itemCode: { not: null } } 
    });
    const itemCodeCoverage = totalProducts > 0 ? Math.round((productsWithItemCode / totalProducts) * 100) : 0;

    // Calculate overall score
    const checks = [
      { name: 'KRA PIN Format', passed: kraPinValid, weight: 10, critical: true },
      { name: 'eTIMS Onboarded', passed: etimsOnboarded, weight: 20, critical: true },
      { name: 'Invoice Sync Rate ≥95%', passed: syncRate >= 95, weight: 20, critical: true },
      { name: 'Purchase Compliance ≥80%', passed: purchaseComplianceRate >= 80, weight: 15, critical: false },
      { name: 'M-Pesa Reconciliation ≥90%', passed: mpesaReconRate >= 90, weight: 10, critical: false },
      { name: 'VAT Return Ready', passed: totalInvoices > 0, weight: 10, critical: false },
      { name: 'No Orphan Credit Notes', passed: orphanCreditNotes === 0, weight: 10, critical: true },
      { name: 'Product Item Codes ≥50%', passed: itemCodeCoverage >= 50, weight: 5, critical: false },
    ];

    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const earnedWeight = checks.filter(c => c.passed).reduce((sum, c) => sum + c.weight, 0);
    const overallScore = Math.round((earnedWeight / totalWeight) * 100);

    const hasCriticalFail = checks.some(c => c.critical && !c.passed);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (overallScore >= 90 && !hasCriticalFail) riskLevel = 'low';
    else if (overallScore >= 70 && !hasCriticalFail) riskLevel = 'medium';
    else if (hasCriticalFail) riskLevel = 'critical';
    else riskLevel = 'high';

    // Penalty estimates
    const failedInvoicePenalty = failedInvoices * 10000; // KES 10,000 per failed invoice
    const nonCompliantPurchaseRisk = (totalPurchases - compliantPurchases) * 0.16 * 0.01; // Estimated VAT risk
    const totalAtRiskAmount = failedInvoicePenalty + nonCompliantPurchaseRisk;

    return NextResponse.json({
      overallScore,
      riskLevel,
      hasCriticalFail,
      totalAtRiskAmount,
      checks: checks.map(c => ({
        ...c,
        status: c.passed ? 'pass' as const : c.critical ? 'fail' as const : 'warn' as const,
      })),
      vatSummary: {
        vatPayable,
        vatRecoverable,
        netVat,
        period: currentMonth.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }),
      },
      stats: {
        syncRate,
        purchaseComplianceRate,
        mpesaReconRate,
        itemCodeCoverage,
        totalInvoices,
        failedInvoices,
        totalPurchases,
        compliantPurchases,
        creditNotes,
        orphanCreditNotes,
      },
      recommendations: [
        !kraPinValid && 'Update your KRA PIN in Settings — it doesn\'t match the required format',
        !etimsOnboarded && 'Complete eTIMS onboarding in Settings — this is mandatory for all businesses',
        syncRate < 95 && `Fix ${failedInvoices} failed invoice syncs — each unsynced invoice risks a KES 10,000 penalty`,
        purchaseComplianceRate < 80 && `${totalPurchases - compliantPurchases} purchases lack eTIMS compliance — use Buyer-Initiated Records`,
        mpesaReconRate < 90 && `${totalMpesa - reconciledMpesa} M-Pesa transactions need reconciliation`,
        orphanCreditNotes > 0 && `${orphanCreditNotes} credit/debit notes are not linked to original invoices — KRA requires this`,
        itemCodeCoverage < 50 && `Only ${itemCodeCoverage}% of products have KRA item codes — add them in Products`,
      ].filter(Boolean),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
