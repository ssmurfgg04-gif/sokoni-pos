// Customer Debt Ledger API
// Track who owes what — critical for Kenyan shopkeepers who sell on credit
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    const debts = await db.customerDebt.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalOwed = debts.filter(d => d.status !== 'settled').reduce((sum, d) => sum + d.balance, 0);
    const overdue = debts.filter(d => d.status === 'overdue' || (d.status === 'outstanding' && d.dueDate && new Date(d.dueDate) < new Date()));
    const overdueAmount = overdue.reduce((sum, d) => sum + d.balance, 0);

    return NextResponse.json({ debts, totalOwed, overdueCount: overdue.length, overdueAmount, totalDebts: debts.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, customerName, customerPhone, description, originalAmount, dueDate, notes, customerId } = body;

    if (!businessId || !customerName || !originalAmount || !description) {
      return NextResponse.json({ error: 'businessId, customerName, description, and originalAmount required' }, { status: 400 });
    }

    const debt = await db.customerDebt.create({
      data: { businessId, customerId, customerName, customerPhone, description, originalAmount, balance: originalAmount, dueDate: dueDate ? new Date(dueDate) : null, notes },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, amount } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (action === 'record_payment') {
      const debt = await db.customerDebt.findUnique({ where: { id } });
      if (!debt) return NextResponse.json({ error: 'Debt not found' }, { status: 404 });

      const paymentAmount = parseFloat(amount) || 0;
      if (paymentAmount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });

      const newPaidAmount = debt.paidAmount + paymentAmount;
      const newBalance = debt.originalAmount - newPaidAmount;
      const newStatus = newBalance <= 0 ? 'settled' : newPaidAmount > 0 ? 'partial' : 'outstanding';

      const updated = await db.customerDebt.update({
        where: { id },
        data: { paidAmount: newPaidAmount, balance: Math.max(newBalance, 0), status: newStatus },
      });
      return NextResponse.json({ success: true, debt: updated, paymentRecorded: paymentAmount });
    }

    if (action === 'mark_overdue') {
      const updated = await db.customerDebt.update({ where: { id }, data: { status: 'overdue' } });
      return NextResponse.json({ success: true, debt: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
