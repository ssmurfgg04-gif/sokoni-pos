// Daily Report / Z-Report API
// End-of-day cash-up — every Kenyan shop does this
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    // Get today's or latest report
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const report = await db.dailyReport.findFirst({
      where: { businessId },
      orderBy: { date: 'desc' },
    });

    // Generate today's summary from live data
    const todayInvoices = await db.invoice.findMany({
      where: { businessId, status: { not: 'cancelled' }, createdAt: { gte: today } },
      select: { totalAmount: true, totalVat: true, paymentMethod: true },
    });

    const liveSummary = {
      date: today.toISOString(),
      totalSales: todayInvoices.reduce((s, i) => s + i.totalAmount, 0),
      totalVat: todayInvoices.reduce((s, i) => s + i.totalVat, 0),
      invoiceCount: todayInvoices.length,
      cashSales: todayInvoices.filter(i => i.paymentMethod === 'cash').reduce((s, i) => s + i.totalAmount, 0),
      mpesaSales: todayInvoices.filter(i => i.paymentMethod === 'mpesa').reduce((s, i) => s + i.totalAmount, 0),
      bankSales: todayInvoices.filter(i => i.paymentMethod === 'bank_transfer').reduce((s, i) => s + i.totalAmount, 0),
      creditSales: todayInvoices.filter(i => i.paymentMethod === 'credit').reduce((s, i) => s + i.totalAmount, 0),
    };

    return NextResponse.json({ report, liveSummary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, closingCash, notes, staffId } = body;

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today already has a report
    const existing = await db.dailyReport.findFirst({ where: { businessId, date: today } });
    if (existing?.isClosed) return NextResponse.json({ error: 'Today is already closed' }, { status: 409 });

    // Get today's invoice data
    const todayInvoices = await db.invoice.findMany({
      where: { businessId, status: { not: 'cancelled' }, createdAt: { gte: today } },
      select: { totalAmount: true, totalVat: true, paymentMethod: true, subtotal: true },
    });

    const totalSales = todayInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalVat = todayInvoices.reduce((s, i) => s + i.totalVat, 0);
    const cashSales = todayInvoices.filter(i => i.paymentMethod === 'cash').reduce((s, i) => s + i.totalAmount, 0);
    const mpesaSales = todayInvoices.filter(i => i.paymentMethod === 'mpesa').reduce((s, i) => s + i.totalAmount, 0);
    const bankSales = todayInvoices.filter(i => i.paymentMethod === 'bank_transfer').reduce((s, i) => s + i.totalAmount, 0);
    const creditSales = todayInvoices.filter(i => i.paymentMethod === 'credit').reduce((s, i) => s + i.totalAmount, 0);

    const closingCashVal = parseFloat(closingCash) || 0;
    const openingCash = existing?.openingCash || 0;
    const variance = closingCashVal - (openingCash + cashSales);

    // Get debt stats for today
    const newDebts = await db.customerDebt.aggregate({ where: { businessId, createdAt: { gte: today } }, _sum: { originalAmount: true } });
    const debtsPaid = await db.customerDebt.aggregate({ where: { businessId, updatedAt: { gte: today }, status: { in: ['partial', 'settled'] } }, _sum: { paidAmount: true } });

    const report = await db.dailyReport.upsert({
      where: { businessId_date: { businessId, date: today } },
      create: {
        businessId, date: today, staffId,
        totalSales, totalVat, invoiceCount: todayInvoices.length,
        cashSales, mpesaSales, bankSales, creditSales,
        openingCash, closingCash: closingCashVal, cashVariance: variance,
        newDebts: newDebts._sum.originalAmount || 0,
        debtsCollected: debtsPaid._sum.paidAmount || 0,
        notes, isClosed: true,
      },
      update: {
        totalSales, totalVat, invoiceCount: todayInvoices.length,
        cashSales, mpesaSales, bankSales, creditSales,
        closingCash: closingCashVal, cashVariance: variance,
        newDebts: newDebts._sum.originalAmount || 0,
        debtsCollected: debtsPaid._sum.paidAmount || 0,
        notes, isClosed: true, staffId,
      },
    });

    return NextResponse.json({ success: true, report, variance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
