// Sokoni POS - KRA eTIMS Integration Service
// Sandbox implementation with offline-first queue & retry logic

import { db } from './db';

// KRA eTIMS API Configuration (Sandbox)
const KRA_ETIMS_BASE_URL = process.env.KRA_ETIMS_BASE_URL || 'https://etims-api-sandbox.kra.go.ke';
const KRA_ETIMS_API_KEY = process.env.KRA_ETIMS_API_KEY || 'sandbox-api-key';

// Invoice status flow: draft -> queued -> syncing -> synced | failed
// Failed invoices retry with exponential backoff up to maxRetries

interface KRAInvoicePayload {
  issuerTin: string;
  issuerName: string;
  issuerBranchCode?: string;
  buyerTin?: string;
  buyerName?: string;
  buyerAddress?: string;
  invoiceDate: string;
  invoiceNumber: string;
  items: KRAInvoiceItem[];
  paymentMethod: string;
}

interface KRAInvoiceItem {
  itemCode?: string;
  itemClassCode?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  unitOfMeasure?: string;
  vatRate: number;
  vatAmount: number;
  discountAmount: number;
  lineTotal: number;
}

interface KRAApiResponse {
  success: boolean;
  data?: {
    signature: string;
    controlNumber: string;
    qrCode: string;
    internalData: string;
    invoiceNumber: string;
  };
  error?: string;
  errorCode?: string;
}

/**
 * Submit an invoice to KRA eTIMS
 * In sandbox mode, this simulates the API call with realistic behavior
 */
export async function submitInvoiceToKRA(invoiceId: string): Promise<KRAApiResponse> {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true, business: true },
    });

    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    // Update status to syncing
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'syncing', lastSyncAttempt: new Date() },
    });

    // Build KRA payload
    const payload: KRAInvoicePayload = {
      issuerTin: invoice.business.kraPin,
      issuerName: invoice.business.name,
      issuerBranchCode: invoice.business.kraBranchId || undefined,
      buyerTin: invoice.buyerPin || undefined,
      buyerName: invoice.buyerName || undefined,
      buyerAddress: invoice.buyerAddress || undefined,
      invoiceDate: invoice.localTimestamp.toISOString(),
      invoiceNumber: invoice.invoiceNumber,
      items: invoice.items.map(item => ({
        itemCode: item.itemCode || undefined,
        itemClassCode: item.itemClassCode || undefined,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitOfMeasure: item.unitOfMeasure || undefined,
        vatRate: item.vatRate,
        vatAmount: item.vatAmount,
        discountAmount: item.discountAmount,
        lineTotal: item.lineTotal,
      })),
      paymentMethod: invoice.paymentMethod,
    };

    // Validate required fields before submission
    const validationErrors = validateKRAInvoice(payload);
    if (validationErrors.length > 0) {
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'failed',
          lastError: `Validation failed: ${validationErrors.join(', ')}`,
          retryCount: { increment: 1 },
        },
      });
      return { success: false, error: validationErrors.join(', ') };
    }

    // Simulate KRA API call (sandbox mode)
    // In production, this would be an actual HTTP call to KRA's API
    const kraResponse = await simulateKRAApiCall(payload);

    if (kraResponse.success && kraResponse.data) {
      // Success - update invoice with KRA data
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'synced',
          kraSignature: kraResponse.data.signature,
          kraControlNumber: kraResponse.data.controlNumber,
          kraQrCodeData: kraResponse.data.qrCode,
          kraInternalData: kraResponse.data.internalData,
          kraInvoiceNumber: kraResponse.data.invoiceNumber,
          lastError: null,
        },
      });

      // Remove from sync queue if it was there
      await db.syncQueue.deleteMany({
        where: { entityType: 'invoice', entityId: invoiceId },
      });

      return kraResponse;
    } else {
      // Failed - update invoice with error and schedule retry
      const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
      const currentRetry = (invoice?.retryCount || 0) + 1;
      
      const nextRetryAt = calculateNextRetry(currentRetry);
      
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          status: currentRetry >= (invoice?.maxRetries || 5) ? 'failed' : 'queued',
          lastError: kraResponse.error || 'Unknown KRA API error',
          retryCount: currentRetry,
          nextRetryAt,
        },
      });

      // Update or create sync queue entry
      await db.syncQueue.upsert({
        where: { id: `sync-${invoiceId}` },
        create: {
          id: `sync-${invoiceId}`,
          businessId: invoice?.businessId || '',
          entityType: 'invoice',
          entityId: invoiceId,
          action: 'create',
          payload: JSON.stringify(payload),
          status: currentRetry >= (invoice?.maxRetries || 5) ? 'failed' : 'pending',
          attempts: currentRetry,
          nextAttempt: nextRetryAt,
          lastError: kraResponse.error,
          priority: 3,
        },
        update: {
          status: currentRetry >= (invoice?.maxRetries || 5) ? 'failed' : 'pending',
          attempts: currentRetry,
          nextAttempt: nextRetryAt,
          lastError: kraResponse.error,
        },
      });

      return kraResponse;
    }
  } catch (error: any) {
    // Network or unexpected error - queue for retry
    try {
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'queued',
          lastError: `System error: ${error.message}`,
          retryCount: { increment: 1 },
          nextRetryAt: calculateNextRetry(1),
        },
      });
    } catch (dbError) {
      console.error('Failed to update invoice error status:', dbError);
    }
    
    return { success: false, error: `System error: ${error.message}` };
  }
}

