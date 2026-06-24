// Settings API - Business profile & configuration
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const business = await db.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const settings = await db.settings.findMany({
      where: { businessId },
    });

    // Convert settings to key-value object, masking secrets
    const settingsMap: Record<string, any> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.isSecret ? '••••••••' : s.value;
    });

    // Pricing tiers info
    const tiers = {
      free: { name: 'Free', price: 0, invoiceLimit: 50, features: ['Basic invoicing', 'Cash payments', 'KRA sync'] },
      growth: { name: 'Growth', price: 1500, invoiceLimit: -1, features: ['Unlimited invoices', 'M-Pesa integration', 'Purchase recording', 'Multi-user', 'Reconciliation'] },
      pro: { name: 'Pro', price: 3000, invoiceLimit: -1, features: ['Everything in Growth', 'Stock management', 'Analytics dashboard', 'Priority support', 'Supplier hub'] },
    };

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        kraPin: business.kraPin,
        email: business.email,
        phone: business.phone,
        address: business.address,
        county: business.county,
        vatRegistered: business.vatRegistered,
        sectorCode: business.sectorCode,
        currentTier: business.currentTier,
        language: business.language,
        receiptFooter: business.receiptFooter,
        invoiceCount: business.invoiceCount,
        billingCycleStart: business.billingCycleStart,
      },
      settings: settingsMap,
      tiers,
      usage: {
        invoiceCount: business.invoiceCount,
        tier: business.currentTier,
        limit: tiers[business.currentTier as keyof typeof tiers]?.invoiceLimit || 50,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, business: businessData, settings: settingsData } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Update business profile
    if (businessData) {
      await db.business.update({
        where: { id: businessId },
        data: {
          ...(businessData.name && { name: businessData.name }),
          ...(businessData.email !== undefined && { email: businessData.email }),
          ...(businessData.phone !== undefined && { phone: businessData.phone }),
          ...(businessData.address !== undefined && { address: businessData.address }),
          ...(businessData.county !== undefined && { county: businessData.county }),
          ...(businessData.vatRegistered !== undefined && { vatRegistered: businessData.vatRegistered }),
          ...(businessData.language !== undefined && { language: businessData.language }),
          ...(businessData.receiptFooter !== undefined && { receiptFooter: businessData.receiptFooter }),
          ...(businessData.currentTier !== undefined && { currentTier: businessData.currentTier }),
        },
      });
    }

    // Update settings (upsert each)
    if (settingsData) {
      for (const [key, value] of Object.entries(settingsData)) {
        if (value && value !== '••••••••') { // Don't save masked values
          await db.settings.upsert({
            where: { businessId_key: { businessId, key } },
            create: { businessId, key, value: value as string, isSecret: key.includes('key') || key.includes('secret') || key.includes('password') || key.includes('passkey') },
            update: { value: value as string },
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
