// Seed the database with demo data for Parcy POS
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Check if business already exists
    const existing = await db.business.findFirst();
    if (existing) {
      return NextResponse.json({ message: 'Database already seeded', businessId: existing.id });
    }

    // Create demo business
    const business = await db.business.create({
      data: {
        name: 'Parcy Demo Store',
        kraPin: 'A001234567B',
        email: 'demo@parcy.co.ke',
        phone: '254712345678',
        address: 'Moi Avenue, Nairobi, Kenya',
        county: 'Nairobi',
        vatRegistered: true,
        sectorCode: '46310',
        currentTier: 'pro',
        language: 'en',
        currency: 'KES',
        receiptFooter: 'Thank you for shopping with us! Asante!',
      },
    });

    // Create demo products
    const products = await Promise.all([
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Maize Flour (2kg)',
          sku: 'MF-002',
          category: 'Food',
          unitPrice: 220,
          costPrice: 180,
          vatRate: 16,
          vatType: 'VAT',
          quantity: 150,
          reorderLevel: 20,
          itemCode: '1010101010',
          itemClassCode: '01',
          unitOfMeasure: 'KGM',
        },
      }),
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Cooking Oil (1L)',
          sku: 'CO-001',
          category: 'Food',
          unitPrice: 350,
          costPrice: 290,
          vatRate: 16,
          vatType: 'VAT',
          quantity: 80,
          reorderLevel: 15,
          itemCode: '1010102020',
          itemClassCode: '01',
          unitOfMeasure: 'LTR',
        },
      }),
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Sugar (1kg)',
          sku: 'SG-001',
          category: 'Food',
          unitPrice: 160,
          costPrice: 130,
          vatRate: 16,
          vatType: 'VAT',
          quantity: 200,
          reorderLevel: 30,
          itemCode: '1010103030',
          itemClassCode: '01',
          unitOfMeasure: 'KGM',
        },
      }),
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Milk (500ml)',
          sku: 'ML-001',
          category: 'Dairy',
          unitPrice: 65,
          costPrice: 50,
          vatRate: 0,
          vatType: 'ZERO',
          quantity: 50,
          reorderLevel: 10,
          itemCode: '1010201010',
          itemClassCode: '02',
          unitOfMeasure: 'LTR',
        },
      }),
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Bread (400g)',
          sku: 'BR-001',
          category: 'Bakery',
          unitPrice: 60,
          costPrice: 45,
          vatRate: 16,
          vatType: 'VAT',
          quantity: 40,
          reorderLevel: 10,
          itemCode: '1010301010',
          itemClassCode: '03',
          unitOfMeasure: 'PCE',
        },
      }),
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Rice (2kg)',
          sku: 'RC-001',
          category: 'Food',
          unitPrice: 320,
          costPrice: 260,
          vatRate: 16,
          vatType: 'VAT',
          quantity: 100,
          reorderLevel: 20,
          itemCode: '1010104040',
          itemClassCode: '01',
          unitOfMeasure: 'KGM',
        },
      }),
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Soap Bar',
          sku: 'SP-001',
          category: 'Household',
          unitPrice: 120,
          costPrice: 85,
          vatRate: 16,
          vatType: 'VAT',
          quantity: 60,
          reorderLevel: 10,
          itemCode: '1020101010',
          itemClassCode: '04',
          unitOfMeasure: 'PCE',
        },
      }),
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Bottled Water (500ml)',
          sku: 'BW-001',
          category: 'Beverages',
          unitPrice: 50,
          costPrice: 30,
          vatRate: 16,
          vatType: 'VAT',
          quantity: 120,
          reorderLevel: 20,
          itemCode: '1030101010',
          itemClassCode: '05',
          unitOfMeasure: 'PCE',
        },
      }),
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Soda (300ml)',
          sku: 'SD-001',
          category: 'Beverages',
          unitPrice: 70,
          costPrice: 50,
          vatRate: 16,
          vatType: 'VAT',
          quantity: 100,
          reorderLevel: 15,
          itemCode: '1030102020',
          itemClassCode: '05',
          unitOfMeasure: 'PCE',
        },
      }),
      db.product.create({
        data: {
          businessId: business.id,
          name: 'Airtime - Safaricom (KES 100)',
          sku: 'AT-100',
          category: 'Services',
          unitPrice: 100,
          costPrice: 95,
          vatRate: 0,
          vatType: 'EXEMPT',
          quantity: 999,
          reorderLevel: 0,
          itemCode: '1040101010',
          itemClassCode: '06',
          unitOfMeasure: 'PCE',
        },
      }),
    ]);

    // Create demo customers
    const customers = await Promise.all([
      db.customer.create({
        data: {
          businessId: business.id,
          name: 'Kenya Tech Solutions Ltd',
          kraPin: 'P051234567Q',
          email: 'info@kenyatech.co.ke',
          phone: '254720123456',
          address: 'Westlands, Nairobi',
          isVatRegistered: true,
        },
      }),
      db.customer.create({
        data: {
          businessId: business.id,
          name: 'Nairobi Hotel Group',
          kraPin: 'P052345678R',
          email: 'purchasing@nairobiHotel.co.ke',
          phone: '254721234567',
          address: 'CBD, Nairobi',
          isVatRegistered: true,
        },
      }),
      db.customer.create({
        data: {
          businessId: business.id,
          name: 'Walk-in Customer',
          phone: '',
          isVatRegistered: false,
        },
      }),
    ]);

    // Create demo suppliers
    const suppliers = await Promise.all([
      db.supplier.create({
        data: {
          businessId: business.id,
          name: 'Eastleigh Wholesale Distributors',
          kraPin: 'A009876543C',
          phone: '254730123456',
          email: 'orders@eastleigh-dist.co.ke',
          address: 'Eastleigh, Nairobi',
          isEtimesCompliant: true,
        },
      }),
      db.supplier.create({
        data: {
          businessId: business.id,
          name: 'Mombasa Road Suppliers',
          kraPin: 'A008765432D',
          phone: '254731234567',
          address: 'Mombasa Road, Nairobi',
          isEtimesCompliant: false, // Non-compliant supplier - common in Kenya
        },
      }),
      db.supplier.create({
        data: {
          businessId: business.id,
          name: 'Local Farm Produce',
          phone: '254732345678',
          address: 'Wakulima Market, Nairobi',
          isEtimesCompliant: false,
        },
      }),
    ]);

    // Create demo invoices with various statuses
    const now = new Date();
    const invoices = await Promise.all([
      // Synced invoice (completed)
      db.invoice.create({
        data: {
          businessId: business.id,
          invoiceNumber: 'INV-LC8X9K2P',
          buyerPin: 'P051234567Q',
          buyerName: 'Kenya Tech Solutions Ltd',
          buyerAddress: 'Westlands, Nairobi',
          customerId: customers[0].id,
          subtotal: 1100,
          totalVat: 176,
          totalAmount: 1276,
          paymentMethod: 'mpesa',
          mpesaReceiptNumber: 'QJK7L8M9NR',
          mpesaPhoneNumber: '254720123456',
          status: 'synced',
          kraSignature: 'SIG_SW5WLUxDOUtQ',
          kraControlNumber: 'CTL1719000000123',
          kraQrCodeData: 'KRA:A001234567B:INV-LC8X9K2P:CTL1719000000123',
          issueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          localTimestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          items: {
            create: [
              { itemName: 'Maize Flour (2kg)', quantity: 3, unitPrice: 220, vatRate: 16, vatAmount: 105.6, lineTotal: 765.6, itemCode: '1010101010', itemClassCode: '01', unitOfMeasure: 'KGM' },
              { itemName: 'Cooking Oil (1L)', quantity: 1, unitPrice: 350, vatRate: 16, vatAmount: 56, lineTotal: 406, itemCode: '1010102020', itemClassCode: '01', unitOfMeasure: 'LTR' },
              { itemName: 'Sugar (1kg)', quantity: 1, unitPrice: 160, vatRate: 16, vatAmount: 25.6, lineTotal: 185.6, itemCode: '1010103030', itemClassCode: '01', unitOfMeasure: 'KGM' },
            ],
          },
        },
      }),
      // Another synced invoice
      db.invoice.create({
        data: {
          businessId: business.id,
          invoiceNumber: 'INV-M3N4P5Q6',
          subtotal: 570,
          totalVat: 91.2,
          totalAmount: 661.2,
          paymentMethod: 'cash',
          status: 'synced',
          kraSignature: 'SIG_SW1NM1A0UFR',
          kraControlNumber: 'CTL1719000000456',
          kraQrCodeData: 'KRA:A001234567B:INV-M3N4P5Q6:CTL1719000000456',
          issueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          localTimestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          items: {
            create: [
              { itemName: 'Bread (400g)', quantity: 2, unitPrice: 60, vatRate: 16, vatAmount: 19.2, lineTotal: 139.2, itemCode: '1010301010', itemClassCode: '03', unitOfMeasure: 'PCE' },
              { itemName: 'Milk (500ml)', quantity: 3, unitPrice: 65, vatRate: 0, vatAmount: 0, lineTotal: 195, itemCode: '1010201010', itemClassCode: '02', unitOfMeasure: 'LTR' },
              { itemName: 'Bottled Water (500ml)', quantity: 2, unitPrice: 50, vatRate: 16, vatAmount: 16, lineTotal: 116, itemCode: '1030101010', itemClassCode: '05', unitOfMeasure: 'PCE' },
              { itemName: 'Soda (300ml)', quantity: 3, unitPrice: 70, vatRate: 16, vatAmount: 33.6, lineTotal: 243.6, itemCode: '1030102020', itemClassCode: '05', unitOfMeasure: 'PCE' },
            ],
          },
        },
      }),
      // Queued invoice (waiting for sync)
      db.invoice.create({
        data: {
          businessId: business.id,
          invoiceNumber: 'INV-R7S8T9U0',
          buyerPin: 'P052345678R',
          buyerName: 'Nairobi Hotel Group',
          buyerAddress: 'CBD, Nairobi',
          customerId: customers[1].id,
          subtotal: 2240,
          totalVat: 358.4,
          totalAmount: 2598.4,
          paymentMethod: 'bank_transfer',
          status: 'queued',
          retryCount: 1,
          lastError: 'KRA service temporarily unavailable',
          nextRetryAt: new Date(now.getTime() + 60 * 1000),
          issueDate: now,
          localTimestamp: now,
          items: {
            create: [
              { itemName: 'Rice (2kg)', quantity: 4, unitPrice: 320, vatRate: 16, vatAmount: 204.8, lineTotal: 1484.8, itemCode: '1010104040', itemClassCode: '01', unitOfMeasure: 'KGM' },
              { itemName: 'Cooking Oil (1L)', quantity: 2, unitPrice: 350, vatRate: 16, vatAmount: 112, lineTotal: 812, itemCode: '1010102020', itemClassCode: '01', unitOfMeasure: 'LTR' },
              { itemName: 'Soap Bar', quantity: 2, unitPrice: 120, vatRate: 16, vatAmount: 38.4, lineTotal: 278.4, itemCode: '1020101010', itemClassCode: '04', unitOfMeasure: 'PCE' },
            ],
          },
        },
      }),
      // Failed invoice
      db.invoice.create({
        data: {
          businessId: business.id,
          invoiceNumber: 'INV-V1W2X3Y4',
          subtotal: 440,
          totalVat: 70.4,
          totalAmount: 510.4,
          paymentMethod: 'cash',
          status: 'failed',
          retryCount: 5,
          maxRetries: 5,
          lastError: 'Buyer PIN verification failed - Invalid PIN format',
          lastSyncAttempt: new Date(now.getTime() - 30 * 60 * 1000),
          issueDate: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          localTimestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          items: {
            create: [
              { itemName: 'Maize Flour (2kg)', quantity: 2, unitPrice: 220, vatRate: 16, vatAmount: 70.4, lineTotal: 510.4, itemCode: '1010101010', itemClassCode: '01', unitOfMeasure: 'KGM' },
            ],
          },
        },
      }),
    ]);

    // Create demo purchase records
    await Promise.all([
      db.purchaseRecord.create({
        data: {
          businessId: business.id,
          supplierId: suppliers[0].id,
          supplierName: 'Eastleigh Wholesale Distributors',
          supplierPin: 'A009876543C',
          supplierInvoiceNumber: 'EWD-2024-0456',
          purchaseDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          description: 'Monthly restock - flour, oil, sugar',
          category: 'Food',
          subtotal: 15000,
          totalVat: 2400,
          totalAmount: 17400,
          paymentMethod: 'bank_transfer',
          isEtimesCompliant: true,
          buyerInitiated: false,
        },
      }),
      db.purchaseRecord.create({
        data: {
          businessId: business.id,
          supplierId: suppliers[1].id,
          supplierName: 'Mombasa Road Suppliers',
          supplierPin: 'A008765432D',
          purchaseDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          description: 'Cleaning supplies - soap, detergent',
          category: 'Household',
          subtotal: 8000,
          totalVat: 1280,
          totalAmount: 9280,
          paymentMethod: 'mpesa',
          mpesaReceiptNumber: 'QJK3K4M5NP',
          isEtimesCompliant: false,
          buyerInitiated: true,
          kraReference: 'BI-2026-001',
          notes: 'Supplier not eTIMS compliant. Buyer-initiated record generated.',
        },
      }),
      db.purchaseRecord.create({
        data: {
          businessId: business.id,
          supplierId: suppliers[2].id,
          supplierName: 'Local Farm Produce',
          purchaseDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          description: 'Fresh vegetables and fruits',
          category: 'Food',
          subtotal: 3500,
          totalVat: 0,
          totalAmount: 3500,
          paymentMethod: 'cash',
          isEtimesCompliant: false,
          buyerInitiated: false,
          notes: 'Informal market purchase. No KRA PIN available.',
        },
      }),
    ]);

    // Create demo M-Pesa transactions
    await Promise.all([
      db.mpesaTransaction.create({
        data: {
          businessId: business.id,
          invoiceId: invoices[0].id,
          mpesaReceipt: 'QJK7L8M9NR',
          phoneNumber: '254720123456',
          amount: 1276,
          accountReference: 'INV-LC8X9K2P',
          transactionDesc: 'Payment for Invoice INV-LC8X9K2P',
          status: 'completed',
          resultCode: '0',
          resultDesc: 'The service request is processed successfully.',
          reconciled: true,
          reconciledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
      }),
      db.mpesaTransaction.create({
        data: {
          businessId: business.id,
          phoneNumber: '254733456789',
          amount: 350,
          accountReference: 'Walk-in',
          transactionDesc: 'Walk-in purchase',
          status: 'completed',
          resultCode: '0',
          resultDesc: 'The service request is processed successfully.',
          reconciled: false,
        },
      }),
    ]);

    // Create settings
    await Promise.all([
      db.settings.create({
        data: { businessId: business.id, key: 'mpesa_consumer_key', value: 'sandbox-consumer-key', isSecret: true },
      }),
      db.settings.create({
        data: { businessId: business.id, key: 'mpesa_consumer_secret', value: 'sandbox-consumer-secret', isSecret: true },
      }),
      db.settings.create({
        data: { businessId: business.id, key: 'mpesa_paybill', value: '174379', isSecret: false },
      }),
      db.settings.create({
        data: { businessId: business.id, key: 'mpesa_passkey', value: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919', isSecret: true },
      }),
      db.settings.create({
        data: { businessId: business.id, key: 'kra_username', value: 'sandbox_user', isSecret: true },
      }),
      db.settings.create({
        data: { businessId: business.id, key: 'kra_password', value: 'sandbox_pass', isSecret: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with demo data',
      businessId: business.id,
      counts: {
        products: products.length,
        customers: customers.length,
        suppliers: suppliers.length,
        invoices: invoices.length,
      },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