/**
 * Validate KRA invoice payload before submission
 * Catches common errors that would be rejected by KRA
 */
function validateKRAInvoice(payload: KRAInvoicePayload): string[] {
  const errors: string[] = [];
  
  if (!payload.issuerTin) errors.push('Issuer TIN (KRA PIN) is required');
  if (!payload.issuerName) errors.push('Issuer name is required');
  if (!payload.invoiceNumber) errors.push('Invoice number is required');
  if (!payload.invoiceDate) errors.push('Invoice date is required');
  
  // Validate buyer PIN format if provided (B2B)
  if (payload.buyerTin) {
    const pinPattern = /^[A-Za-z]\d{9}[A-Za-z]$/;
    if (!pinPattern.test(payload.buyerTin)) {
      errors.push('Buyer PIN format is invalid (expected: Letter + 9 digits + Letter)');
    }
  }
  
  // Validate items
  if (!payload.items || payload.items.length === 0) {
    errors.push('Invoice must have at least one item');
  }
  
  payload.items?.forEach((item, idx) => {
    if (!item.itemName) errors.push(`Item ${idx + 1}: Name is required`);
    if (item.quantity <= 0) errors.push(`Item ${idx + 1}: Quantity must be positive`);
    if (item.unitPrice < 0) errors.push(`Item ${idx + 1}: Price cannot be negative`);
  });
  
  return errors;
}

/**
 * Simulate KRA API call for sandbox mode
 * Mimics real API behavior: 85% success rate, random delays
 */
async function simulateKRAApiCall(payload: KRAInvoicePayload): Promise<KRAApiResponse> {
  // Simulate network delay (500ms - 2s)
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
  
  // Simulate occasional KRA downtime (15% failure rate in sandbox)
  const isSuccess = Math.random() > 0.15;
  
  if (isSuccess) {
    const controlNumber = `CTL${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const signature = `SIG_${Buffer.from(payload.invoiceNumber).toString('base64').slice(0, 20)}`;
    
    return {
      success: true,
      data: {
        signature,
        controlNumber,
        qrCode: `KRA:${payload.issuerTin}:${payload.invoiceNumber}:${controlNumber}`,
        internalData: JSON.stringify({ processedAt: new Date().toISOString() }),
        invoiceNumber: payload.invoiceNumber,
      },
    };
  } else {
    // Simulate various KRA error scenarios
    const errors = [
      'KRA service temporarily unavailable',
      'Timeout communicating with KRA server',
      'Invalid issuer credentials',
      'Buyer PIN verification failed',
      'Duplicate invoice number detected',
      'KRA maintenance window active',
    ];
    
    return {
      success: false,
      error: errors[Math.floor(Math.random() * errors.length)],
      errorCode: 'KRA_' + Math.floor(Math.random() * 9000 + 1000),
    };
  }
}

/**
 * Calculate next retry time with exponential backoff
 * 1st retry: 1 min, 2nd: 2 min, 3rd: 4 min, 4th: 8 min, 5th: 16 min
 */
function calculateNextRetry(retryCount: number): Date {
  const baseDelayMs = 60 * 1000; // 1 minute base
  const delayMs = baseDelayMs * Math.pow(2, retryCount - 1);
  const maxDelayMs = 30 * 60 * 1000; // Cap at 30 minutes
  const actualDelay = Math.min(delayMs, maxDelayMs);
  
  return new Date(Date.now() + actualDelay);
}

/**
 * Process the sync queue - retry failed/pending items
 */
export async function processSyncQueue(businessId: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const now = new Date();
  
  const pendingItems = await db.syncQueue.findMany({
    where: {
      businessId,
      status: { in: ['pending', 'failed'] },
      nextAttempt: { lte: now },
      attempts: { lt: 5 }, // Max retries
    },
    orderBy: { priority: 'asc' },
    take: 10, // Process in batches
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const item of pendingItems) {
    if (item.entityType === 'invoice') {
      processed++;
      const result = await submitInvoiceToKRA(item.entityId);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }
    // Add handling for other entity types as needed
  }

  return { processed, succeeded, failed };
}

/**
 * Get sync status summary for dashboard
 */
export async function getSyncStatus(businessId: string) {
  const [queued, syncing, synced, failed, total] = await Promise.all([
    db.invoice.count({ where: { businessId, status: 'queued' } }),
    db.invoice.count({ where: { businessId, status: 'syncing' } }),
    db.invoice.count({ where: { businessId, status: 'synced' } }),
    db.invoice.count({ where: { businessId, status: 'failed' } }),
    db.invoice.count({ where: { businessId } }),
  ]);

  return { queued, syncing, synced, failed, total };
}

/**
 * Validate a KRA PIN format (pre-submission validation)
 */
export function validateKRAPinFormat(pin: string): { valid: boolean; message: string } {
  if (!pin || pin.trim() === '') {
    return { valid: false, message: 'PIN is required' };
  }
  
  const cleaned = pin.trim().toUpperCase();
  const pinPattern = /^[A-Z]\d{9}[A-Z]$/;
  
  if (cleaned.length !== 11) {
    return { valid: false, message: 'KRA PIN must be exactly 11 characters' };
  }
  
  if (!pinPattern.test(cleaned)) {
    return { valid: false, message: 'Format: Letter + 9 digits + Letter (e.g., A001234567B)' };
  }
  
  return { valid: true, message: 'PIN format is valid' };
}
