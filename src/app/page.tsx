'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, FileText, Package, Users, Truck, CreditCard, Settings,
  Plus, Search, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, Wifi, WifiOff,
  ChevronRight, Trash2, X, Edit2, Save, AlertCircle, ArrowRight, Menu, Globe,
  TrendingUp, DollarSign, Receipt, Shield, BarChart3, Zap, Phone, QrCode, Copy,
  ChevronDown, Eye, RotateCcw, Bell, Moon, Sun, Store, MapPin
} from 'lucide-react';
import { translations, formatCurrency, type Locale } from '@/lib/i18n';

// ============================================
// TYPES
// ============================================
type View = 'dashboard' | 'pos' | 'invoices' | 'purchases' | 'products' | 'suppliers' | 'customers' | 'mpesa' | 'settings';

interface Product {
  id: string; name: string; sku?: string; category?: string; unitPrice: number;
  costPrice?: number; vatRate: number; vatType: string; quantity: number;
  reorderLevel: number; itemCode?: string; itemClassCode?: string; unitOfMeasure?: string; isActive: boolean;
}

interface CartItem {
  product: Product; quantity: number;
}

interface Invoice {
  id: string; invoiceNumber: string; buyerPin?: string; buyerName?: string;
  buyerAddress?: string; subtotal: number; totalVat: number; totalAmount: number;
  paymentMethod: string; status: string; kraSignature?: string; kraControlNumber?: string;
  kraQrCodeData?: string; retryCount: number; lastError?: string; createdAt: string;
  items: any[]; mpesaReceiptNumber?: string;
}

interface Customer {
  id: string; name: string; kraPin?: string; email?: string; phone?: string;
  address?: string; isVatRegistered: boolean;
}

interface Supplier {
  id: string; name: string; kraPin?: string; email?: string; phone?: string;
  address?: string; isEtimesCompliant: boolean; _count?: { purchases: number };
}

interface PurchaseRecord {
  id: string; supplierName: string; supplierPin?: string; description: string;
  totalAmount: number; totalVat: number; purchaseDate: string; paymentMethod: string;
  isEtimesCompliant: boolean; buyerInitiated: boolean; notes?: string; kraReference?: string;
  supplier?: { id: string; name: string; isEtimesCompliant: boolean };
}

interface MpesaTransaction {
  id: string; mpesaReceipt?: string; phoneNumber: string; amount: number;
  status: string; reconciled: boolean; createdAt: string; accountReference?: string;
  invoice?: { id: string; invoiceNumber: string; totalAmount: number };
}

interface DashboardData {
  sales: { totalSales: number; totalVat: number; todaySales: number; invoiceCount: number; averageInvoiceValue: number };
  sync: { queued: number; syncing: number; synced: number; failed: number; total: number; syncRate: number };
  purchases: { total: number; inputVat: number; count: number; compliant: number; nonCompliant: number; complianceRate: number };
  mpesa: { totalTransactions: number; totalAmount: number; reconciled: number; reconciliationRate: number };
  compliance: { score: number; status: string };
  recent: { invoices: any[]; purchases: any[] };
  alerts: { lowStock: any[]; failedSyncs: number; nonCompliantPurchases: number };
}

