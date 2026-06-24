// Parcy POS - M-Pesa Daraja API Integration Service
// Sandbox implementation with STK Push & auto-reconciliation

import { db } from './db';

// M-Pesa Daraja API Configuration
const DARAJA_BASE_URL = process.env.DARAJA_BASE_URL || 'https://sandbox.safaricom.co.ke';
const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY || 'sandbox-consumer-key';
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET || 'sandbox-consumer-secret';
const DARAJA_PASSKEY = process.env.DARAJA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const DARAJA_BUSINESS_SHORT_CODE = process.env.DARAJA_BUSINESS_SHORT_CODE || '174379';
const DARAJA_CALLBACK_URL = process.env.DARAJA_CALLBACK_URL || '/api/mpesa/callback';

interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  invoiceId?: string;
  businessId: string;
}

interface STKPushResponse {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  error?: string;
}

interface MpesaCallbackData {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  mpesaReceiptNumber?: string;
  phoneNumber?: string;
  amount?: number;
}

/**
 * Get OAuth access token from Daraja API
 * In sandbox mode, returns a simulated token
 */
async function getAccessToken(): Promise<string> {
  // In production, this would call:
  // GET https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
  // with Basic auth (consumer_key:consumer_secret)
  
  // Sandbox simulation
  return `sandbox_token_${Date.now()}`;
}

/**
 * Initiate M-Pesa STK Push
 * Sends an STK push to the customer's phone to complete payment
 */
export async function initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
  try {
    const { phoneNumber, amount, accountReference, transactionDesc, invoiceId, businessId } = request;
    
    // Validate phone number format (Kenyan format: 254XXXXXXXXX)
    const phoneRegex = /^(?:254|\+254|0)(?:7|1)\d{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return { success: false, error: 'Invalid phone number format. Use 254XXXXXXXXX' };
    }
    
    // Format phone number to 254XXX format
    let formattedPhone = phoneNumber.replace(/\s/g, '').replace(/^\+/, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    
    // Generate timestamp and password for STK Push
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(
      `${DARAJA_BUSINESS_SHORT_CODE}${DARAJA_PASSKEY}${timestamp}`
    ).toString('base64');
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // In production, this would be an actual POST to:
    // https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
    // with the following body:
    const stkPayload = {
      BusinessShortCode: DARAJA_BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount), // M-Pesa requires whole numbers
      PartyA: formattedPhone,
      PartyB: DARAJA_BUSINESS_SHORT_CODE,
      PhoneNumber: formattedPhone,
      CallBackURL: DARAJA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };
    
    // Simulate STK Push API call
    const response = await simulateSTKPush(stkPayload, accessToken);
    
    if (response.success && response.checkoutRequestId) {
      // Create M-Pesa transaction record
      await db.mpesaTransaction.create({
        data: {
          businessId,
          invoiceId: invoiceId || null,
          phoneNumber: formattedPhone,
          amount: Math.ceil(amount),
          accountReference,
          transactionDesc,
          checkoutRequestId: response.checkoutRequestId,
          merchantRequestId: response.merchantRequestId,
          status: 'processing',
        },
      });
      
      // Update invoice with M-Pesa phone if linked
      if (invoiceId) {
        await db.invoice.update({
          where: { id: invoiceId },
          data: { mpesaPhoneNumber: formattedPhone, paymentMethod: 'mpesa' },
        });
      }
    }
    
    return response;
  } catch (error: any) {
    return { success: false, error: `M-Pesa error: ${error.message}` };
  }
}

/**
 * Handle M-Pesa callback (called by Daraja after STK push completes)
 * This is the endpoint that Safaricom calls with the payment result
 */
export async function handleMpesaCallback(callbackData: MpesaCallbackData): Promise<void> {
  const { checkoutRequestId, resultCode, resultDesc, mpesaReceiptNumber, phoneNumber, amount } = callbackData;
  
  // Find the transaction by checkoutRequestId
  const transaction = await db.mpesaTransaction.findFirst({
    where: { checkoutRequestId },
  });
  
  if (!transaction) {
    console.error('M-Pesa callback: Transaction not found for checkoutRequestId', checkoutRequestId);
    return;
  }
  
  if (resultCode === 0 && mpesaReceiptNumber) {
    // Payment successful
    await db.mpesaTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        mpesaReceipt: mpesaReceiptNumber,
        resultCode: String(resultCode),
        resultDesc,
        callbackRaw: JSON.stringify(callbackData),
        reconciled: !!transaction.invoiceId, // Auto-reconcile if linked to invoice
        reconciledAt: transaction.invoiceId ? new Date() : null,
      },
    });
    
    // Update linked invoice
    if (transaction.invoiceId) {
      await db.invoice.update({
        where: { id: transaction.invoiceId },
        data: {
          mpesaReceiptNumber,
          paymentMethod: 'mpesa',
        },
      });
    }
  } else {
    // Payment failed
    await db.mpesaTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'failed',
        resultCode: String(resultCode),
        resultDesc,
        callbackRaw: JSON.stringify(callbackData),
      },
    });
  }
}

