// M-Pesa API - STK Push & transaction management
import { db } from '@/lib/db';
import { initiateSTKPush, getMpesaReconciliationSummary, reconcileMpesaTransactions } from '@/lib/mpesa';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const action = searchParams.get('action');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get reconciliation summary
    if (action === 'summary') {
      const summary = await getMpesaReconciliationSummary(businessId);
      return NextResponse.json(summary);
    }

    // List transactions
    const transactions = await db.mpesaTransaction.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true, totalAmount: true },
        },
      },
      take: 50,
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Initiate STK Push
    if (action === 'stk_push') {
      const { phoneNumber, amount, invoiceId, businessId, accountReference, transactionDesc } = body;
      
      if (!phoneNumber || !amount || !businessId) {
        return NextResponse.json({ error: 'phoneNumber, amount, and businessId are required' }, { status: 400 });
      }

      const result = await initiateSTKPush({
        phoneNumber,
        amount: parseFloat(amount),
        accountReference: accountReference || `SOKONI-${Date.now()}`,
        transactionDesc: transactionDesc || 'Sokoni POS Payment',
        invoiceId,
        businessId,
      });

      return NextResponse.json(result);
    }

    // Reconcile transactions
    if (action === 'reconcile') {
      const { businessId } = body;
      if (!businessId) {
        return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
      }

      const result = await reconcileMpesaTransactions(businessId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action. Use stk_push or reconcile' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
