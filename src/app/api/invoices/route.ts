// Invoices API - CRUD + KRA sync operations
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { generateInvoiceNumber } from '@/lib/i18n';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const id = searchParams.get('id');
    
    if (!businessId && !id) {
      return NextResponse.json({ error: 'businessId or id is required' }, { status: 400 });
    }

    // Get single invoice with details
    if (id) {
      const invoice = await db.invoice.findUnique({
        where: { id },
        include: {
          items: true,
          mpesaTransactions: true,
        },
      });
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      return NextResponse.json(invoice);
    }

    // List invoices
    const where: any = { businessId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: { take: 1 } },
      take: 100,
    });

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, items, buyerPin, buyerName, buyerAddress, customerId, paymentMethod, discountAmount } = body;

    if (!businessId || !items || items.length === 0) {
      return NextResponse.json({ error: 'businessId and items are required' }, { status: 400 });
    }

    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;
    let totalDiscount = discountAmount ? parseFloat(discountAmount) : 0;

    const invoiceItems = items.map((item: any) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineDiscount = item.discountAmount ? parseFloat(item.discountAmount) : 0;
      const lineVatAmount = ((lineSubtotal - lineDiscount) * (item.vatRate || 16)) / 100;
      const lineTotal = lineSubtotal - lineDiscount + lineVatAmount;

      subtotal += lineSubtotal;
      totalVat += lineVatAmount;

      return {
        productId: item.productId || null,
        itemName: item.itemName,
        itemCode: item.itemCode || null,
        itemClassCode: item.itemClassCode || null,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        unitOfMeasure: item.unitOfMeasure || null,
        vatRate: parseFloat(item.vatRate || 16),
        vatAmount: Math.round(lineVatAmount * 100) / 100,
        discountRate: item.discountRate ? parseFloat(item.discountRate) : 0,
        discountAmount: lineDiscount,
        lineTotal: Math.round(lineTotal * 100) / 100,
      };
    });

    const totalAmount = Math.round((subtotal - totalDiscount + totalVat) * 100) / 100;
    const invoiceNumber = generateInvoiceNumber('INV');

    // Create invoice with status 'queued' (offline-first)
    const invoice = await db.invoice.create({
      data: {
        businessId,
        invoiceNumber,
        customerId: customerId || null,
        buyerPin: buyerPin || null,
        buyerName: buyerName || null,
        buyerAddress: buyerAddress || null,
        subtotal: Math.round(subtotal * 100) / 100,
        totalVat: Math.round(totalVat * 100) / 100,
        totalAmount,
        discountAmount: totalDiscount,
        paymentMethod: paymentMethod || 'cash',
        status: 'queued',
        items: {
          create: invoiceItems,
        },
      },
      include: { items: true },
    });

    // Add to sync queue
    await db.syncQueue.create({
      data: {
        businessId,
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'create',
        payload: JSON.stringify(invoice),
        status: 'pending',
        priority: 3,
      },
    });

    // Update business invoice count for freemium tracking
    await db.business.update({
      where: { id: businessId },
      data: { invoiceCount: { increment: 1 } },
    });

    // Update product quantities (decrease stock)
    for (const item of items) {
      if (item.productId) {
        const product = await db.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const newQty = Math.max(0, product.quantity - Math.ceil(parseFloat(item.quantity)));
          await db.product.update({
            where: { id: item.productId },
            data: { quantity: newQty },
          });
        }
      }
    }

    // Attempt background sync (non-blocking - don't await)
    // In production, this would be a background job
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/kra/sync?invoiceId=${invoice.id}&businessId=${businessId}`, {
      method: 'POST',
    }).catch(() => {
      // Silent fail - will be retried by sync queue processor
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'Invoice id is required' }, { status: 400 });
    }

    // Cancel invoice
    if (action === 'cancel') {
      const invoice = await db.invoice.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: body.reason || 'Cancelled by user',
        },
      });
      return NextResponse.json(invoice);
    }

    // Retry sync
    if (action === 'retry') {
      const invoice = await db.invoice.update({
        where: { id },
        data: {
          status: 'queued',
          retryCount: 0,
          lastError: null,
          nextRetryAt: new Date(),
        },
      });

      // Trigger resync
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/kra/sync?invoiceId=${id}&businessId=${invoice.businessId}`, {
        method: 'POST',
      }).catch(() => {});

      return NextResponse.json(invoice);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
