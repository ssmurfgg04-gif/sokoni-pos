// Loyalty Program API
// Bonga Points-style loyalty for Kenyan retail
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    const members = await db.loyaltyMember.findMany({
      where: { businessId, isActive: true },
      orderBy: { points: 'desc' },
      take: 100,
    });

    const totalMembers = members.length;
    const totalPointsOutstanding = members.reduce((sum, m) => sum + m.points, 0);
    const totalSpent = members.reduce((sum, m) => sum + m.totalSpent, 0);
    const tiers = { bronze: members.filter(m => m.tier === 'bronze').length, silver: members.filter(m => m.tier === 'silver').length, gold: members.filter(m => m.tier === 'gold').length };

    return NextResponse.json({ members, totalMembers, totalPointsOutstanding, totalSpent, tiers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, phone, customerId } = body;

    if (!businessId || !name || !phone) {
      return NextResponse.json({ error: 'businessId, name, and phone required' }, { status: 400 });
    }

    // Check existing
    const existing = await db.loyaltyMember.findFirst({ where: { businessId, phone } });
    if (existing) return NextResponse.json({ error: 'Member with this phone already exists', member: existing }, { status: 409 });

    const member = await db.loyaltyMember.create({
      data: { businessId, customerId, name, phone, tier: 'bronze' },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, amount, pointsToRedeem } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (action === 'earn_points') {
      // Earn: 1 point per KES 100 spent
      const spent = parseFloat(amount) || 0;
      const earnedPoints = Math.floor(spent / 100);

      const member = await db.loyaltyMember.findUnique({ where: { id } });
      if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

      const newPoints = member.points + earnedPoints;
      const newTotalSpent = member.totalSpent + spent;
      const newTier = newTotalSpent >= 100000 ? 'gold' : newTotalSpent >= 25000 ? 'silver' : 'bronze';

      const updated = await db.loyaltyMember.update({
        where: { id },
        data: { points: newPoints, totalSpent: newTotalSpent, tier: newTier, lastVisitAt: new Date() },
      });

      return NextResponse.json({ success: true, member: updated, earnedPoints });
    }

    if (action === 'redeem_points') {
      const redeem = parseInt(pointsToRedeem) || 0;
      const member = await db.loyaltyMember.findUnique({ where: { id } });
      if (!member || member.points < redeem) return NextResponse.json({ error: 'Insufficient points' }, { status: 400 });

      // Redemption: 1 point = KES 1 discount
      const discountValue = redeem;

      const updated = await db.loyaltyMember.update({
        where: { id },
        data: { points: member.points - redeem },
      });

      return NextResponse.json({ success: true, member: updated, discountValue, pointsRedeemed: redeem });
    }

    return NextResponse.json({ error: 'Invalid action. Use earn_points or redeem_points' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
