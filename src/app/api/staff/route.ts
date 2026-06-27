// Staff Management API
// CRUD for staff members with role-based permissions
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    const staff = await db.staff.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        shifts: {
          where: { clockOut: null },
          take: 1,
          orderBy: { clockIn: 'desc' },
        },
      },
    });

    // Get active shift for each staff member
    const enriched = staff.map(s => ({
      ...s,
      isClockedIn: s.shifts.length > 0,
      currentShift: s.shifts[0] || null,
    }));

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, email, phone, pin, role, canRefund, canDiscount, canEditPrice, canVoid, canViewReports, canManageStock } = body;

    if (!businessId || !name || !pin) {
      return NextResponse.json({ error: 'businessId, name, and pin are required' }, { status: 400 });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    // Check PIN uniqueness within business
    const existing = await db.staff.findFirst({ where: { businessId, pin, isActive: true } });
    if (existing) {
      return NextResponse.json({ error: 'PIN already in use by another staff member' }, { status: 409 });
    }

    const staff = await db.staff.create({
      data: {
        businessId, name, email, phone, pin,
        role: role || 'cashier',
        canRefund: canRefund || false,
        canDiscount: canDiscount || false,
        canEditPrice: canEditPrice || false,
        canVoid: canVoid || false,
        canViewReports: canViewReports || false,
        canManageStock: canManageStock || false,
      },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'Staff id required' }, { status: 400 });

    // Clock in/out actions
    if (action === 'clock_in') {
      const { businessId, openingCash } = body;
      const shift = await db.shift.create({
        data: { businessId, staffId: id, clockIn: new Date(), openingCash: openingCash || 0 },
      });
      return NextResponse.json({ success: true, shift });
    }

    if (action === 'clock_out') {
      const { closingCash, notes } = body;
      const activeShift = await db.shift.findFirst({
        where: { staffId: id, clockOut: null },
        orderBy: { clockIn: 'desc' },
      });
      if (!activeShift) return NextResponse.json({ error: 'No active shift found' }, { status: 404 });

      const closingCashVal = closingCash || 0;
      const expectedCash = activeShift.openingCash + activeShift.cashPayments;
      const variance = closingCashVal - expectedCash;

      const shift = await db.shift.update({
        where: { id: activeShift.id },
        data: { clockOut: new Date(), closingCash: closingCashVal, expectedCash, cashVariance: variance, notes },
      });
      return NextResponse.json({ success: true, shift, variance });
    }

    // Update staff member
    if (updates.pin && (updates.pin.length !== 4 || !/^\d{4}$/.test(updates.pin))) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const staff = await db.staff.update({ where: { id }, data: updates });
    return NextResponse.json(staff);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Soft delete
    await db.staff.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
