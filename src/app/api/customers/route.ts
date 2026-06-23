// Customers API - CRUD operations
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
        { email: { contains: search } },
      ];
    }

    const customers = await db.customer.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, kraPin, email, phone, address, isVatRegistered } = body;

    if (!businessId || !name) {
      return NextResponse.json({ error: 'businessId and name are required' }, { status: 400 });
    }

    // Validate PIN format if provided
    if (kraPin) {
      const pinPattern = /^[A-Za-z]\d{9}[A-Za-z]$/;
      if (!pinPattern.test(kraPin.trim())) {
        return NextResponse.json({ error: 'Invalid KRA PIN format. Expected: Letter + 9 digits + Letter' }, { status: 400 });
      }
    }

    const customer = await db.customer.create({
      data: {
        businessId,
        name,
        kraPin: kraPin ? kraPin.trim().toUpperCase() : null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        isVatRegistered: isVatRegistered || false,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Customer id is required' }, { status: 400 });
    }

    if (data.kraPin) {
      data.kraPin = data.kraPin.trim().toUpperCase();
    }

    const customer = await db.customer.update({
      where: { id },
      data,
    });

    return NextResponse.json(customer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Customer id is required' }, { status: 400 });
    }

    await db.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
