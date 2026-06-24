// M-Pesa Callback - Receives payment confirmations from Daraja API
import { handleMpesaCallback } from '@/lib/mpesa';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Daraja callback structure
    const stkCallback = body?.Body?.stkCallback;
    
    if (!stkCallback) {
      return NextResponse.json({ error: 'Invalid callback format' }, { status: 400 });
    }

    const {
      MerchantRequestID: merchantRequestId,
      CheckoutRequestID: checkoutRequestId,
      ResultCode: resultCode,
      ResultDesc: resultDesc,
    } = stkCallback;

    let mpesaReceiptNumber: string | undefined;
    let phoneNumber: string | undefined;
    let amount: number | undefined;

    // Extract payment details from callback metadata
    if (stkCallback.CallbackMetadata?.Item) {
      const items = stkCallback.CallbackMetadata.Item;
      const receiptItem = items.find((i: any) => i.Name === 'MpesaReceiptNumber');
      const phoneItem = items.find((i: any) => i.Name === 'PhoneNumber');
      const amountItem = items.find((i: any) => i.Name === 'Amount');

      mpesaReceiptNumber = receiptItem?.Value;
      phoneNumber = phoneItem?.Value?.toString();
      amount = amountItem?.Value;
    }

    await handleMpesaCallback({
      merchantRequestId,
      checkoutRequestId,
      resultCode: parseInt(resultCode),
      resultDesc,
      mpesaReceiptNumber,
      phoneNumber,
      amount,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('M-Pesa callback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