// ============================================
// HELPER: t() for translations
// ============================================
function t(locale: Locale, path: string): string {
  const keys = path.split('.');
  let current: any = translations[locale];
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      let fallback: any = translations.en;
      for (const k of keys) {
        if (fallback && typeof fallback === 'object' && k in fallback) { fallback = fallback[k]; } else { return path; }
      }
      return typeof fallback === 'string' ? fallback : path;
    }
  }
  return typeof current === 'string' ? current : path;
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    synced: { label: 'Synced', className: 'status-synced', icon: <CheckCircle className="w-3 h-3" /> },
    queued: { label: 'Queued', className: 'status-queued', icon: <Clock className="w-3 h-3" /> },
    syncing: { label: 'Syncing', className: 'status-syncing syncing-pulse', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    failed: { label: 'Failed', className: 'status-failed', icon: <XCircle className="w-3 h-3" /> },
    draft: { label: 'Draft', className: 'status-draft', icon: <Edit2 className="w-3 h-3" /> },
    cancelled: { label: 'Cancelled', className: 'status-cancelled', icon: <X className="w-3 h-3" /> },
    completed: { label: 'Complete', className: 'status-synced', icon: <CheckCircle className="w-3 h-3" /> },
    pending: { label: 'Pending', className: 'status-queued', icon: <Clock className="w-3 h-3" /> },
    processing: { label: 'Processing', className: 'status-syncing', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    timed_out: { label: 'Timed Out', className: 'status-failed', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const c = config[status] || config.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function ParcyPOS() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [locale, setLocale] = useState<Locale>('en');
  const [businessId, setBusinessId] = useState<string>('');
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSeeded, setIsSeeded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Data state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [mpesaTransactions, setMpesaTransactions] = useState<MpesaTransaction[]>([]);

  // POS state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [showBuyerFields, setShowBuyerFields] = useState(false);
  const [buyerPin, setBuyerPin] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Toggle dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Seed database on first load
  const seedDatabase = useCallback(async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.businessId) {
        setBusinessId(data.businessId);
        setIsSeeded(true);
        showToast('Demo data loaded successfully!', 'success');
      } else if (data.message && data.businessId) {
        setBusinessId(data.businessId);
        setIsSeeded(true);
      }
    } catch (err) {
      showToast('Failed to seed database', 'error');
    }
  }, []);

  useEffect(() => {
    if (!isSeeded) seedDatabase();
  }, [isSeeded, seedDatabase]);

  // Fetch data based on current view
  const fetchDashboard = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/dashboard?businessId=${businessId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDashboard(data);
    } catch (err) { console.error('Dashboard fetch error:', err); }
  }, [businessId]);

  const fetchProducts = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/products?businessId=${businessId}`);
      setProducts(await res.json());
    } catch (err) { console.error(err); }
  }, [businessId]);

  const fetchInvoices = useCallback(async (status?: string) => {
    if (!businessId) return;
    try {
      const url = `/api/invoices?businessId=${businessId}${status && status !== 'all' ? `&status=${status}` : ''}`;
      const res = await fetch(url);
      setInvoices(await res.json());
    } catch (err) { console.error(err); }
  }, [businessId]);

  const fetchCustomers = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/customers?businessId=${businessId}`);
      setCustomers(await res.json());
    } catch (err) { console.error(err); }
  }, [businessId]);

  const fetchSuppliers = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/suppliers?businessId=${businessId}`);
      setSuppliers(await res.json());
    } catch (err) { console.error(err); }
  }, [businessId]);

  const fetchPurchases = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/purchases?businessId=${businessId}`);
      setPurchases(await res.json());
    } catch (err) { console.error(err); }
  }, [businessId]);

  const fetchMpesa = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetch(`/api/mpesa?businessId=${businessId}`);
      setMpesaTransactions(await res.json());
    } catch (err) { console.error(err); }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    const fetchers: Record<View, () => void> = {
      dashboard: fetchDashboard,
      pos: fetchProducts,
      invoices: () => fetchInvoices(),
      purchases: fetchPurchases,
      products: fetchProducts,
      suppliers: fetchSuppliers,
      customers: fetchCustomers,
      mpesa: fetchMpesa,
      settings: () => {},
    };
    fetchers[currentView]?.();
  }, [currentView, businessId, fetchDashboard, fetchProducts, fetchInvoices, fetchPurchases, fetchSuppliers, fetchCustomers, fetchMpesa]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  // ============================================
  // NAV ITEMS
  // ============================================
  const navItems: { view: View; icon: React.ReactNode; labelKey: string }[] = [
    { view: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, labelKey: 'nav.dashboard' },
    { view: 'pos', icon: <ShoppingCart className="w-5 h-5" />, labelKey: 'nav.pos' },
    { view: 'invoices', icon: <FileText className="w-5 h-5" />, labelKey: 'nav.invoices' },
    { view: 'purchases', icon: <Package className="w-5 h-5" />, labelKey: 'nav.purchases' },
    { view: 'products', icon: <BarChart3 className="w-5 h-5" />, labelKey: 'nav.products' },
    { view: 'suppliers', icon: <Truck className="w-5 h-5" />, labelKey: 'nav.suppliers' },
    { view: 'customers', icon: <Users className="w-5 h-5" />, labelKey: 'nav.customers' },
    { view: 'mpesa', icon: <CreditCard className="w-5 h-5" />, labelKey: 'nav.mpesa' },
    { view: 'settings', icon: <Settings className="w-5 h-5" />, labelKey: 'nav.settings' },
  ];

  // ============================================
  // CART FUNCTIONS
  // ============================================
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const cartSubtotal = cart.reduce((sum, i) => sum + i.product.unitPrice * i.quantity, 0);
  const cartVat = cart.reduce((sum, i) => {
    const lineTotal = i.product.unitPrice * i.quantity;
    return sum + (lineTotal * i.product.vatRate / 100);
  }, 0);
  const cartTotal = cartSubtotal + cartVat;

  const generateInvoice = async () => {
    if (cart.length === 0 || !businessId) return;
    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        itemName: item.product.name,
        itemCode: item.product.itemCode,
        itemClassCode: item.product.itemClassCode,
        quantity: item.quantity,
        unitPrice: item.product.unitPrice,
        vatRate: item.product.vatRate,
        unitOfMeasure: item.product.unitOfMeasure,
        discountAmount: 0,
      }));

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          items,
          buyerPin: showBuyerFields ? buyerPin : undefined,
          buyerName: showBuyerFields ? buyerName : undefined,
          customerId: selectedCustomer?.id,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCart([]);
      setBuyerPin('');
      setBuyerName('');
      setShowBuyerFields(false);
      showToast(t(locale, 'pos.invoiceGenerated'), 'success');

      // Trigger sync
      fetch(`/api/kra/sync?invoiceId=${data.id}&businessId=${businessId}`, { method: 'POST' }).catch(() => {});

      // Refresh data
      fetchProducts();
      fetchDashboard();
    } catch (err: any) {
      showToast(err.message || 'Failed to create invoice', 'error');
    }
  };

  const initiateMpesaPayment = async () => {
    if (!mpesaPhone || !businessId) return;
    try {
      const res = await fetch('/api/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stk_push',
          phoneNumber: mpesaPhone,
          amount: cartTotal,
          businessId,
          accountReference: `POS-${Date.now()}`,
          transactionDesc: 'Parcy POS Payment',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('M-Pesa STK push sent! Check your phone.', 'success');
        setPaymentMethod('mpesa');
      } else {
        showToast(data.error || 'M-Pesa initiation failed', 'error');
      }
    } catch (err: any) {
      showToast('M-Pesa error: ' + err.message, 'error');
    }
  };

  const validatePin = async (pin: string) => {
    if (!pin) return;
    try {
      const res = await fetch('/api/kra/validate-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      showToast(data.message, data.valid ? 'success' : 'error');
    } catch (err) {
      showToast('PIN validation failed', 'error');
    }
  };

  const retryInvoiceSync = async (invoiceId: string) => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, action: 'retry' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Invoice queued for resync', 'success');
      fetchInvoices();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ============================================
  // RENDER: SIDEBAR
  // ============================================
  const renderSidebar = () => (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:z-auto`}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Store className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Parcy</h1>
              <p className="text-xs text-muted-foreground">{t(locale, 'appTagline')}</p>
            </div>
          </div>
        </div>

        {/* Online status */}
        <div className={`px-4 py-2 text-xs flex items-center gap-2 ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'Offline - Queuing'}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => (
            <button
              key={item.view}
              onClick={() => { setCurrentView(item.view); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                currentView === item.view ? 'nav-item-active' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.icon}
              {t(locale, item.labelKey)}
              {item.view === 'invoices' && dashboard && dashboard.sync.failed > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">{dashboard.sync.failed}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={() => setLocale(l => l === 'en' ? 'sw' : 'en')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="w-4 h-4" />
            {locale === 'en' ? 'Kiswahili' : 'English'}
          </button>
          <button
            onClick={() => setIsDark(d => !d)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    </aside>
  );

  // ============================================
  // RENDER: DASHBOARD
  // ============================================
  const renderDashboard = () => {
    if (!dashboard) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

    const compClass = dashboard.compliance.status === 'good' ? 'compliance-good' : dashboard.compliance.status === 'warning' ? 'compliance-warning' : 'compliance-critical';
    const compIcon = dashboard.compliance.status === 'good' ? <CheckCircle className="w-8 h-8" /> : dashboard.compliance.status === 'warning' ? <AlertTriangle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />;

    return (
      <div className="space-y-6">
        {/* Compliance Score Hero */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-800 dark:to-teal-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">{t(locale, 'dashboard.complianceStatus')}</p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-5xl font-bold">{dashboard.compliance.score}%</span>
                <span className="text-emerald-200 text-sm">KRA eTIMS Compliance</span>
              </div>
              <p className="text-emerald-100 text-sm mt-2">
                {dashboard.compliance.status === 'good' ? t(locale, 'dashboard.allSynced') :
                 dashboard.compliance.status === 'warning' ? t(locale, 'dashboard.actionRequired') :
                 t(locale, 'dashboard.criticalAlert')}
              </p>
            </div>
            <div className={`${compClass} opacity-30`}>{compIcon}</div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="w-4 h-4" /> {t(locale, 'dashboard.totalSales')}
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(dashboard.sales.totalSales)}</p>
            <p className="text-xs text-muted-foreground mt-1">{dashboard.sales.invoiceCount} invoices</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Receipt className="w-4 h-4" /> {t(locale, 'dashboard.totalVat')}
            </div>
            <p className="text-xl font-bold text-foreground">{formatCurrency(dashboard.sales.totalVat)}</p>
            <p className="text-xs text-muted-foreground mt-1">VAT collected</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="w-4 h-4" /> {t(locale, 'dashboard.pendingSync')}
            </div>
            <p className="text-xl font-bold text-foreground">{dashboard.sync.queued}</p>
            <p className="text-xs text-orange-600 mt-1">{dashboard.sync.failed} failed</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CreditCard className="w-4 h-4" /> {t(locale, 'dashboard.mpesaMatchRate')}
            </div>
            <p className="text-xl font-bold text-foreground">{dashboard.mpesa.reconciliationRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{dashboard.mpesa.reconciled} matched</p>
          </div>
        </div>

        {/* Sync & Purchase Compliance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sync Status */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> KRA Sync Status
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Synced</span>
                <span className="font-semibold">{dashboard.sync.synced}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-500" /> Queued</span>
                <span className="font-semibold">{dashboard.sync.queued}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> Failed</span>
                <span className="font-semibold text-red-600">{dashboard.sync.failed}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex justify-between items-center text-sm">
                  <span>Sync Rate</span>
                  <span className="font-bold text-primary">{dashboard.sync.syncRate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${dashboard.sync.syncRate}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Compliance */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Purchase Compliance
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Compliant</span>
                <span className="font-semibold">{dashboard.purchases.compliant}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /> Non-Compliant</span>
                <span className="font-semibold text-yellow-600">{dashboard.purchases.nonCompliant}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex justify-between items-center text-sm">
                  <span>Compliance Rate</span>
                  <span className={`font-bold ${dashboard.purchases.complianceRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{dashboard.purchases.complianceRate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div className={`h-2 rounded-full transition-all ${dashboard.purchases.complianceRate >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${dashboard.purchases.complianceRate}%` }} />
                </div>
              </div>
              {dashboard.purchases.nonCompliant > 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {t(locale, 'purchases.expenseWarning')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-3">{t(locale, 'dashboard.quickActions')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button onClick={() => setCurrentView('pos')} className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium">
              <ShoppingCart className="w-4 h-4" /> {t(locale, 'dashboard.newSale')}
            </button>
            <button onClick={() => setCurrentView('purchases')} className="flex items-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium">
              <Package className="w-4 h-4" /> {t(locale, 'dashboard.recordPurchase')}
            </button>
            <button onClick={async () => { await fetch('/api/kra/sync?action=process_queue&businessId=' + businessId, { method: 'POST' }); fetchDashboard(); showToast('Sync queue processed', 'success'); }} className="flex items-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium">
              <RefreshCw className="w-4 h-4" /> {t(locale, 'dashboard.syncNow')}
            </button>
            <button onClick={() => setCurrentView('invoices')} className="flex items-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium">
              <FileText className="w-4 h-4" /> {t(locale, 'dashboard.viewAll')}
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-3">{t(locale, 'dashboard.recentActivity')}</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {dashboard.recent.invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={inv.status} />
                  <div>
                    <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{inv.buyerName || 'Walk-in'}</p>
                  </div>
                </div>
                <span className="font-semibold text-sm">{formatCurrency(inv.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: POS
  // ============================================
  const renderPOS = () => {
    const filteredProducts = products.filter(p =>
      p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(posSearch.toLowerCase())
    );
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    return (
      <div className="pos-grid">
        {/* Product Grid */}
        <div className="space-y-4 overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t(locale, 'pos.searchProducts')}
              value={posSearch}
              onChange={e => setPosSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setPosSearch('')}
              className={`px-3 py-1 text-xs rounded-full border transition ${posSearch === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
            >All</button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setPosSearch(cat || '')}
                className={`px-3 py-1 text-xs rounded-full border transition ${posSearch === cat ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
              >{cat}</button>
            ))}
          </div>

          {/* Products */}
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t(locale, 'pos.noProducts')}</p>
              <button onClick={() => setCurrentView('products')} className="text-primary hover:underline text-sm mt-2">{t(locale, 'pos.addProductsFirst')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-card border border-border rounded-lg p-3 text-left hover:border-primary hover:shadow-md transition-all active:scale-95"
                >
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{product.sku} • {product.quantity} in stock</p>
                  <p className="text-primary font-bold mt-1">{formatCurrency(product.unitPrice)}</p>
                  {product.quantity <= product.reorderLevel && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">Low Stock!</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="bg-card border border-border rounded-xl flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> {t(locale, 'pos.cart')}
              {cart.length > 0 && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{cart.length}</span>}
            </h2>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t(locale, 'pos.emptyCart')}</p>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-2 bg-muted rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.product.unitPrice)} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center rounded bg-card border border-border text-sm hover:bg-muted">-</button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded bg-card border border-border text-sm hover:bg-muted">+</button>
                  </div>
                  <p className="font-semibold text-sm w-20 text-right">{formatCurrency(item.product.unitPrice * item.quantity)}</p>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart totals & checkout */}
          <div className="border-t border-border p-4 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t(locale, 'pos.subtotal')}</span><span>{formatCurrency(cartSubtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t(locale, 'pos.vat')}</span><span>{formatCurrency(cartVat)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-border">
                <span>{t(locale, 'pos.total')}</span>
                <span className="text-primary">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* B2B toggle */}
            <button
              onClick={() => setShowBuyerFields(!showBuyerFields)}
              className="w-full text-left text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${showBuyerFields ? 'rotate-90' : ''}`} />
              {t(locale, 'pos.addBuyer')}
            </button>

            {showBuyerFields && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <div>
                  <label className="text-xs text-muted-foreground">{t(locale, 'pos.buyerPin')}</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={buyerPin}
                      onChange={e => setBuyerPin(e.target.value.toUpperCase())}
                      placeholder="A001234567B"
                      maxLength={11}
                      className="flex-1 px-2 py-1.5 text-sm bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button onClick={() => validatePin(buyerPin)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90">
                      {t(locale, 'pos.validatePin')}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t(locale, 'pos.buyerName')}</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    placeholder="Company Name"
                    className="w-full px-2 py-1.5 text-sm bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Payment method */}
            <div>
              <label className="text-xs text-muted-foreground">{t(locale, 'pos.paymentMethod')}</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {['cash', 'mpesa', 'bank_transfer', 'credit'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`px-3 py-2 text-xs rounded-lg border transition ${
                      paymentMethod === method ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    {t(locale, `pos.${method}` as any)}
                  </button>
                ))}
              </div>
            </div>

            {/* M-Pesa phone */}
            {paymentMethod === 'mpesa' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">{t(locale, 'pos.mpesaPhone')}</label>
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={e => setMpesaPhone(e.target.value)}
                    placeholder="254712345678"
                    className="w-full px-2 py-1.5 text-sm bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={initiateMpesaPayment}
                  className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" /> {t(locale, 'pos.initiatePayment')}
                </button>
              </div>
            )}

            {/* Generate Invoice */}
            <button
              onClick={generateInvoice}
              disabled={cart.length === 0}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" /> {t(locale, 'pos.generateInvoice')}
            </button>

            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="w-full text-xs text-muted-foreground hover:text-destructive py-1">
                {t(locale, 'pos.clearCart')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: INVOICES
  // ============================================
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const renderInvoices = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t(locale, 'invoices.title')}</h2>
        <button onClick={() => fetchInvoices()} className="p-2 hover:bg-muted rounded-lg"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'synced', 'queued', 'failed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => { setInvoiceFilter(status); fetchInvoices(status !== 'all' ? status : undefined); }}
            className={`px-3 py-1.5 text-xs rounded-full border transition ${
              invoiceFilter === status ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'
            }`}
          >
            {t(locale, `invoices.${status}` as any)} {status !== 'all' && `(${invoices.filter(i => i.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t(locale, 'invoices.noInvoices')}</p>
          <button onClick={() => setCurrentView('pos')} className="text-primary hover:underline text-sm mt-2">{t(locale, 'invoices.createFirst')}</button>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => (
            <div
              key={inv.id}
              onClick={async () => {
                const res = await fetch(`/api/invoices?id=${inv.id}`);
                setSelectedInvoice(await res.json());
              }}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary cursor-pointer transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={inv.status} />
                  <div>
                    <p className="font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{inv.buyerName || 'Walk-in'} • {new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(inv.totalAmount)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{inv.paymentMethod}</p>
                </div>
              </div>
              {inv.lastError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {inv.lastError}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
          <div className="bg-card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{selectedInvoice.invoiceNumber}</h3>
              <button onClick={() => setSelectedInvoice(null)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={selectedInvoice.status} />
              </div>
              {selectedInvoice.buyerPin && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Buyer PIN</span>
                  <span className="font-mono">{selectedInvoice.buyerPin}</span>
                </div>
              )}
              {selectedInvoice.buyerName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Buyer</span>
                  <span>{selectedInvoice.buyerName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <span className="capitalize">{selectedInvoice.paymentMethod}</span>
              </div>
              {selectedInvoice.mpesaReceiptNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">M-Pesa Receipt</span>
                  <span className="font-mono text-green-600">{selectedInvoice.mpesaReceiptNumber}</span>
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-1">
                {selectedInvoice.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.itemName} x {item.quantity}</span>
                    <span>{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(selectedInvoice.subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span>VAT</span><span>{formatCurrency(selectedInvoice.totalVat)}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{formatCurrency(selectedInvoice.totalAmount)}</span></div>
              </div>

              {/* KRA Details */}
              {selectedInvoice.kraControlNumber && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">KRA eTIMS Verified</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Control #: {selectedInvoice.kraControlNumber}</p>
                    <p>Signature: {selectedInvoice.kraSignature?.substring(0, 20)}...</p>
                    {selectedInvoice.kraQrCodeData && <p>QR: {selectedInvoice.kraQrCodeData.substring(0, 40)}...</p>}
                  </div>
                </div>
              )}

              {selectedInvoice.lastError && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <p className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {selectedInvoice.lastError}</p>
                  <p className="text-xs text-muted-foreground mt-1">Retries: {selectedInvoice.retryCount}/5</p>
                </div>
              )}

              {selectedInvoice.status === 'failed' && (
                <button
                  onClick={() => { retryInvoiceSync(selectedInvoice.id); setSelectedInvoice(null); }}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> {t(locale, 'invoices.retrySync')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: PURCHASES
  // ============================================
  const [showNewPurchase, setShowNewPurchase] = useState(false);
  const [newPurchase, setNewPurchase] = useState({ supplierName: '', supplierPin: '', description: '', totalAmount: '', totalVat: '0', category: 'Food', paymentMethod: 'cash', isEtimesCompliant: false, buyerInitiated: false, notes: '' });

  const renderPurchases = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t(locale, 'purchases.title')}</h2>
        <button onClick={() => setShowNewPurchase(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {t(locale, 'purchases.newPurchase')}
        </button>
      </div>

      {/* Compliance warning */}
      {purchases.some(p => !p.isEtimesCompliant) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">{t(locale, 'purchases.expenseWarning')}</p>
        </div>
      )}

      {/* Purchase list */}
      {purchases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t(locale, 'purchases.noPurchases')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {purchases.map(purchase => (
            <div key={purchase.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {purchase.isEtimesCompliant ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium">{purchase.description}</p>
                    <p className="text-xs text-muted-foreground">{purchase.supplierName} • {new Date(purchase.purchaseDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(purchase.totalAmount)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {purchase.isEtimesCompliant ? (
                      <span className="text-xs text-green-600 dark:text-green-400">{t(locale, 'purchases.compliant')}</span>
                    ) : (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">{t(locale, 'purchases.nonCompliant')}</span>
                    )}
                    {purchase.buyerInitiated && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">{t(locale, 'purchases.buyerInitiated')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Purchase Modal */}
      {showNewPurchase && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewPurchase(false)}>
          <div className="bg-card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t(locale, 'purchases.newPurchase')}</h3>
              <button onClick={() => setShowNewPurchase(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">{t(locale, 'purchases.supplierName')}</label>
                <input type="text" value={newPurchase.supplierName} onChange={e => setNewPurchase(p => ({ ...p, supplierName: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t(locale, 'purchases.supplierPin')}</label>
                <input type="text" value={newPurchase.supplierPin} onChange={e => setNewPurchase(p => ({ ...p, supplierPin: e.target.value.toUpperCase() }))} placeholder="A00XXXXXXXB" maxLength={11} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t(locale, 'purchases.purchaseDescription')}</label>
                <input type="text" value={newPurchase.description} onChange={e => setNewPurchase(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t(locale, 'purchases.category')}</label>
                <select value={newPurchase.category} onChange={e => setNewPurchase(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {['Food', 'Household', 'Beverages', 'Services', 'Equipment', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Total Amount (KES)</label>
                  <input type="number" value={newPurchase.totalAmount} onChange={e => setNewPurchase(p => ({ ...p, totalAmount: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">VAT (KES)</label>
                  <input type="number" value={newPurchase.totalVat} onChange={e => setNewPurchase(p => ({ ...p, totalVat: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t(locale, 'purchases.paymentMethod')}</label>
                <select value={newPurchase.paymentMethod} onChange={e => setNewPurchase(p => ({ ...p, paymentMethod: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={newPurchase.isEtimesCompliant} onChange={e => setNewPurchase(p => ({ ...p, isEtimesCompliant: e.target.checked }))} className="w-4 h-4 accent-primary" />
                  {t(locale, 'purchases.isCompliant')}
                </label>
              </div>
              {!newPurchase.isEtimesCompliant && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={newPurchase.buyerInitiated} onChange={e => setNewPurchase(p => ({ ...p, buyerInitiated: e.target.checked }))} className="w-4 h-4 accent-primary" />
                    {t(locale, 'purchases.generateCompliant')}
                  </label>
                </div>
              )}
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/purchases', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ businessId, ...newPurchase }),
                    });
                    if (!res.ok) throw new Error((await res.json()).error);
                    setShowNewPurchase(false);
                    setNewPurchase({ supplierName: '', supplierPin: '', description: '', totalAmount: '', totalVat: '0', category: 'Food', paymentMethod: 'cash', isEtimesCompliant: false, buyerInitiated: false, notes: '' });
                    fetchPurchases();
                    showToast('Purchase recorded!', 'success');
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                }}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
              >
                {t(locale, 'purchases.recordPurchase')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: PRODUCTS
  // ============================================
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', category: 'Food', unitPrice: '', costPrice: '', vatRate: '16', vatType: 'VAT', quantity: '0', itemCode: '', itemClassCode: '', unitOfMeasure: 'PCE' });

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t(locale, 'products.title')}</h2>
        <button onClick={() => setShowNewProduct(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {t(locale, 'products.newProduct')}
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t(locale, 'products.noProducts')}</p>
          <p className="text-sm mt-1">{t(locale, 'products.addFirst')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Product</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">SKU</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">VAT</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Stock</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-3">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs">{product.sku}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatCurrency(product.unitPrice)}</td>
                  <td className="py-2 px-3 text-right">{product.vatRate}%</td>
                  <td className="py-2 px-3 text-right">
                    <span className={product.quantity <= product.reorderLevel ? 'text-yellow-600 dark:text-yellow-400 font-bold' : ''}>
                      {product.quantity}
                    </span>
                    {product.quantity <= product.reorderLevel && product.quantity > 0 && <span className="text-xs ml-1 text-yellow-600">Low</span>}
                    {product.quantity === 0 && <span className="text-xs ml-1 text-red-600">Out</span>}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button onClick={async () => {
                      await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
                      fetchProducts();
                    }} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Product Modal */}
      {showNewProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewProduct(false)}>
          <div className="bg-card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t(locale, 'products.newProduct')}</h3>
              <button onClick={() => setShowNewProduct(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'name', label: 'Product Name', type: 'text' },
                { key: 'sku', label: 'SKU', type: 'text' },
                { key: 'unitPrice', label: 'Selling Price (KES)', type: 'number' },
                { key: 'costPrice', label: 'Cost Price (KES)', type: 'number' },
                { key: 'vatRate', label: 'VAT Rate (%)', type: 'number' },
                { key: 'quantity', label: 'Stock Quantity', type: 'number' },
                { key: 'itemCode', label: 'KRA Item Code', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs text-muted-foreground">{field.label}</label>
                  <input
                    type={field.type}
                    value={(newProduct as any)[field.key]}
                    onChange={e => setNewProduct(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {['Food', 'Dairy', 'Bakery', 'Beverages', 'Household', 'Services', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/products', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ businessId, ...newProduct }),
                    });
                    if (!res.ok) throw new Error((await res.json()).error);
                    setShowNewProduct(false);
                    setNewProduct({ name: '', sku: '', category: 'Food', unitPrice: '', costPrice: '', vatRate: '16', vatType: 'VAT', quantity: '0', itemCode: '', itemClassCode: '', unitOfMeasure: 'PCE' });
                    fetchProducts();
                    showToast('Product added!', 'success');
                  } catch (err: any) { showToast(err.message, 'error'); }
                }}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
              >
                {t(locale, 'products.saveProduct')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: SUPPLIERS
  // ============================================
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', kraPin: '', phone: '', email: '', address: '', isEtimesCompliant: false });

  const renderSuppliers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t(locale, 'suppliers.title')}</h2>
        <button onClick={() => setShowNewSupplier(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {t(locale, 'suppliers.newSupplier')}
        </button>
      </div>

      <p className="text-sm text-muted-foreground">{t(locale, 'suppliers.complianceNote')}</p>

      {suppliers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t(locale, 'suppliers.noSuppliers')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suppliers.map(supplier => (
            <div key={supplier.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{supplier.name}</h4>
                {supplier.isEtimesCompliant ? (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> eTIMS</span>
                ) : (
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No eTIMS</span>
                )}
              </div>
              {supplier.kraPin && <p className="text-xs text-muted-foreground font-mono">PIN: {supplier.kraPin}</p>}
              {supplier.phone && <p className="text-xs text-muted-foreground">{supplier.phone}</p>}
              {supplier._count && <p className="text-xs text-muted-foreground mt-1">{supplier._count.purchases} purchase records</p>}
            </div>
          ))}
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewSupplier && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewSupplier(false)}>
          <div className="bg-card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t(locale, 'suppliers.newSupplier')}</h3>
              <button onClick={() => setShowNewSupplier(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Name</label><input type="text" value={newSupplier.name} onChange={e => setNewSupplier(s => ({ ...s, name: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">KRA PIN</label><input type="text" value={newSupplier.kraPin} onChange={e => setNewSupplier(s => ({ ...s, kraPin: e.target.value.toUpperCase() }))} placeholder="A00XXXXXXXB" maxLength={11} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Phone</label><input type="tel" value={newSupplier.phone} onChange={e => setNewSupplier(s => ({ ...s, phone: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Email</label><input type="email" value={newSupplier.email} onChange={e => setNewSupplier(s => ({ ...s, email: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Address</label><input type="text" value={newSupplier.address} onChange={e => setNewSupplier(s => ({ ...s, address: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newSupplier.isEtimesCompliant} onChange={e => setNewSupplier(s => ({ ...s, isEtimesCompliant: e.target.checked }))} className="w-4 h-4 accent-primary" />{t(locale, 'suppliers.isEtimesCompliant')}</label>
              <button onClick={async () => {
                try {
                  const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, ...newSupplier }) });
                  if (!res.ok) throw new Error((await res.json()).error);
                  setShowNewSupplier(false);
                  setNewSupplier({ name: '', kraPin: '', phone: '', email: '', address: '', isEtimesCompliant: false });
                  fetchSuppliers();
                  showToast('Supplier added!', 'success');
                } catch (err: any) { showToast(err.message, 'error'); }
              }} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">{t(locale, 'suppliers.saveSupplier')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: CUSTOMERS
  // ============================================
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', kraPin: '', phone: '', email: '', address: '', isVatRegistered: false });

  const renderCustomers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t(locale, 'customers.title')}</h2>
        <button onClick={() => setShowNewCustomer(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" /> {t(locale, 'customers.newCustomer')}
        </button>
      </div>

      <p className="text-sm text-muted-foreground">{t(locale, 'customers.b2bNote')}</p>

      {customers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t(locale, 'customers.noCustomers')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(customer => (
            <div key={customer.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{customer.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {customer.kraPin && <span className="font-mono">PIN: {customer.kraPin}</span>}
                  {customer.phone && <span>{customer.phone}</span>}
                  {customer.isVatRegistered && <span className="text-green-600 dark:text-green-400">VAT Registered</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {customer.kraPin && <CheckCircle className="w-4 h-4 text-green-500" />}
                <button className="text-xs text-primary hover:underline" onClick={() => {
                  setSelectedCustomer(customer);
                  setShowBuyerFields(true);
                  setBuyerPin(customer.kraPin || '');
                  setBuyerName(customer.name);
                  setCurrentView('pos');
                }}>Use in POS</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewCustomer(false)}>
          <div className="bg-card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t(locale, 'customers.newCustomer')}</h3>
              <button onClick={() => setShowNewCustomer(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Name</label><input type="text" value={newCustomer.name} onChange={e => setNewCustomer(c => ({ ...c, name: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">KRA PIN</label><input type="text" value={newCustomer.kraPin} onChange={e => setNewCustomer(c => ({ ...c, kraPin: e.target.value.toUpperCase() }))} placeholder="P00XXXXXXXQ" maxLength={11} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Phone</label><input type="tel" value={newCustomer.phone} onChange={e => setNewCustomer(c => ({ ...c, phone: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Email</label><input type="email" value={newCustomer.email} onChange={e => setNewCustomer(c => ({ ...c, email: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newCustomer.isVatRegistered} onChange={e => setNewCustomer(c => ({ ...c, isVatRegistered: e.target.checked }))} className="w-4 h-4 accent-primary" />{t(locale, 'customers.vatRegistered')}</label>
              <button onClick={async () => {
                try {
                  const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, ...newCustomer }) });
                  if (!res.ok) throw new Error((await res.json()).error);
                  setShowNewCustomer(false);
                  setNewCustomer({ name: '', kraPin: '', phone: '', email: '', address: '', isVatRegistered: false });
                  fetchCustomers();
                  showToast('Customer added!', 'success');
                } catch (err: any) { showToast(err.message, 'error'); }
              }} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">{t(locale, 'customers.saveCustomer')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: M-PESA
  // ============================================
  const renderMpesa = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t(locale, 'mpesa.title')}</h2>
        <button onClick={async () => {
          await fetch('/api/mpesa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reconcile', businessId }) });
          fetchMpesa();
          showToast('Reconciliation complete', 'success');
        }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          <RefreshCw className="w-4 h-4" /> {t(locale, 'mpesa.reconcileNow')}
        </button>
      </div>

      {mpesaTransactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t(locale, 'mpesa.noTransactions')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mpesaTransactions.map(txn => (
            <div key={txn.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={txn.status} />
                  <div>
                    <p className="font-medium text-sm">{txn.phoneNumber}</p>
                    <p className="text-xs text-muted-foreground">{new Date(txn.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(txn.amount)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {txn.mpesaReceipt && <span className="text-xs font-mono text-green-600">{txn.mpesaReceipt}</span>}
                    {txn.reconciled ? (
                      <span className="text-xs text-green-600">{t(locale, 'mpesa.reconciled')}</span>
                    ) : (
                      <span className="text-xs text-yellow-600">{t(locale, 'mpesa.unmatched')}</span>
                    )}
                  </div>
                  {txn.invoice && (
                    <p className="text-xs text-muted-foreground mt-1">Invoice: {txn.invoice.invoiceNumber}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: SETTINGS
  // ============================================
  const [settingsData, setSettingsData] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState({ name: '', email: '', phone: '', address: '', language: 'en', currentTier: 'free', receiptFooter: '' });

  useEffect(() => {
    if (currentView === 'settings' && businessId) {
      fetch(`/api/settings?businessId=${businessId}`).then(r => r.json()).then(data => {
        setSettingsData(data);
        if (data.business) {
          setSettingsForm({
            name: data.business.name || '',
            email: data.business.email || '',
            phone: data.business.phone || '',
            address: data.business.address || '',
            language: data.business.language || 'en',
            currentTier: data.business.currentTier || 'free',
            receiptFooter: data.business.receiptFooter || '',
          });
        }
      }).catch(console.error);
    }
  }, [currentView, businessId]);

  const renderSettings = () => (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold">{t(locale, 'settings.title')}</h2>

      {/* Business Profile */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> {t(locale, 'settings.businessProfile')}</h3>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.businessName')}</label><input type="text" value={settingsForm.name} onChange={e => setSettingsForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.email')}</label><input type="email" value={settingsForm.email} onChange={e => setSettingsForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.phone')}</label><input type="tel" value={settingsForm.phone} onChange={e => setSettingsForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.address')}</label><input type="text" value={settingsForm.address} onChange={e => setSettingsForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          <div><label className="text-xs text-muted-foreground">Receipt Footer</label><input type="text" value={settingsForm.receiptFooter} onChange={e => setSettingsForm(f => ({ ...f, receiptFooter: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
        </div>
      </div>

      {/* KRA Credentials */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> {t(locale, 'settings.kraCredentials')}</h3>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.kraUsername')}</label><input type="text" defaultValue={settingsData?.settings?.kra_username || ''} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.kraPassword')}</label><input type="password" placeholder="Enter password" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
        </div>
      </div>

      {/* M-Pesa Config */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> {t(locale, 'settings.mpesaConfig')}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.consumerKey')}</label><input type="text" defaultValue={settingsData?.settings?.mpesa_consumer_key || ''} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.consumerSecret')}</label><input type="password" placeholder="Enter secret" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.paybillNumber')}</label><input type="text" defaultValue={settingsData?.settings?.mpesa_paybill || '174379'} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.passkey')}</label><input type="password" placeholder="Enter passkey" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          </div>
        </div>
      </div>

      {/* Language & Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> {t(locale, 'settings.language')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {['en', 'sw'].map(lang => (
              <button
                key={lang}
                onClick={() => { setSettingsForm(f => ({ ...f, language: lang })); setLocale(lang as Locale); }}
                className={`py-2 px-3 rounded-lg text-sm border transition ${settingsForm.language === lang ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
              >
                {lang === 'en' ? t(locale, 'settings.english') : t(locale, 'settings.kiswahili')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> {t(locale, 'settings.pricingPlan')}</h3>
          <div className="space-y-2">
            {settingsData?.tiers && Object.entries(settingsData.tiers).map(([key, tier]: [string, any]) => (
              <button
                key={key}
                onClick={() => setSettingsForm(f => ({ ...f, currentTier: key }))}
                className={`w-full text-left p-3 rounded-lg border text-sm transition ${settingsForm.currentTier === key ? 'bg-primary/10 border-primary' : 'border-border hover:border-primary/50'}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{tier.name}</span>
                  <span className="font-bold">{tier.price === 0 ? 'Free' : `KES ${tier.price}/mo`}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tier.features.slice(0, 2).join(' • ')}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={async () => {
          try {
            const res = await fetch('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ businessId, business: settingsForm }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            showToast(t(locale, 'settings.saved'), 'success');
          } catch (err: any) { showToast(err.message, 'error'); }
        }}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" /> {t(locale, 'settings.save')}
      </button>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="flex min-h-screen">
      {renderSidebar()}

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 hover:bg-muted rounded">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-lg">{t(locale, `nav.${currentView}` as any)}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
            <button onClick={() => setIsDark(d => !d)} className="p-2 hover:bg-muted rounded-lg">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setLocale(l => l === 'en' ? 'sw' : 'en')} className="px-2 py-1 text-xs bg-muted rounded-lg hover:bg-primary/10">
              {locale === 'en' ? 'SW' : 'EN'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'pos' && renderPOS()}
          {currentView === 'invoices' && renderInvoices()}
          {currentView === 'purchases' && renderPurchases()}
          {currentView === 'products' && renderProducts()}
          {currentView === 'suppliers' && renderSuppliers()}
          {currentView === 'customers' && renderCustomers()}
          {currentView === 'mpesa' && renderMpesa()}
          {currentView === 'settings' && renderSettings()}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
