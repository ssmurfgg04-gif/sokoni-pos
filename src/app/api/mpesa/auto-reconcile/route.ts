// M-Pesa Auto-Reconciliation API
// Smart matching: amount-based, phone-based, reference-based
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId } = body;
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Find unreconciled M-Pesa transactions
    const unreconciled = await db.mpesaTransaction.findMany({
      where: { businessId, reconciled: false, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Find invoices without M-Pesa receipt
    const unmatchedInvoices = await db.invoice.findMany({
      where: { 
        businessId, 
        paymentMethod: 'mpesa',
        mpesaReceiptNumber: null,
        status: { not: 'cancelled' }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let matched = 0;
    let partialMatches = 0;
    const matchDetails: any[] = [];

    for (const txn of unreconciled) {
      // Strategy 1: Exact amount match + same phone
      let bestMatch = unmatchedInvoices.find(inv => 
        Math.abs(inv.totalAmount - txn.amount) < 1 &&
        inv.mpesaPhoneNumber === txn.phoneNumber &&
        !inv.mpesaReceiptNumber
      );

      // Strategy 2: Exact amount match within 5 min window
      if (!bestMatch) {
        const fiveMinBefore = new Date(new Date(txn.createdAt).getTime() - 5 * 60 * 1000);
        const fiveMinAfter = new Date(new Date(txn.createdAt).getTime() + 5 * 60 * 1000);
        bestMatch = unmatchedInvoices.find(inv =>
          Math.abs(inv.totalAmount - txn.amount) < 1 &&
          new Date(inv.createdAt) >= fiveMinBefore &&
          new Date(inv.createdAt) <= fiveMinAfter &&
          !inv.mpesaReceiptNumber
        );
      }

      // Strategy 3: Close amount match (within 5%)
      if (!bestMatch) {
        bestMatch = unmatchedInvoices.find(inv =>
          Math.abs(inv.totalAmount - txn.amount) / txn.amount < 0.05 &&
          !inv.mpesaReceiptNumber
        );
        if (bestMatch) partialMatches++;
      }

      if (bestMatch) {
        // Link them
        await db.mpesaTransaction.update({
          where: { id: txn.id },
          data: { 
            reconciled: true, 
            reconciledAt: new Date(),
            invoiceId: bestMatch.id,
          },
        });
        
        await db.invoice.update({
          where: { id: bestMatch.id },
          data: { mpesaReceiptNumber: txn.mpesaReceipt },
        });

        matchDetails.push({
          transaction: txn.mpesaReceipt,
          invoice: bestMatch.invoiceNumber,
          amount: txn.amount,
          method: bestMatch === unmatchedInvoices.find(inv => 
            Math.abs(inv.totalAmount - txn.amount) < 1 && inv.mpesaPhoneNumber === txn.phoneNumber
          ) ? 'exact_phone' : 'amount_time',
        });

        // Remove from unmatched list
        const idx = unmatchedInvoices.indexOf(bestMatch);
        if (idx > -1) unmatchedInvoices.splice(idx, 1);
        matched++;
      }
    }

    // Calculate reconciliation rate
    const total = await db.mpesaTransaction.count({ 
      where: { businessId, status: 'completed' } 
    });
    const reconciled = await db.mpesaTransaction.count({ 
      where: { businessId, reconciled: true } 
    });

    return NextResponse.json({
      success: true,
      matched,
      partialMatches,
      remaining: unreconciled.length - matched,
      reconciliationRate: total > 0 ? Math.round((reconciled / total) * 100) : 100,
      details: matchDetails,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
