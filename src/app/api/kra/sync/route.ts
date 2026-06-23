// KRA Sync API - Trigger sync and process queue
import { submitInvoiceToKRA, processSyncQueue, getSyncStatus } from '@/lib/kra';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const status = await getSyncStatus(businessId);
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const businessId = searchParams.get('businessId');
    const action = searchParams.get('action');

    // Sync a specific invoice
    if (invoiceId) {
      const result = await submitInvoiceToKRA(invoiceId);
      return NextResponse.json(result);
    }

    // Process the entire sync queue
    if (businessId && action === 'process_queue') {
      const result = await processSyncQueue(businessId);
      return NextResponse.json(result);
    }

    // Get sync status
    if (businessId) {
      const status = await getSyncStatus(businessId);
      return NextResponse.json(status);
    }

    return NextResponse.json({ error: 'invoiceId or businessId is required' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
