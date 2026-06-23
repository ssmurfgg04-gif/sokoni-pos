// Parcy POS - Internationalization System
// Full English / Kiswahili support for Kenya market

export type Locale = 'en' | 'sw';

export const translations = {
  en: {
    // App
    appName: 'Parcy',
    appTagline: 'KRA eTIMS Compliant POS',
    
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      pos: 'Point of Sale',
      invoices: 'Invoices',
      purchases: 'Purchases',
      products: 'Products',
      suppliers: 'Suppliers',
      customers: 'Customers',
      mpesa: 'M-Pesa',
      settings: 'Settings',
    },
    
    // Dashboard
    dashboard: {
      title: 'Compliance Dashboard',
      totalSales: 'Total Sales',
      totalVat: 'VAT Collected',
      invoiceCount: 'Invoices',
      pendingSync: 'Pending Sync',
      failedSync: 'Failed Sync',
      mpesaMatchRate: 'M-Pesa Match Rate',
      compliantPurchases: 'Compliant Purchases',
      nonCompliantPurchases: 'Non-Compliant Purchases',
      recentActivity: 'Recent Activity',
      complianceStatus: 'Compliance Status',
      allSynced: 'All invoices synced with KRA',
      actionRequired: 'Action required - invoices need attention',
      criticalAlert: 'Critical - invoices failing to sync',
      queuedInvoices: 'Queued Invoices',
      missingSupplierInvoices: 'Missing Supplier Invoices',
      reconciliationStatus: 'Reconciliation Status',
      quickActions: 'Quick Actions',
      newSale: 'New Sale',
      recordPurchase: 'Record Purchase',
      syncNow: 'Sync Now',
      viewAll: 'View All',
    },
    
    // POS
    pos: {
      title: 'Point of Sale',
      searchProducts: 'Search products...',
      cart: 'Cart',
      checkout: 'Checkout',
      total: 'Total',
      subtotal: 'Subtotal',
      vat: 'VAT',
      discount: 'Discount',
      addBuyer: 'Add Buyer Details (B2B)',
      buyerPin: 'Buyer KRA PIN',
      buyerName: 'Buyer Name',
      buyerAddress: 'Buyer Address',
      validatePin: 'Validate PIN',
      pinValid: 'PIN format is valid',
      pinInvalid: 'PIN format is invalid',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      mpesa: 'M-Pesa',
      bankTransfer: 'Bank Transfer',
      credit: 'Credit',
      payWithMpesa: 'Pay with M-Pesa',
      mpesaPhone: 'M-Pesa Phone Number',
      initiatePayment: 'Initiate M-Pesa Payment',
      processing: 'Processing...',
      generateInvoice: 'Generate Invoice',
      invoiceGenerated: 'Invoice generated successfully!',
      invoiceQueued: 'Invoice queued for KRA sync',
      emptyCart: 'Cart is empty',
      quantity: 'Qty',
      price: 'Price',
      remove: 'Remove',
      clearCart: 'Clear Cart',
      noProducts: 'No products found',
      addProductsFirst: 'Add products in the Products section first',
    },
    
    // Invoices
    invoices: {
      title: 'Invoices',
      invoiceNumber: 'Invoice #',
      date: 'Date',
      buyer: 'Buyer',
      amount: 'Amount',
      status: 'Status',
      payment: 'Payment',
      actions: 'Actions',
      syncNow: 'Sync Now',
      viewDetails: 'View Details',
      cancelInvoice: 'Cancel Invoice',
      retrySync: 'Retry Sync',
      filterStatus: 'Filter by Status',
      all: 'All',
      draft: 'Draft',
      queued: 'Queued',
      syncing: 'Syncing',
      synced: 'Synced',
      failed: 'Failed',
      cancelled: 'Cancelled',
      noInvoices: 'No invoices found',
      createFirst: 'Create your first invoice from the POS',
      kraDetails: 'KRA Details',
      kraSignature: 'KRA Signature',
      kraControlNumber: 'Control Number',
      qrCode: 'QR Code',
      lastError: 'Last Error',
      retryCount: 'Retry Count',
    },
    
    // Purchases
    purchases: {
      title: 'Purchase Records',
      newPurchase: 'New Purchase',
      supplierName: 'Supplier Name',
      supplierPin: 'Supplier KRA PIN',
      description: 'Description',
      amount: 'Amount',
      date: 'Date',
      compliant: 'eTIMS Compliant',
      nonCompliant: 'Not Compliant',
      buyerInitiated: 'Buyer-Initiated',
      recordPurchase: 'Record Purchase',
      purchaseDescription: 'What did you purchase?',
      category: 'Category',
      paymentMethod: 'Payment Method',
      isCompliant: 'Supplier invoice exists in eTIMS?',
      generateCompliant: 'Generate compliant purchase record',
      noPurchases: 'No purchase records yet',
      expenseWarning: 'Non-compliant purchases may be disallowed as expenses by KRA',
    },
    
    // Products
    products: {
      title: 'Products',
      newProduct: 'New Product',
      name: 'Product Name',
      sku: 'SKU',
      price: 'Price',
      cost: 'Cost Price',
      stock: 'Stock',
      vatRate: 'VAT Rate',
      category: 'Category',
      itemCode: 'KRA Item Code',
      active: 'Active',
      editProduct: 'Edit Product',
      saveProduct: 'Save Product',
      noProducts: 'No products yet',
      addFirst: 'Add your first product to start selling',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
    },
    
    // Suppliers
    suppliers: {
      title: 'Suppliers',
      newSupplier: 'New Supplier',
      name: 'Supplier Name',
      kraPin: 'KRA PIN',
      phone: 'Phone',
      email: 'Email',
      isEtimesCompliant: 'eTIMS Compliant?',
      saveSupplier: 'Save Supplier',
      noSuppliers: 'No suppliers yet',
      complianceNote: 'Mark suppliers as eTIMS compliant to track compliance status',
    },
    
    // Customers
    customers: {
      title: 'Customers',
      newCustomer: 'New Customer',
      name: 'Customer Name',
      kraPin: 'KRA PIN',
      phone: 'Phone',
      email: 'Email',
      vatRegistered: 'VAT Registered?',
      saveCustomer: 'Save Customer',
      noCustomers: 'No customers yet',
      b2bNote: 'Add KRA PIN for B2B customers to issue compliant invoices',
    },
    
    // M-Pesa
    mpesa: {
      title: 'M-Pesa Transactions',
      recent: 'Recent Transactions',
      receipt: 'M-Pesa Receipt',
      phone: 'Phone Number',
      amount: 'Amount',
      status: 'Status',
      invoice: 'Linked Invoice',
      reconciled: 'Reconciled',
      unmatched: 'Unmatched',
      reconcileNow: 'Reconcile Now',
      noTransactions: 'No M-Pesa transactions yet',
      reconciliationRate: 'Reconciliation Rate',
    },
    
    // Settings
    settings: {
      title: 'Settings',
      businessProfile: 'Business Profile',
      businessName: 'Business Name',
      kraPin: 'KRA PIN',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      vatRegistered: 'VAT Registered?',
      kraCredentials: 'KRA eTIMS Credentials',
      kraUsername: 'eTIMS Username',
      kraPassword: 'eTIMS Password',
      mpesaConfig: 'M-Pesa Configuration',
      consumerKey: 'Consumer Key',
      consumerSecret: 'Consumer Secret',
      paybillNumber: 'Paybill/Till Number',
      passkey: 'Passkey',
      language: 'Language',
      english: 'English',
      kiswahili: 'Kiswahili',
      pricingPlan: 'Pricing Plan',
      free: 'Free',
      growth: 'Growth',
      pro: 'Pro',
      invoicesUsed: 'Invoices Used',
      of: 'of',
      save: 'Save Settings',
      saved: 'Settings saved successfully!',
    },
    
    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      close: 'Close',
      confirm: 'Confirm',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      noData: 'No data available',
      search: 'Search...',
      filter: 'Filter',
      export: 'Export',
      refresh: 'Refresh',
      back: 'Back',
      next: 'Next',
      yes: 'Yes',
      no: 'No',
      ksh: 'KES',
    },
  },
  
  sw: {
    // App
    appName: 'Parcy',
    appTagline: 'POS ya KRA eTIMS',
    
    // Navigation
    nav: {
      dashboard: 'Dashibodi',
      pos: 'Kituo cha Uuzaji',
      invoices: 'Ankara',
      purchases: 'Manunuo',
      products: 'Bidhaa',
      suppliers: 'Wasambazaji',
      customers: 'Wateja',
      mpesa: 'M-Pesa',
      settings: 'Mipangilio',
    },
    
    // Dashboard
    dashboard: {
      title: 'Dashibodi ya Utiifu',
      totalSales: 'Jumla ya Mauzo',
      totalVat: 'VAT Iliyokusanywa',
      invoiceCount: 'Ankara',
      pendingSync: 'Zinangojea Kusawazishwa',
      failedSync: 'Zilishindwa Kusawazishwa',
      mpesaMatchRate: 'Kiwango cha M-Pesa',
      compliantPurchases: 'Manunuo ya Utiifu',
      nonCompliantPurchases: 'Manunuo Yasiyo ya Utiifu',
      recentActivity: 'Shughuli za Hivi Karibu',
      complianceStatus: 'Hali ya Utiifu',
      allSynced: 'Ankara zote zimesawazishwa na KRA',
      actionRequired: 'Hatua inahitajika - Ankara zinahitaji tahadhari',
      criticalAlert: 'Hatari - Ankara zinashindwa kusawazishwa',
      queuedInvoices: 'Ankara Zinangojea',
      missingSupplierInvoices: 'Ankara za Wasambazaji Zinakosekana',
      reconciliationStatus: 'Hali ya Upatanisho',
      quickActions: 'Vitendo vya Haraka',
      newSale: 'Mauzo Mapya',
      recordPurchase: 'Rekodi Manunuo',
      syncNow: 'Sawazisha Sasa',
      viewAll: 'Tazama Zote',
    },
    
    // POS
    pos: {
      title: 'Kituo cha Uuzaji',
      searchProducts: 'Tafuta bidhaa...',
      cart: 'Kikapu',
      checkout: 'Lipia',
      total: 'Jumla',
      subtotal: 'Jumla ndogo',
      vat: 'VAT',
      discount: 'Punguzo',
      addBuyer: 'Ongeza Maelezo ya Mnunuzi (B2B)',
      buyerPin: 'KRA PIN ya Mnunuzi',
      buyerName: 'Jina la Mnunuzi',
      buyerAddress: 'Anwani ya Mnunuzi',
      validatePin: 'Thibitisha PIN',
      pinValid: 'Muundo wa PIN ni sahihi',
      pinInvalid: 'Muundo wa PIN si sahihi',
      paymentMethod: 'Njia ya Malipo',
      cash: 'Pesa Taslimu',
      mpesa: 'M-Pesa',
      bankTransfer: 'Ham ya Benki',
      credit: 'Mkopo',
      payWithMpesa: 'Lipa kwa M-Pesa',
      mpesaPhone: 'Namba ya Simu ya M-Pesa',
      initiatePayment: 'Anzisha Malipo ya M-Pesa',
      processing: 'Inachakata...',
      generateInvoice: 'Tengeneza Ankara',
      invoiceGenerated: 'Ankara imetengenezwa kwa mafanikio!',
      invoiceQueued: 'Ankara imewekwa kwenye foleni ya KRA',
      emptyCart: 'Kikapu ni tupu',
      quantity: 'Idadi',
      price: 'Bei',
      remove: 'Ondoa',
      clearCart: 'Futa Kikapu',
      noProducts: 'Hakuna bidhaa zilizopatikana',
      addProductsFirst: 'Ongeza bidhaa katika sehemu ya Bidhaa kwanza',
    },
    
    // Invoices
    invoices: {
      title: 'Ankara',
      invoiceNumber: 'Ankara #',
      date: 'Tarehe',
      buyer: 'Mnunuzi',
      amount: 'Kiasi',
      status: 'Hali',
      payment: 'Malipo',
      actions: 'Vitendo',
      syncNow: 'Sawazisha Sasa',
      viewDetails: 'Tazama Maelezo',
      cancelInvoice: 'Ghairi Ankara',
      retrySync: 'Jaribu Tena',
      filterStatus: 'Chuja kwa Hali',
      all: 'Zote',
      draft: 'Rasimu',
      queued: 'Kwenye Foleni',
      syncing: 'Inasawazisha',
      synced: 'Imesawazishwa',
      failed: 'Imeshindwa',
      cancelled: 'Imeghairiwa',
      noInvoices: 'Hakuna ankara zilizopatikana',
      createFirst: 'Tengeneza ankara yako ya kwanza kutoka kwa POS',
      kraDetails: 'Maelezo ya KRA',
      kraSignature: 'Saini ya KRA',
      kraControlNumber: 'Namba ya Udhibiti',
      qrCode: 'Msimbo wa QR',
      lastError: 'Kosa la Mwisho',
      retryCount: 'Idadi ya Majaribio',
    },
    
    // Purchases
    purchases: {
      title: 'Rekodi za Manunuo',
      newPurchase: 'Manunuo Mapya',
      supplierName: 'Jina la Msambazaji',
      supplierPin: 'KRA PIN ya Msambazaji',
      description: 'Maelezo',
      amount: 'Kiasi',
      date: 'Tarehe',
      compliant: 'Ya Utiifu wa eTIMS',
      nonCompliant: 'Si ya Utiifu',
      buyerInitiated: 'Iliyoanzishwa na Mnunuzi',
      recordPurchase: 'Rekodi Manunuo',
      purchaseDescription: 'Ulinunua nini?',
      category: 'Kategoria',
      paymentMethod: 'Njia ya Malipo',
      isCompliant: 'Ankara ya msambazaji ipo kwenye eTIMS?',
      generateCompliant: 'Tengeneza rekodi ya manunuo ya utiifu',
      noPurchases: 'Hakuna rekodi za manunuo bado',
      expenseWarning: 'Manunuo yasiyo ya utiifu yanaweza kukataliwa na KRA',
    },
    
    // Products
    products: {
      title: 'Bidhaa',
      newProduct: 'Bidhaa Mpya',
      name: 'Jina la Bidhaa',
      sku: 'SKU',
      price: 'Bei',
      cost: 'Bei ya Gharama',
      stock: 'Hifadhi',
      vatRate: 'Kiwango cha VAT',
      category: 'Kategoria',
      itemCode: 'Kificho cha KRA',
      active: 'Inatumika',
      editProduct: 'Hariri Bidhaa',
      saveProduct: 'Hifadhi Bidhaa',
      noProducts: 'Hakuna bidhaa bado',
      addFirst: 'Ongeza bidhaa yako ya kwanza kuanza kuuza',
      lowStock: 'Hifadhi Ndogo',
      outOfStock: 'Imeisha',
    },
    
    // Suppliers
    suppliers: {
      title: 'Wasambazaji',
      newSupplier: 'Msambazaji Mpya',
      name: 'Jina la Msambazaji',
      kraPin: 'KRA PIN',
      phone: 'Simu',
      email: 'Barua Pepe',
      isEtimesCompliant: 'Ya Utiifu wa eTIMS?',
      saveSupplier: 'Hifadhi Msambazaji',
      noSuppliers: 'Hakuna wasambazaji bado',
      complianceNote: 'Weka alama wasambazaji kama wa utiifu wa eTIMS kufuatilia hali',
    },
    
    // Customers
    customers: {
      title: 'Wateja',
      newCustomer: 'Mteja Mpya',
      name: 'Jina la Mteja',
      kraPin: 'KRA PIN',
      phone: 'Simu',
      email: 'Barua Pepe',
      vatRegistered: 'Wasajiliwa wa VAT?',
      saveCustomer: 'Hifadhi Mteja',
      noCustomers: 'Hakuna wateja bado',
      b2bNote: 'Ongeza KRA PIN kwa wateja wa B2B kutengeneza ankara za utiifu',
    },
    
    // M-Pesa
    mpesa: {
      title: 'Muamala wa M-Pesa',
      recent: 'Muamala wa Hivi Karibu',
      receipt: 'Risiti ya M-Pesa',
      phone: 'Namba ya Simu',
      amount: 'Kiasi',
      status: 'Hali',
      invoice: 'Ankara Iliyounganishwa',
      reconciled: 'Imepatishana',
      unmatched: 'Haijapatana',
      reconcileNow: 'Patana Sasa',
      noTransactions: 'Hakuna muamala wa M-Pesa bado',
      reconciliationRate: 'Kiwango cha Upatanisho',
    },
    
    // Settings
    settings: {
      title: 'Mipangilio',
      businessProfile: 'Wasifu wa Biashara',
      businessName: 'Jina la Biashara',
      kraPin: 'KRA PIN',
      email: 'Barua Pepe',
      phone: 'Simu',
      address: 'Anwani',
      vatRegistered: 'Wasajiliwa wa VAT?',
      kraCredentials: 'Vyeti vya KRA eTIMS',
      kraUsername: 'Jina la eTIMS',
      kraPassword: 'Nenosiri la eTIMS',
      mpesaConfig: 'Usanidi wa M-Pesa',
      consumerKey: 'Ufunguo wa Mteja',
      consumerSecret: 'Siri ya Mteja',
      paybillNumber: 'Namba ya Paybill/Till',
      passkey: 'Ufunguo wa Upitishaji',
      language: 'Lugha',
      english: 'Kiingereza',
      kiswahili: 'Kiswahili',
      pricingPlan: 'Mpango wa Bei',
      free: 'Bure',
      growth: 'Ukuaji',
      pro: 'Pro',
      invoicesUsed: 'Ankara Zilizotumika',
      of: 'ya',
      save: 'Hifadhi Mipangilio',
      saved: 'Mipangilio imehifadhiwa kwa mafanikio!',
    },
    
    // Common
    common: {
      save: 'Hifadhi',
      cancel: 'Ghairi',
      delete: 'Futa',
      edit: 'Hariri',
      add: 'Ongeza',
      close: 'Funga',
      confirm: 'Thibitisha',
      loading: 'Inapakia...',
      error: 'Kosa',
      success: 'Mafanikio',
      warning: 'Onyo',
      noData: 'Hakuna data inayopatikana',
      search: 'Tafuta...',
      filter: 'Chuja',
      export: 'Hamisha',
      refresh: 'Refresh',
      back: 'Rudi',
      next: 'Mbele',
      yes: 'Ndiyo',
      no: 'Hapana',
      ksh: 'KES',
    },
  },
} as const;

export type TranslationKey = typeof translations.en;

export function t(locale: Locale, path: string): string {
  const keys = path.split('.');
  let current: any = translations[locale];
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      // Fallback to English
      let fallback: any = translations.en;
      for (const k of keys) {
        if (fallback && typeof fallback === 'object' && k in fallback) {
          fallback = fallback[k];
        } else {
          return path; // Return key path if not found
        }
      }
      return fallback;
    }
  }
  return typeof current === 'string' ? current : path;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function validateKRAPin(pin: string): { valid: boolean; message: string } {
  if (!pin) return { valid: false, message: 'PIN is required' };
  
  // KRA PIN format: Letter + 9 digits + Letter (e.g., A00XXXXXXXXX)
  const pinPattern = /^[A-Za-z]\d{9}[A-Za-z]$/;
  
  if (!pinPattern.test(pin)) {
    return { 
      valid: false, 
      message: 'KRA PIN must be in format: Letter + 9 digits + Letter (e.g., A001234567B)' 
    };
  }
  
  return { valid: true, message: 'PIN format is valid' };
}

export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
