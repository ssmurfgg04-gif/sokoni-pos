// Credit Notes API - Issue credit/debit notes linked to original invoices
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { generateInvoiceNumber } from '@/lib/i18n';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, originalInvoiceId, type, reason, items } = body;

    if (!businessId || !originalInvoiceId || !type) {
      return NextResponse.json({ error: 'businessId, originalInvoiceId, and type (credit_note/debit_note) are required' }, { status: 400 });
    }

    const originalInvoice = await db.invoice.findUnique({
      where: { id: originalInvoiceId },
      include: { items: true },
    });

    if (!originalInvoice) return NextResponse.json({ error: 'Original invoice not found' }, { status: 404 });
    if (originalInvoice.businessId !== businessId) return NextResponse.json({ error: 'Invoice does not belong to this business' }, { status: 403 });
    if (originalInvoice.status === 'cancelled') return NextResponse.json({ error: 'Cannot issue note for a cancelled invoice' }, { status: 400 });

    const noteItems = items || originalInvoice.items.map(item => ({
      itemName: item.itemName, itemCode: item.itemCode, itemClassCode: item.itemClassCode,
      quantity: item.quantity, unitPrice: item.unitPrice, vatRate: item.vatRate,
      unitOfMeasure: item.unitOfMeasure, discountAmount: item.discountAmount,
    }));

    let subtotal = 0, totalVat = 0;
    const invoiceItems = noteItems.map((item: any) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineDiscount = item.discountAmount || 0;
      const lineVatAmount = ((lineSubtotal - lineDiscount) * (item.vatRate || 16)) / 100;
      const lineTotal = lineSubtotal - lineDiscount + lineVatAmount;
      subtotal += lineSubtotal;
      totalVat += lineVatAmount;
      return {
        productId: item.productId || null, itemName: item.itemName,
        itemCode: item.itemCode || null, itemClassCode: item.itemClassCode || null,
        quantity: parseFloat(item.quantity), unitPrice: parseFloat(item.unitPrice),
        unitOfMeasure: item.unitOfMeasure || null, vatRate: parseFloat(item.vatRate || 16),
        vatAmount: Math.round(lineVatAmount * 100) / 100, discountRate: 0,
        discountAmount: lineDiscount, lineTotal: Math.round(lineTotal * 100) / 100,
      };
    });

    const totalAmount = subtotal + totalVat;

    if (type === 'credit_note' && totalAmount > originalInvoice.totalAmount) {
      return NextResponse.json({ error: `Credit note total (${totalAmount}) cannot exceed original invoice total (${originalInvoice.totalAmount})` }, { status: 400 });
    }

    const invoiceNumber = generateInvoiceNumber(type === 'credit_note' ? 'CN' : 'DN');

    const creditNote = await db.invoice.create({
      data: {
        businessId, invoiceNumber, customerId: originalInvoice.customerId,
        buyerPin: originalInvoice.buyerPin, buyerName: originalInvoice.buyerName,
        buyerAddress: originalInvoice.buyerAddress,
        subtotal: Math.round(subtotal * 100) / 100, totalVat: Math.round(totalVat * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100, paymentMethod: type,
        status: 'queued', invoiceType: type, relatedInvoiceId: originalInvoiceId,
        items: { create: invoiceItems },
      },
      include: { items: true },
    });

    await db.syncQueue.create({
      data: { businessId, entityType: 'invoice', entityId: creditNote.id, action: 'create', payload: JSON.stringify(creditNote), status: 'pending', priority: 2 },
    });

    return NextResponse.json({ ...creditNote, _originalInvoice: { id: originalInvoice.id, invoiceNumber: originalInvoice.invoiceNumber, totalAmount: originalInvoice.totalAmount } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
