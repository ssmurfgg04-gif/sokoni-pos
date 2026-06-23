// Products API - CRUD operations
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const where: any = { businessId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }
    if (category) {
      where.category = category;
    }

    const products = await db.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, sku, barcode, category, unitPrice, costPrice, vatRate, vatType, itemCode, itemClassCode, unitOfMeasure, quantity, reorderLevel } = body;

    if (!businessId || !name || unitPrice === undefined) {
      return NextResponse.json({ error: 'businessId, name, and unitPrice are required' }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        businessId,
        name,
        sku,
        barcode,
        category,
        unitPrice: parseFloat(unitPrice),
        costPrice: costPrice ? parseFloat(costPrice) : null,
        vatRate: vatRate !== undefined ? parseFloat(vatRate) : 16.0,
        vatType: vatType || 'VAT',
        itemCode,
        itemClassCode,
        unitOfMeasure,
        quantity: quantity ? parseInt(quantity) : 0,
        reorderLevel: reorderLevel ? parseInt(reorderLevel) : 10,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }

    // Parse numeric fields
    if (data.unitPrice !== undefined) data.unitPrice = parseFloat(data.unitPrice);
    if (data.costPrice !== undefined) data.costPrice = parseFloat(data.costPrice);
    if (data.vatRate !== undefined) data.vatRate = parseFloat(data.vatRate);
    if (data.quantity !== undefined) data.quantity = parseInt(data.quantity);
    if (data.reorderLevel !== undefined) data.reorderLevel = parseInt(data.reorderLevel);

    const product = await db.product.update({
      where: { id },
      data,
    });

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }

    // Soft delete
    const product = await db.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
