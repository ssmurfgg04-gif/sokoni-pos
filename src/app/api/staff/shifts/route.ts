// Shift History API
// Get shift history with cash variance analysis
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const staffId = searchParams.get('staffId');

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    const shifts = await db.shift.findMany({
      where: { businessId, ...(staffId ? { staffId } : {}) },
      orderBy: { clockIn: 'desc' },
      take: 30,
      include: { staff: { select: { id: true, name: true, role: true } } },
    });

    // Analytics
    const completedShifts = shifts.filter(s => s.clockOut);
    const totalVariance = completedShifts.reduce((sum, s) => sum + (s.cashVariance || 0), 0);
    const avgVariance = completedShifts.length > 0 ? totalVariance / completedShifts.length : 0;
    const shortShifts = completedShifts.filter(s => (s.cashVariance || 0) < -100);
    const overShifts = completedShifts.filter(s => (s.cashVariance || 0) > 100);

    // Staff performance summary
    const staffMap = new Map<string, { name: string; shifts: number; totalVariance: number; totalSales: number }>();
    completedShifts.forEach(s => {
      const existing = staffMap.get(s.staffId) || { name: s.staff.name, shifts: 0, totalVariance: 0, totalSales: 0 };
      existing.shifts++;
      existing.totalVariance += s.cashVariance || 0;
      existing.totalSales += s.totalSales;
      staffMap.set(s.staffId, existing);
    });

    return NextResponse.json({
      shifts,
      analytics: {
        totalShifts: completedShifts.length,
        totalVariance,
        avgVariance: Math.round(avgVariance),
        shortShifts: shortShifts.length,
        overShifts: overShifts.length,
        staffPerformance: Array.from(staffMap.entries()).map(([id, data]) => ({
          staffId: id,
          ...data,
          avgVariance: Math.round(data.totalVariance / data.shifts),
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