/**
 * Simulate STK Push for sandbox mode
 */
async function simulateSTKPush(payload: any, accessToken: string): Promise<STKPushResponse> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  // 90% success rate in sandbox
  const isSuccess = Math.random() > 0.10;
  
  if (isSuccess) {
    const merchantRequestId = `MER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const checkoutRequestId = `CHK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Simulate async callback (after a delay)
    setTimeout(async () => {
      const receiptNumber = `QJK${Math.floor(Math.random() * 900000000 + 100000000)}WR`;
      
      await handleMpesaCallback({
        merchantRequestId,
        checkoutRequestId,
        resultCode: 0,
        resultDesc: 'The service request is processed successfully.',
        mpesaReceiptNumber: receiptNumber,
        phoneNumber: payload.PhoneNumber,
        amount: payload.Amount,
      });
    }, 3000 + Math.random() * 5000); // Callback after 3-8 seconds
    
    return {
      success: true,
      checkoutRequestId,
      merchantRequestId,
    };
  } else {
    const errors = [
      'Unable to complete transaction at this time',
      'Insufficient funds in the customer account',
      'The service request has timed out',
      'STK push failed - customer did not enter PIN',
    ];
    
    return {
      success: false,
      error: errors[Math.floor(Math.random() * errors.length)],
    };
  }
}

/**
 * Get M-Pesa reconciliation summary
 */
export async function getMpesaReconciliationSummary(businessId: string) {
  const [total, completed, reconciled, unmatched] = await Promise.all([
    db.mpesaTransaction.count({ where: { businessId } }),
    db.mpesaTransaction.count({ where: { businessId, status: 'completed' } }),
    db.mpesaTransaction.count({ where: { businessId, reconciled: true } }),
    db.mpesaTransaction.count({ where: { businessId, status: 'completed', reconciled: false } }),
  ]);
  
  const totalAmount = await db.mpesaTransaction.aggregate({
    where: { businessId, status: 'completed' },
    _sum: { amount: true },
  });
  
  const reconciliationRate = completed > 0 ? (reconciled / completed) * 100 : 0;
  
  return {
    total,
    completed,
    reconciled,
    unmatched,
    totalAmount: totalAmount._sum.amount || 0,
    reconciliationRate: Math.round(reconciliationRate * 10) / 10,
  };
}

/**
 * Attempt to reconcile unmatched M-Pesa transactions with invoices
 */
export async function reconcileMpesaTransactions(businessId: string): Promise<{
  matched: number;
  unmatched: number;
}> {
  const unmatchedTransactions = await db.mpesaTransaction.findMany({
    where: {
      businessId,
      status: 'completed',
      reconciled: false,
      invoiceId: null,
    },
  });

  let matched = 0;
  let unmatched = 0;

  for (const txn of unmatchedTransactions) {
    // Try to find an invoice with matching amount and close date
    const matchingInvoice = await db.invoice.findFirst({
      where: {
        businessId,
        totalAmount: txn.amount,
        paymentMethod: 'mpesa',
        mpesaReceiptNumber: null,
        createdAt: {
          gte: new Date(txn.createdAt.getTime() - 30 * 60 * 1000), // Within 30 minutes
          lte: new Date(txn.createdAt.getTime() + 30 * 60 * 1000),
        },
      },
    });

    if (matchingInvoice) {
      // Match found
      await db.mpesaTransaction.update({
        where: { id: txn.id },
        data: {
          invoiceId: matchingInvoice.id,
          reconciled: true,
          reconciledAt: new Date(),
        },
      });
      
      await db.invoice.update({
        where: { id: matchingInvoice.id },
        data: { mpesaReceiptNumber: txn.mpesaReceipt },
      });
      
      matched++;
    } else {
      unmatched++;
    }
  }

  return { matched, unmatched };
}
