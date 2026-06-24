// Suppliers API - CRUD operations
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const search = searchParams.get('search');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const where: any = { businessId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { kraPin: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const suppliers = await db.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchases: true } },
      },
    });

    return NextResponse.json(suppliers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, kraPin, email, phone, address, isEtimesCompliant, bankName, bankAccount, paybillNumber } = body;

    if (!businessId || !name) {
      return NextResponse.json({ error: 'businessId and name are required' }, { status: 400 });
    }

    const supplier = await db.supplier.create({
      data: {
        businessId,
        name,
        kraPin: kraPin ? kraPin.trim().toUpperCase() : null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        isEtimesCompliant: isEtimesCompliant || false,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        paybillNumber: paybillNumber || null,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Supplier id is required' }, { status: 400 });
    }

    if (data.kraPin) {
      data.kraPin = data.kraPin.trim().toUpperCase();
    }

    const supplier = await db.supplier.update({
      where: { id },
      data,
    });

    return NextResponse.json(supplier);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Supplier id is required' }, { status: 400 });
    }

    await db.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
