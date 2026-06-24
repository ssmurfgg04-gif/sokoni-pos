// Purchase Records API - Two-way compliance hub
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const compliant = searchParams.get('compliant');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const where: any = { businessId };
    if (compliant === 'true') where.isEtimesCompliant = true;
    if (compliant === 'false') where.isEtimesCompliant = false;

    const purchases = await db.purchaseRecord.findMany({
      where,
      orderBy: { purchaseDate: 'desc' },
      include: {
        supplier: {
          select: { id: true, name: true, kraPin: true, isEtimesCompliant: true },
        },
      },
      take: 100,
    });

    return NextResponse.json(purchases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      supplierId,
      supplierName,
      supplierPin,
      supplierInvoiceNumber,
      purchaseDate,
      description,
      category,
      subtotal,
      totalVat,
      totalAmount,
      paymentMethod,
      mpesaReceiptNumber,
      isEtimesCompliant,
      buyerInitiated,
      notes,
    } = body;

    if (!businessId || !supplierName || !description || totalAmount === undefined) {
      return NextResponse.json({ error: 'businessId, supplierName, description, and totalAmount are required' }, { status: 400 });
    }

    const purchase = await db.purchaseRecord.create({
      data: {
        businessId,
        supplierId: supplierId || null,
        supplierName,
        supplierPin: supplierPin ? supplierPin.trim().toUpperCase() : null,
        supplierInvoiceNumber: supplierInvoiceNumber || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        description,
        category: category || null,
        subtotal: subtotal ? parseFloat(subtotal) : parseFloat(totalAmount),
        totalVat: totalVat ? parseFloat(totalVat) : 0,
        totalAmount: parseFloat(totalAmount),
        paymentMethod: paymentMethod || 'cash',
        mpesaReceiptNumber: mpesaReceiptNumber || null,
        isEtimesCompliant: isEtimesCompliant || false,
        buyerInitiated: buyerInitiated || false,
        kraReference: buyerInitiated ? `BI-${Date.now()}` : null,
        notes: notes || null,
      },
      include: {
        supplier: true,
      },
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Purchase id is required' }, { status: 400 });
    }

    // Parse numeric fields
    if (data.subtotal !== undefined) data.subtotal = parseFloat(data.subtotal);
    if (data.totalVat !== undefined) data.totalVat = parseFloat(data.totalVat);
    if (data.totalAmount !== undefined) data.totalAmount = parseFloat(data.totalAmount);
    if (data.supplierPin) data.supplierPin = data.supplierPin.trim().toUpperCase();

    const purchase = await db.purchaseRecord.update({
      where: { id },
      data,
    });

    return NextResponse.json(purchase);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Purchase id is required' }, { status: 400 });
    }

    await db.purchaseRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
