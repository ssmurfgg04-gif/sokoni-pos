// Expense Validation API - Pre-check expenses against KRA eTIMS compliance rules
// This is the MOAT feature - zero competitors offer this
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
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all purchases this year
    const purchases = await db.purchaseRecord.findMany({
      where: { businessId, purchaseDate: { gte: startOfYear } },
      orderBy: { purchaseDate: 'desc' },
    });

    // Get all invoices this year (for cross-referencing)
    const invoices = await db.invoice.findMany({
      where: { businessId, status: { not: 'cancelled' }, createdAt: { gte: startOfYear } },
    });

    // Get all suppliers
    const suppliers = await db.supplier.findMany({ where: { businessId } });

    // ========================================
    // EXPENSE VALIDATION CHECKS
    // ========================================

    const validationResults: {
      id: string; category: string; severity: 'critical' | 'warning' | 'info';
      title: string; description: string; affectedRecords: number; financialImpact: string;
      recommendation: string; affectedItems: { id: string; description: string; amount: number; date: string }[];
    }[] = [];

    // CHECK 1: Non-compliant supplier purchases (expenses will be disallowed)
    const nonCompliantPurchases = purchases.filter(p => !p.isEtimesCompliant && !p.buyerInitiated);
    if (nonCompliantPurchases.length > 0) {
      const totalAtRisk = nonCompliantPurchases.reduce((s, p) => s + p.totalAmount, 0);
      const taxImpact = Math.round(totalAtRisk * 0.3 * 100) / 100; // Estimated 30% tax rate
      validationResults.push({
        id: 'non_compliant_purchases',
        category: 'expense_validation',
        severity: 'critical',
        title: 'Non-Compliant Supplier Purchases',
        description: `${nonCompliantPurchases.length} purchase(s) from suppliers without eTIMS-compliant invoices. Since January 2026, KRA automatically disallows expenses without valid eTIMS invoices.`,
        affectedRecords: nonCompliantPurchases.length,
        financialImpact: `KES ${totalAtRisk.toLocaleString()} at risk. Estimated additional tax: KES ${taxImpact.toLocaleString()}`,
        recommendation: 'Generate buyer-initiated records for these purchases or request compliant invoices from suppliers.',
        affectedItems: nonCompliantPurchases.slice(0, 10).map(p => ({
          id: p.id, description: `${p.description} from ${p.supplierName}`,
          amount: p.totalAmount, date: new Date(p.purchaseDate).toLocaleDateString(),
        })),
      });
    }

    // CHECK 2: Buyer-initiated records without KRA reference
    const incompleteBuyerInitiated = purchases.filter(p => p.buyerInitiated && !p.kraReference);
    if (incompleteBuyerInitiated.length > 0) {
      validationResults.push({
        id: 'incomplete_buyer_initiated',
        category: 'reverse_invoicing',
        severity: 'warning',
        title: 'Incomplete Reverse Invoices',
        description: `${incompleteBuyerInitiated.length} buyer-initiated purchase record(s) are missing KRA references. These may not pass validation.`,
        affectedRecords: incompleteBuyerInitiated.length,
        financialImpact: `KES ${incompleteBuyerInitiated.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()} potentially disallowed`,
        recommendation: 'Complete the reverse invoicing process by submitting these records to KRA eTIMS.',
        affectedItems: incompleteBuyerInitiated.slice(0, 10).map(p => ({
          id: p.id, description: `${p.description} from ${p.supplierName}`,
          amount: p.totalAmount, date: new Date(p.purchaseDate).toLocaleDateString(),
        })),
      });
    }

    // CHECK 3: Purchases from suppliers with no KRA PIN
    const noPinPurchases = purchases.filter(p => !p.supplierPin);
    if (noPinPurchases.length > 0) {
      validationResults.push({
        id: 'no_supplier_pin',
        category: 'data_quality',
        severity: 'warning',
        title: 'Purchases Without Supplier PIN',
        description: `${noPinPurchases.length} purchase record(s) have no supplier KRA PIN. These are harder to validate against KRA records.`,
        affectedRecords: noPinPurchases.length,
        financialImpact: `KES ${noPinPurchases.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()} may require manual verification`,
        recommendation: 'Collect KRA PINs from your suppliers and update purchase records.',
        affectedItems: noPinPurchases.slice(0, 10).map(p => ({
          id: p.id, description: `${p.description} from ${p.supplierName}`,
          amount: p.totalAmount, date: new Date(p.purchaseDate).toLocaleDateString(),
        })),
      });
    }

    // CHECK 4: Failed KRA syncs (invoices not on record with KRA)
    const failedInvoices = invoices.filter(i => i.status === 'failed');
    if (failedInvoices.length > 0) {
      validationResults.push({
        id: 'failed_syncs',
        category: 'sync_status',
        severity: 'critical',
        title: 'Invoices Not Registered with KRA',
        description: `${failedInvoices.length} invoice(s) failed to sync with KRA eTIMS. These sales are not on record, which may cause revenue mismatch during validation.`,
        affectedRecords: failedInvoices.length,
        financialImpact: `KES ${failedInvoices.reduce((s, i) => s + i.totalAmount, 0).toLocaleString()} in unrecorded sales`,
        recommendation: 'Retry syncing failed invoices immediately. Contact KRA support if errors persist.',
        affectedItems: failedInvoices.slice(0, 10).map(i => ({
          id: i.id, description: `Invoice ${i.invoiceNumber}${i.lastError ? ` - ${i.lastError}` : ''}`,
          amount: i.totalAmount, date: new Date(i.createdAt).toLocaleDateString(),
        })),
      });
    }

    // CHECK 5: Queued invoices not yet synced
    const queuedInvoices = invoices.filter(i => i.status === 'queued');
    if (queuedInvoices.length > 0) {
      validationResults.push({
        id: 'queued_syncs',
        category: 'sync_status',
        severity: 'info',
        title: 'Invoices Pending Sync',
        description: `${queuedInvoices.length} invoice(s) are queued for KRA sync. These will be synced automatically when connectivity is restored.`,
        affectedRecords: queuedInvoices.length,
        financialImpact: `KES ${queuedInvoices.reduce((s, i) => s + i.totalAmount, 0).toLocaleString()} pending registration`,
        recommendation: 'Ensure internet connectivity is stable. Trigger manual sync if needed.',
        affectedItems: queuedInvoices.slice(0, 10).map(i => ({
          id: i.id, description: `Invoice ${i.invoiceNumber}`,
          amount: i.totalAmount, date: new Date(i.createdAt).toLocaleDateString(),
        })),
      });
    }

    // CHECK 6: VAT mismatch risk (input VAT > output VAT)
    const outputVat = invoices.reduce((s, i) => s + i.totalVat, 0);
    const inputVat = purchases.reduce((s, p) => s + p.totalVat, 0);
    if (inputVat > outputVat && outputVat > 0) {
      validationResults.push({
        id: 'vat_mismatch',
        category: 'vat_risk',
        severity: 'warning',
        title: 'Input VAT Exceeds Output VAT',
        description: `Your input VAT (KES ${inputVat.toLocaleString()}) exceeds your output VAT (KES ${outputVat.toLocaleString()}). This may trigger a KRA review.`,
        affectedRecords: 1,
        financialImpact: `Net VAT credit: KES ${Math.abs(outputVat - inputVat).toLocaleString()}`,
        recommendation: 'Ensure all input VAT claims are backed by compliant eTIMS invoices. KRA may request supporting documentation.',
        affectedItems: [{ id: 'vat_summary', description: 'VAT summary for current period', amount: inputVat - outputVat, date: new Date().toLocaleDateString() }],
      });
    }

    // CHECK 7: Suppliers marked as non-compliant
    const nonCompliantSuppliers = suppliers.filter(s => !s.isEtimesCompliant);
    if (nonCompliantSuppliers.length > 0) {
      validationResults.push({
        id: 'non_compliant_suppliers',
        category: 'supplier_compliance',
        severity: 'info',
        title: 'Non-Compliant Suppliers',
        description: `${nonCompliantSuppliers.length} supplier(s) are not eTIMS compliant. Purchases from these suppliers require buyer-initiated records.`,
        affectedRecords: nonCompliantSuppliers.length,
        financialImpact: 'All future purchases from these suppliers are at risk of disallowance',
        recommendation: 'Encourage suppliers to register for eTIMS, or always generate buyer-initiated records.',
        affectedItems: nonCompliantSuppliers.slice(0, 10).map(s => ({
          id: s.id, description: `${s.name}${s.kraPin ? ` (PIN: ${s.kraPin})` : ' (No PIN)'}`,
          amount: 0, date: '',
        })),
      });
    }

    // ========================================
    // OVERALL COMPLIANCE SCORE
    // ========================================
    const totalExpenses = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const compliantExpenses = purchases.filter(p => p.isEtimesCompliant || p.buyerInitiated).reduce((s, p) => s + p.totalAmount, 0);
    const complianceRate = totalExpenses > 0 ? Math.round((compliantExpenses / totalExpenses) * 100 * 10) / 10 : 100;
    const atRiskAmount = totalExpenses - compliantExpenses;
    const estimatedTaxRisk = Math.round(atRiskAmount * 0.3 * 100) / 100;

    const criticalCount = validationResults.filter(r => r.severity === 'critical').length;
    const warningCount = validationResults.filter(r => r.severity === 'warning').length;
    const overallStatus = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'good';

    return NextResponse.json({
      overallStatus,
      complianceRate,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      compliantExpenses: Math.round(compliantExpenses * 100) / 100,
      atRiskAmount: Math.round(atRiskAmount * 100) / 100,
      estimatedTaxRisk,
      period: { from: startOfYear.toLocaleDateString(), to: now.toLocaleDateString() },
      checks: validationResults,
      summary: {
        totalChecks: validationResults.length,
        critical: criticalCount,
        warnings: warningCount,
        info: validationResults.filter(r => r.severity === 'info').length,
        passedAll: validationResults.length === 0 || (criticalCount === 0 && warningCount === 0),
      },
      kraValidationNote: 'Since January 1, 2026, KRA automatically validates income and expenses against eTIMS data. Expenses without valid eTIMS invoices are automatically disallowed, increasing your tax liability.',
    });
  } catch (error: any) {
    console.error('Expense validation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
