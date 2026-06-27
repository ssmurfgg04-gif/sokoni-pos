'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, FileText, Package, Users, Truck, CreditCard, Settings,
  Plus, Search, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, Wifi, WifiOff,
  ChevronRight, Trash2, X, Edit2, Save, AlertCircle, ArrowRight, Menu, Globe,
  TrendingUp, DollarSign, Receipt, Shield, BarChart3, Zap, Phone, QrCode, Copy,
  ChevronDown, Eye, RotateCcw, Bell, Moon, Sun, Store, MapPin, Download, Printer,
  ArrowUpRight, ArrowDownRight, Minus, Wallet, PiggyBank, Calendar, Target,
  FileSpreadsheet, CircleDollarSign, Activity, BoxIcon,
  Layers, Fuel, Sparkles, ArrowUp, ArrowDown
} from 'lucide-react';
import { translations, formatCurrency, type Locale } from '@/lib/i18n';
import POSView from '@/components/POSView';

// ============================================
// TYPES
// ============================================
type View = 'dashboard' | 'pos' | 'invoices' | 'purchases' | 'products' | 'suppliers' | 'customers' | 'mpesa' | 'reports' | 'expense-check' | 'settings';

interface Product {
  id: string; name: string; sku?: string; category?: string; unitPrice: number;
  costPrice?: number; vatRate: number; vatType: string; quantity: number;
  reorderLevel: number; itemCode?: string; itemClassCode?: string; unitOfMeasure?: string; isActive: boolean;
}

interface CartItem { product: Product; quantity: number; }

interface Invoice {
  id: string; invoiceNumber: string; buyerPin?: string; buyerName?: string;
  buyerAddress?: string; subtotal: number; totalVat: number; totalAmount: number;
  paymentMethod: string; status: string; kraSignature?: string; kraControlNumber?: string;
  kraQrCodeData?: string; retryCount: number; lastError?: string; createdAt: string;
  items: any[]; mpesaReceiptNumber?: string; discountAmount?: number; localTimestamp?: string;
  issueDate?: string; invoiceType?: string; relatedInvoiceId?: string;
  _originalInvoice?: { id: string; invoiceNumber: string; totalAmount: number };
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
  sales: { totalSales: number; totalVat: number; todaySales: number; weekSales: number; invoiceCount: number; averageInvoiceValue: number; paymentBreakdown: { cash: number; mpesa: number; bank: number; credit: number } };
  sync: { queued: number; syncing: number; synced: number; failed: number; total: number; syncRate: number };
  purchases: { total: number; inputVat: number; count: number; compliant: number; nonCompliant: number; complianceRate: number };
  mpesa: { totalTransactions: number; totalAmount: number; reconciled: number; reconciliationRate: number };
  compliance: { score: number; status: string };
  recent: { invoices: any[]; purchases: any[] };
  alerts: { lowStock: any[]; failedSyncs: number; nonCompliantPurchases: number };
  dailyTrend: { date: string; sales: number; invoices: number }[];
  vatReturn: { vatPayable: number; vatRecoverable: number; netVat: number; period: string };
  profitLoss: { revenue: number; costOfGoods: number; grossProfit: number; grossProfitMargin: number; netVat: number };
  topProducts: { id: string; name: string; category: string; quantity: number; revenue: number }[];
  notifications: { id: string; type: 'error' | 'warning' | 'info'; title: string; message: string; time: string; action?: string }[];
}

function t(locale: Locale, path: string): string {
  const keys = path.split('.');
  let current: any = translations[locale];
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) { current = current[key]; }
    else { let fb: any = translations.en; for (const k of keys) { if (fb && typeof fb === 'object' && k in fb) { fb = fb[k]; } else return path; } return typeof fb === 'string' ? fb : path; }
  }
  return typeof current === 'string' ? current : path;
}

// ============================================
// STATUS BADGE
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
  };
  const c = config[status] || config.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.className}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ============================================
// MINI BAR CHART (pure CSS, no library needed)
// ============================================
function MiniBarChart({ data, maxValue, color = 'bg-primary' }: { data: number[]; maxValue: number; color?: string }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((val, i) => {
        const height = maxValue > 0 ? Math.max((val / maxValue) * 100, 2) : 2;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative group">
              <div className={`w-full ${color} rounded-t-sm transition-all duration-500`} style={{ height: `${height}px` }} />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {formatCurrency(val)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// PROGRESS RING (for compliance score)
// ============================================
function ProgressRing({ value, size = 80, strokeWidth = 6, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
    </svg>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function SokoniPOS() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [locale, setLocale] = useState<Locale>('en');
  const [businessId, setBusinessId] = useState<string>('');
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSeeded, setIsSeeded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

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
  const [showBuyerFields, setShowBuyerFields] = useState(false);
  const [buyerPin, setBuyerPin] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Invoices state
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Purchases state
  const [showNewPurchase, setShowNewPurchase] = useState(false);
  const [newPurchase, setNewPurchase] = useState({ supplierName: '', supplierPin: '', description: '', totalAmount: '', totalVat: '0', category: 'Food', paymentMethod: 'cash', isEtimesCompliant: false, buyerInitiated: false, notes: '' });

  // Products state
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', category: 'Food', unitPrice: '', costPrice: '', vatRate: '16', vatType: 'VAT', quantity: '0', itemCode: '', itemClassCode: '', unitOfMeasure: 'PCE' });

  // Suppliers state
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', kraPin: '', phone: '', email: '', address: '', isEtimesCompliant: false });

  // Customers state
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', kraPin: '', phone: '', email: '', address: '', isVatRegistered: false });

  // Reports state
  const [reportTab, setReportTab] = useState<'sales' | 'vat' | 'pnl' | 'products'>('sales');

  // Expense validation state
  const [expenseValidation, setExpenseValidation] = useState<any>(null);

  // Compliance health state
  const [complianceHealth, setComplianceHealth] = useState<any>(null);

  // Credit note modal state
  const [showCreditNote, setShowCreditNote] = useState(false);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<Invoice | null>(null);
  const [creditNoteType, setCreditNoteType] = useState<'credit_note' | 'debit_note'>('credit_note');

  // Effects
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);
  useEffect(() => {
    const on = () => setIsOnline(true), off = () => setIsOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  // Seed
  const seedDatabase = useCallback(async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.businessId) { setBusinessId(data.businessId); setIsSeeded(true); setShowWelcome(true); showToast('Welcome to Sokoni! Demo data loaded.', 'success'); }
      else if (data.message && data.businessId) { setBusinessId(data.businessId); setIsSeeded(true); }
    } catch { showToast('Failed to seed database', 'error'); }
  }, []);
  useEffect(() => { if (!isSeeded) seedDatabase(); }, [isSeeded, seedDatabase]);

  // Fetchers
  const fetchDashboard = useCallback(async () => { if (!businessId) return; try { const r = await fetch(`/api/dashboard?businessId=${businessId}`); const d = await r.json(); if (r.ok) setDashboard(d); } catch {} }, [businessId]);
  const fetchProducts = useCallback(async () => { if (!businessId) return; try { const r = await fetch(`/api/products?businessId=${businessId}`); setProducts(await r.json()); } catch {} }, [businessId]);
  const fetchInvoices = useCallback(async (status?: string) => { if (!businessId) return; try { const url = `/api/invoices?businessId=${businessId}${status && status !== 'all' ? `&status=${status}` : ''}`; setInvoices(await (await fetch(url)).json()); } catch {} }, [businessId]);
  const fetchCustomers = useCallback(async () => { if (!businessId) return; try { setCustomers(await (await fetch(`/api/customers?businessId=${businessId}`)).json()); } catch {} }, [businessId]);
  const fetchSuppliers = useCallback(async () => { if (!businessId) return; try { setSuppliers(await (await fetch(`/api/suppliers?businessId=${businessId}`)).json()); } catch {} }, [businessId]);
  const fetchPurchases = useCallback(async () => { if (!businessId) return; try { setPurchases(await (await fetch(`/api/purchases?businessId=${businessId}`)).json()); } catch {} }, [businessId]);
  const fetchMpesa = useCallback(async () => { if (!businessId) return; try { setMpesaTransactions(await (await fetch(`/api/mpesa?businessId=${businessId}`)).json()); } catch {} }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    const f: Record<string, () => void> = { dashboard: fetchDashboard, pos: fetchProducts, invoices: () => fetchInvoices(), purchases: fetchPurchases, products: fetchProducts, suppliers: fetchSuppliers, customers: fetchCustomers, mpesa: fetchMpesa, reports: fetchDashboard, 'expense-check': async () => { await fetchDashboard(); try { const r = await fetch(`/api/expenses/validate?businessId=${businessId}`); const d = await r.json(); if (r.ok) setExpenseValidation(d); } catch {} try { const r = await fetch(`/api/compliance/health?businessId=${businessId}`); const d = await r.json(); if (r.ok) setComplianceHealth(d); } catch {} }, settings: () => {} };
    f[currentView]?.();
  }, [currentView, businessId, fetchDashboard, fetchProducts, fetchInvoices, fetchPurchases, fetchSuppliers, fetchCustomers, fetchMpesa]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ message, type });

  // Cart logic
  const addToCart = (product: Product) => setCart(prev => { const e = prev.find(i => i.product.id === product.id); return e ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { product, quantity: 1 }]; });
  const removeFromCart = (productId: string) => setCart(prev => prev.filter(i => i.product.id !== productId));
  const updateCartQty = (productId: string, qty: number) => { if (qty <= 0) { removeFromCart(productId); return; } setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i)); };
  const cartSubtotal = cart.reduce((sum, i) => sum + i.product.unitPrice * i.quantity, 0);
  const cartVat = cart.reduce((sum, i) => sum + (i.product.unitPrice * i.quantity * i.product.vatRate / 100), 0);
  const cartTotal = cartSubtotal + cartVat;

  const generateInvoice = async () => {
    if (cart.length === 0 || !businessId) return;
    try {
      const items = cart.map(item => ({ productId: item.product.id, itemName: item.product.name, itemCode: item.product.itemCode, itemClassCode: item.product.itemClassCode, quantity: item.quantity, unitPrice: item.product.unitPrice, vatRate: item.product.vatRate, unitOfMeasure: item.product.unitOfMeasure, discountAmount: 0 }));
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, items, buyerPin: showBuyerFields ? buyerPin : undefined, buyerName: showBuyerFields ? buyerName : undefined, customerId: selectedCustomer?.id, paymentMethod }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setCart([]); setBuyerPin(''); setBuyerName(''); setShowBuyerFields(false);
      showToast('Invoice generated & queued for KRA sync!', 'success');
      fetch(`/api/kra/sync?invoiceId=${data.id}&businessId=${businessId}`, { method: 'POST' }).catch(() => {});
      fetchProducts(); fetchDashboard();
    } catch (err: any) { showToast(err.message || 'Failed', 'error'); }
  };

  const initiateMpesaPayment = async () => {
    if (!mpesaPhone || !businessId) return;
    try {
      const res = await fetch('/api/mpesa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stk_push', phoneNumber: mpesaPhone, amount: cartTotal, businessId, accountReference: `POS-${Date.now()}`, transactionDesc: 'Sokoni POS Payment' }) });
      const data = await res.json();
      if (data.success) { showToast('M-Pesa STK push sent! Check your phone.', 'success'); setPaymentMethod('mpesa'); }
      else showToast(data.error || 'M-Pesa failed', 'error');
    } catch (err: any) { showToast('M-Pesa error: ' + err.message, 'error'); }
  };

  const validatePin = async (pin: string) => {
    if (!pin) return;
    try { const r = await fetch('/api/kra/validate-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) }); const d = await r.json(); showToast(d.message, d.valid ? 'success' : 'error'); } catch { showToast('PIN validation failed', 'error'); }
  };

  const retryInvoiceSync = async (invoiceId: string) => {
    try { const r = await fetch('/api/invoices', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: invoiceId, action: 'retry' }) }); if (!r.ok) throw new Error((await r.json()).error); showToast('Invoice queued for resync', 'success'); fetchInvoices(); } catch (err: any) { showToast(err.message, 'error'); }
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
    { view: 'reports', icon: <Activity className="w-5 h-5" />, labelKey: 'nav.reports' },
    { view: 'expense-check', icon: <Shield className="w-5 h-5" />, labelKey: 'nav.expense-check' },
    { view: 'settings', icon: <Settings className="w-5 h-5" />, labelKey: 'nav.settings' },
  ];

  // ============================================
  // RENDER: WELCOME MODAL
  // ============================================
  const renderWelcome = () => {
    if (!showWelcome) return null;
    return (
      <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl max-w-lg w-full p-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to Sokoni POS</h2>
          <p className="text-muted-foreground">Kenya&apos;s smartest KRA eTIMS compliant point-of-sale. Your demo store is loaded with sample products, customers, and invoices.</p>
          <div className="grid grid-cols-2 gap-3 text-left text-sm">
            <div className="bg-muted rounded-lg p-3"><CheckCircle className="w-4 h-4 text-green-500 mb-1" /><p className="font-medium">KRA eTIMS Sync</p><p className="text-xs text-muted-foreground">Auto-sync invoices to KRA</p></div>
            <div className="bg-muted rounded-lg p-3"><CreditCard className="w-4 h-4 text-green-500 mb-1" /><p className="font-medium">M-Pesa Native</p><p className="text-xs text-muted-foreground">STK push & auto-reconciliation</p></div>
            <div className="bg-muted rounded-lg p-3"><WifiOff className="w-4 h-4 text-green-500 mb-1" /><p className="font-medium">Offline-First</p><p className="text-xs text-muted-foreground">Works when KRA is down</p></div>
            <div className="bg-muted rounded-lg p-3"><Shield className="w-4 h-4 text-green-500 mb-1" /><p className="font-medium">Two-Way Compliance</p><p className="text-xs text-muted-foreground">Sales + Purchase records</p></div>
          </div>
          <button onClick={() => setShowWelcome(false)} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition">
            Start Selling
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: NOTIFICATIONS PANEL
  // ============================================
  const renderNotifications = () => {
    if (!showNotifications) return null;
    const notifs = dashboard?.notifications || [];
    return (
      <div className="fixed inset-0 z-[55] bg-black/40" onClick={() => setShowNotifications(false)}>
        <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notifications</h3>
            <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4 space-y-3">
            {notifs.map(n => (
              <div key={n.id} className={`rounded-xl p-4 border cursor-pointer transition hover:shadow-md ${
                n.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                n.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`} onClick={() => { if (n.action) { setCurrentView(n.action as View); setShowNotifications(false); } }}>
                <div className="flex items-start gap-3">
                  {n.type === 'error' ? <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> :
                   n.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" /> :
                   <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                  </div>
                  {n.action && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: RECEIPT PREVIEW
  // ============================================
  const renderReceiptPreview = (inv: Invoice) => (
    <div className="invoice-receipt bg-white text-black text-xs space-y-2 print-area">
      <div className="text-center border-b border-dashed border-gray-400 pb-2">
        <p className="font-bold text-sm">SOKONI DEMO STORE</p>
        <p>Moi Avenue, Nairobi</p>
        <p>PIN: A001234567B</p>
        <p className="font-bold mt-1">E-TIMS RECEIPT</p>
      </div>
      <div className="border-b border-dashed border-gray-400 pb-2 space-y-0.5">
        <div className="flex justify-between"><span>Receipt #:</span><span className="font-mono">{inv.invoiceNumber}</span></div>
        <div className="flex justify-between"><span>Date:</span><span>{new Date(inv.createdAt).toLocaleString('en-KE')}</span></div>
        {inv.buyerPin && <div className="flex justify-between"><span>Buyer PIN:</span><span className="font-mono">{inv.buyerPin}</span></div>}
        {inv.buyerName && <div className="flex justify-between"><span>Buyer:</span><span>{inv.buyerName}</span></div>}
      </div>
      <div className="border-b border-dashed border-gray-400 pb-2">
        {inv.items?.map((item: any, i: number) => (
          <div key={i} className="py-1">
            <p className="font-medium">{item.itemName}</p>
            <div className="flex justify-between text-[10px]">
              <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
              <span>{formatCurrency(item.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(inv.subtotal)}</span></div>
        <div className="flex justify-between"><span>VAT:</span><span>{formatCurrency(inv.totalVat)}</span></div>
        <div className="flex justify-between font-bold text-sm border-t border-dashed border-gray-400 pt-1"><span>TOTAL:</span><span>{formatCurrency(inv.totalAmount)}</span></div>
      </div>
      <div className="text-center border-t border-dashed border-gray-400 pt-2 space-y-0.5">
        <p className="font-medium">Payment: {inv.paymentMethod.toUpperCase()}</p>
        {inv.mpesaReceiptNumber && <p className="font-mono text-[10px]">M-Pesa: {inv.mpesaReceiptNumber}</p>}
        {inv.kraControlNumber && (
          <>
            <div className="mt-2 p-2 bg-gray-100 rounded text-center">
              <QrCode className="w-12 h-12 mx-auto" />
              <p className="text-[9px] font-mono mt-1">KRA Control: {inv.kraControlNumber}</p>
            </div>
            <p className="text-[9px] text-green-700 font-bold">KRA eTIMS VERIFIED</p>
          </>
        )}
        <p className="text-[9px] text-gray-500 mt-2">Thank you for shopping with us! Asante!</p>
      </div>
    </div>
  );

  // ============================================
  // RENDER: SIDEBAR
  // ============================================
  const renderSidebar = () => {
    const navGroups = [
      { label: 'OPERATIONS', items: navItems.filter(i => ['pos', 'invoices', 'purchases'].includes(i.view)) },
      { label: 'MANAGEMENT', items: navItems.filter(i => ['products', 'suppliers', 'customers'].includes(i.view)) },
      { label: 'FINANCE', items: navItems.filter(i => ['mpesa', 'reports', 'expense-check'].includes(i.view)) },
      { label: 'SYSTEM', items: navItems.filter(i => i.view === 'settings') },
    ];
    const compScore = dashboard?.compliance?.score ?? 0;
    const compStatus = dashboard?.compliance?.status ?? 'good';
    const compColor = compStatus === 'good' ? '#22c55e' : compStatus === 'warning' ? '#f59e0b' : '#ef4444';

    return (
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:z-auto`}>
        <div className="flex flex-col h-full">
          {/* Branded Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 relative overflow-hidden">
                <div className="absolute inset-0 shimmer" />
                <Store className="w-5 h-5 text-white relative z-10" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">Sokoni</h1>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-semibold">Enterprise POS</p>
              </div>
            </div>
          </div>

          {/* Online Indicator */}
          <div className={`px-4 py-2 text-xs flex items-center gap-2 font-medium border-b border-border ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            {isOnline ? <><Wifi className="w-3 h-3" /> Online — Live Sync</> : <><WifiOff className="w-3 h-3" /> Offline — Queuing</>}
          </div>

          {/* Grouped Navigation */}
          <nav className="flex-1 overflow-y-auto py-1 px-2">
            {navGroups.map(group => (
              <div key={group.label}>
                <div className="sidebar-section-label">{group.label}</div>
                {group.items.map(item => (
                  <button key={item.view} onClick={() => { setCurrentView(item.view); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg my-0.5 transition-all ${currentView === item.view ? 'nav-item-active' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                    {item.icon}
                    {t(locale, item.labelKey)}
                    {item.view === 'invoices' && dashboard && dashboard.sync.failed > 0 && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">{dashboard.sync.failed}</span>
                    )}
                    {item.view === 'dashboard' && dashboard && dashboard.notifications.filter(n => n.type === 'error' || n.type === 'warning').length > 0 && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-yellow-500" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* Compliance Badge */}
          {dashboard && (
            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ProgressRing value={compScore} size={44} strokeWidth={4} color={compColor} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{compScore}</span>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Compliance</p>
                  <p className={`text-xs font-medium ${compStatus === 'good' ? 'text-emerald-600 dark:text-emerald-400' : compStatus === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {compStatus === 'good' ? 'All Good' : compStatus === 'warning' ? 'Attention' : 'Critical'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Section */}
          <div className="p-3 border-t border-border space-y-1.5">
            <button onClick={() => setLocale(l => l === 'en' ? 'sw' : 'en')} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Globe className="w-4 h-4" />{locale === 'en' ? 'Kiswahili' : 'English'}
            </button>
            <button onClick={() => setIsDark(d => !d)} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}{isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="px-3 pt-1 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Sokoni POS</span>
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">v2.0</span>
            </div>
          </div>
        </div>
      </aside>
    );
  };

  // ============================================
  // RENDER: DASHBOARD (MAJOR UPGRADE)
  // ============================================
  const renderDashboard = () => {
    if (!dashboard) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
    const compColor = dashboard.compliance.status === 'good' ? '#22c55e' : dashboard.compliance.status === 'warning' ? '#f59e0b' : '#ef4444';
    const maxSales = Math.max(...dashboard.dailyTrend.map(d => d.sales), 1);

    // Trend helper — derive mock trends from daily data
    const weekTotal = dashboard.sales.weekSales;
    const todayVsWeek = weekTotal > 0 ? Math.round(((dashboard.sales.todaySales / (weekTotal / 7)) - 1) * 100) : 0;
    const vatTrend = dashboard.sales.totalVat > 0 ? Math.round((dashboard.sales.totalVat / dashboard.sales.totalSales) * 100) : 0;
    const syncTrend = dashboard.sync.total > 0 ? Math.round((dashboard.sync.synced / dashboard.sync.total) * 100) : 100;

    // Live activity feed data derived from dashboard notifications & sync
    const activityFeed = [
      ...dashboard.notifications.slice(0, 3).map(n => ({
        icon: n.type === 'error' ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : n.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
        text: n.title, time: n.message, type: n.type as string,
      })),
      ...(dashboard.sync.synced > 0 ? [{ icon: <RefreshCw className="w-3.5 h-3.5 text-primary" />, text: `${dashboard.sync.synced} invoices synced to KRA`, time: 'Auto-sync', type: 'sync' }] : []),
      ...(dashboard.mpesa.reconciled > 0 ? [{ icon: <CreditCard className="w-3.5 h-3.5 text-green-500" />, text: `${dashboard.mpesa.reconciled} M-Pesa payments reconciled`, time: 'Auto-reconcile', type: 'mpesa' }] : []),
      ...(dashboard.sales.invoiceCount > 0 ? [{ icon: <FileText className="w-3.5 h-3.5 text-blue-500" />, text: `${dashboard.sales.invoiceCount} invoices generated this month`, time: 'Monthly total', type: 'invoice' }] : []),
    ].slice(0, 6);

    // VAT bar widths
    const vatMax = Math.max(dashboard.vatReturn.vatPayable, dashboard.vatReturn.vatRecoverable, 1);
    const vatPayableWidth = Math.round((dashboard.vatReturn.vatPayable / vatMax) * 100);
    const vatRecoverableWidth = Math.round((dashboard.vatReturn.vatRecoverable / vatMax) * 100);

    return (
      <div className="space-y-5">
        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setCurrentView('pos')} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"><ShoppingCart className="w-4 h-4" /> New Sale</button>
          <button onClick={() => setCurrentView('invoices')} className="card-interactive flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border"><FileText className="w-4 h-4 text-primary" /> New Invoice</button>
          <button onClick={() => setCurrentView('expense-check')} className="card-interactive flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border"><Shield className="w-4 h-4 text-amber-500" /> Check Expense</button>
          <button onClick={async () => { await fetch('/api/kra/sync?action=process_queue&businessId=' + businessId, { method: 'POST' }); fetchDashboard(); showToast('Sync queue processed', 'success'); }} className="card-interactive flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-border"><RefreshCw className="w-4 h-4 text-primary" /> Sync KRA</button>
        </div>

        {/* Hero: Compliance Score + Today's Performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Compliance Hero — Glassmorphic */}
          <div className="md:col-span-1 glass-card rounded-2xl p-6 text-white relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-800 dark:via-teal-900 dark:to-cyan-900">
            <div className="absolute -right-4 -bottom-4 opacity-10"><Shield className="w-32 h-32" /></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <p className="text-emerald-100 text-xs font-medium tracking-wide uppercase">KRA eTIMS Compliance</p>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="relative">
                <ProgressRing value={dashboard.compliance.score} size={80} strokeWidth={8} color={compColor} />
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{dashboard.compliance.score}%</span>
              </div>
              <div>
                <p className="text-sm font-semibold">{dashboard.compliance.status === 'good' ? 'All Good' : dashboard.compliance.status === 'warning' ? 'Needs Attention' : 'Critical'}</p>
                <p className="text-xs text-emerald-200 mt-0.5">{dashboard.sync.synced}/{dashboard.sync.total} invoices synced</p>
                <span className={`inline-flex items-center gap-1 text-[10px] mt-1 px-1.5 py-0.5 rounded-full font-medium ${syncTrend >= 95 ? 'metric-up' : 'metric-down'}`}>
                  {syncTrend >= 95 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}{syncTrend}% sync rate
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/10 rounded-lg py-1.5 backdrop-blur-sm"><p className="text-lg font-bold">{dashboard.sync.syncRate}%</p><p className="text-[10px] text-emerald-200">Sync Rate</p></div>
              <div className="bg-white/10 rounded-lg py-1.5 backdrop-blur-sm"><p className="text-lg font-bold">{dashboard.purchases.complianceRate}%</p><p className="text-[10px] text-emerald-200">Purchase</p></div>
              <div className="bg-white/10 rounded-lg py-1.5 backdrop-blur-sm"><p className="text-lg font-bold">{dashboard.mpesa.reconciliationRate}%</p><p className="text-[10px] text-emerald-200">M-Pesa</p></div>
            </div>
          </div>

          {/* Today's Performance */}
          <div className="md:col-span-2 card-stat rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Today&apos;s Performance</h3>
              <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-label">Today&apos;s Sales</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(dashboard.sales.todaySales)}</p>
                <span className={`inline-flex items-center gap-0.5 text-[10px] mt-1 px-1.5 py-0.5 rounded-full font-medium ${todayVsWeek >= 0 ? 'metric-up' : 'metric-down'}`}>
                  {todayVsWeek >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}{todayVsWeek >= 0 ? '+' : ''}{todayVsWeek}% vs avg
                </span>
              </div>
              <div>
                <p className="text-label">This Week</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard.sales.weekSales)}</p>
                <span className="inline-flex items-center gap-0.5 text-[10px] mt-1 px-1.5 py-0.5 rounded-full font-medium metric-up">
                  <ArrowUp className="w-3 h-3" />+8% vs last week
                </span>
              </div>
              <div>
                <p className="text-label">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard.sales.totalSales)}</p>
                <span className="inline-flex items-center gap-0.5 text-[10px] mt-1 px-1.5 py-0.5 rounded-full font-medium metric-up">
                  <ArrowUp className="w-3 h-3" />+12% vs last month
                </span>
              </div>
              <div>
                <p className="text-label">Avg Invoice</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard.sales.averageInvoiceValue)}</p>
                <span className="inline-flex items-center gap-0.5 text-[10px] mt-1 px-1.5 py-0.5 rounded-full font-medium metric-up">
                  <ArrowUp className="w-3 h-3" />+5% vs avg
                </span>
              </div>
            </div>
            {/* 7-day mini chart */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">7-Day Sales Trend</p>
              <MiniBarChart data={dashboard.dailyTrend.map(d => d.sales)} maxValue={maxSales} />
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                {dashboard.dailyTrend.map(d => <span key={d.date}>{d.date.split(' ')[0]}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards Row with Trends */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card-stat rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div><span className="text-label">Total Sales</span></div>
            <p className="text-xl font-bold">{formatCurrency(dashboard.sales.totalSales)}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{dashboard.sales.invoiceCount} invoices</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium metric-up"><ArrowUp className="w-3 h-3" />+12%</span>
            </div>
          </div>
          <div className="card-stat rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div><span className="text-label">VAT Collected</span></div>
            <p className="text-xl font-bold">{formatCurrency(dashboard.sales.totalVat)}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">Output VAT</p>
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${vatTrend <= 16 ? 'metric-up' : 'metric-down'}`}>{vatTrend}% rate</span>
            </div>
          </div>
          <div className="card-stat rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"><Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" /></div><span className="text-label">Pending Sync</span></div>
            <p className="text-xl font-bold">{dashboard.sync.queued + dashboard.sync.syncing}</p>
            <div className="flex items-center justify-between mt-1">
              {dashboard.sync.failed > 0 ? <p className="text-xs text-red-600 dark:text-red-400">{dashboard.sync.failed} failed</p> : <p className="text-xs text-muted-foreground">All clear</p>}
              {dashboard.sync.failed > 0 && <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium metric-down"><ArrowDown className="w-3 h-3" />{dashboard.sync.failed}</span>}
            </div>
          </div>
          <div className="card-stat rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" /></div><span className="text-label">M-Pesa Match</span></div>
            <p className="text-xl font-bold">{dashboard.mpesa.reconciliationRate}%</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{dashboard.mpesa.reconciled} matched</p>
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${dashboard.mpesa.reconciliationRate >= 90 ? 'metric-up' : 'metric-down'}`}>{dashboard.mpesa.reconciliationRate >= 90 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}{dashboard.mpesa.reconciliationRate}%</span>
            </div>
          </div>
        </div>

        {/* VAT Summary (upgraded) + Profit/Loss + Payment Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* VAT Return Summary — with colored bars */}
          <div className="card-interactive rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-primary" /> VAT Return</h3>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{dashboard.vatReturn.period}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between mb-1"><span className="text-muted-foreground text-xs">VAT Payable (Output)</span><span className="font-semibold text-xs">{formatCurrency(dashboard.vatReturn.vatPayable)}</span></div>
                <div className="w-full bg-muted rounded-full h-2"><div className="bg-gradient-to-r from-red-400 to-red-500 h-2 rounded-full transition-all duration-700" style={{ width: `${vatPayableWidth}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between mb-1"><span className="text-muted-foreground text-xs">VAT Recoverable (Input)</span><span className="font-semibold text-xs">{formatCurrency(dashboard.vatReturn.vatRecoverable)}</span></div>
                <div className="w-full bg-muted rounded-full h-2"><div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-2 rounded-full transition-all duration-700" style={{ width: `${vatRecoverableWidth}%` }} /></div>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between font-bold">
                  <span>Net VAT Payable</span>
                  <span className={dashboard.vatReturn.netVat >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {formatCurrency(dashboard.vatReturn.netVat)}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setCurrentView('reports')} className="mt-3 text-xs text-primary hover:underline flex items-center gap-1">View Full Report <ArrowRight className="w-3 h-3" /></button>
          </div>

          {/* Profit & Loss */}
          <div className="card-interactive rounded-xl border border-border p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><PiggyBank className="w-4 h-4 text-primary" /> Profit & Loss</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(dashboard.profitLoss.revenue)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cost of Goods</span><span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(dashboard.profitLoss.costOfGoods)}</span></div>
              <div className="flex justify-between pt-2 border-t border-border font-bold">
                <span>Gross Profit</span>
                <span className={dashboard.profitLoss.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{formatCurrency(dashboard.profitLoss.grossProfit)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Margin</span>
                <span className="font-medium">{dashboard.profitLoss.grossProfitMargin}%</span>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="card-interactive rounded-xl border border-border p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Payment Methods</h3>
            {dashboard.sales.paymentBreakdown && (
              <div className="space-y-3">
                {[{ label: 'Cash', value: dashboard.sales.paymentBreakdown.cash, color: 'bg-emerald-500' }, { label: 'M-Pesa', value: dashboard.sales.paymentBreakdown.mpesa, color: 'bg-green-500' }, { label: 'Bank', value: dashboard.sales.paymentBreakdown.bank, color: 'bg-blue-500' }, { label: 'Credit', value: dashboard.sales.paymentBreakdown.credit, color: 'bg-orange-500' }].map(pm => {
                  const total = dashboard.sales.paymentBreakdown.cash + dashboard.sales.paymentBreakdown.mpesa + dashboard.sales.paymentBreakdown.bank + dashboard.sales.paymentBreakdown.credit;
                  const pct = total > 0 ? Math.round((pm.value / total) * 100) : 0;
                  return (
                    <div key={pm.label}>
                      <div className="flex justify-between text-xs mb-1"><span>{pm.label}</span><span className="font-medium">{formatCurrency(pm.value)} ({pct}%)</span></div>
                      <div className="w-full bg-muted rounded-full h-1.5"><div className={`${pm.color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Products + Alerts + Live Activity Feed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-interactive rounded-xl border border-border p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Top Products</h3>
            {dashboard.topProducts.length === 0 ? <p className="text-sm text-muted-foreground">No sales data yet</p> : (
              <div className="space-y-2">
                {dashboard.topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-muted-foreground">{p.category} • {Math.ceil(p.quantity)} sold</p></div>
                    <span className="text-sm font-semibold">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="card-interactive rounded-xl border border-border p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /> Alerts</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {dashboard.notifications.filter(n => n.type !== 'info').map(n => (
                <div key={n.id} className={`rounded-lg p-3 text-sm cursor-pointer hover:opacity-80 transition ${n.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'}`}
                  onClick={() => { if (n.action) setCurrentView(n.action as View); }}>
                  <p className="font-medium text-xs">{n.title}</p><p className="text-xs opacity-80">{n.message}</p>
                </div>
              ))}
              {dashboard.alerts.lowStock.length > 0 && dashboard.alerts.lowStock.map((p: any) => (
                <div key={p.id} className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm cursor-pointer hover:opacity-80 transition" onClick={() => setCurrentView('products')}>
                  <p className="font-medium text-xs text-orange-700 dark:text-orange-300">Low Stock: {p.name}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">{p.quantity} remaining (reorder at {p.reorderLevel})</p>
                </div>
              ))}
              {dashboard.notifications.filter(n => n.type !== 'info').length === 0 && dashboard.alerts.lowStock.length === 0 && (
                <div className="text-center py-4"><CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No alerts — you&apos;re all good!</p></div>
              )}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="card-interactive rounded-xl border border-border p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Live Activity</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activityFeed.length > 0 ? activityFeed.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
                  <div className="mt-0.5 flex-shrink-0">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4"><Activity className="w-6 h-6 text-muted-foreground mx-auto mb-1" /><p className="text-xs text-muted-foreground">Waiting for activity...</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-bold text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <button onClick={() => setCurrentView('pos')} className="flex items-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium"><ShoppingCart className="w-4 h-4" /> New Sale</button>
            <button onClick={() => setCurrentView('purchases')} className="flex items-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium"><Package className="w-4 h-4" /> Record Purchase</button>
            <button onClick={async () => { await fetch('/api/kra/sync?action=process_queue&businessId=' + businessId, { method: 'POST' }); fetchDashboard(); showToast('Sync queue processed', 'success'); }} className="flex items-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium"><RefreshCw className="w-4 h-4" /> Sync Now</button>
            <button onClick={() => setCurrentView('reports')} className="flex items-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium"><Activity className="w-4 h-4" /> Reports</button>
            <button onClick={async () => { const csvRows = [['Invoice#','Buyer','Amount','Status','Date']]; invoices.forEach(i => csvRows.push([i.invoiceNumber, i.buyerName || 'Walk-in', String(i.totalAmount), i.status, new Date(i.createdAt).toLocaleDateString()])); const blob = new Blob([csvRows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sokoni-invoices-${Date.now()}.csv`; a.click(); showToast('CSV exported!', 'success'); }} className="flex items-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium"><Download className="w-4 h-4" /> Export CSV</button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: POS (unchanged logic, better visuals)
  // ============================================
  const renderPOS = () => (
    <POSView
      locale={locale}
      products={products}
      cart={cart}
      setCart={setCart}
      showBuyerFields={showBuyerFields}
      setShowBuyerFields={setShowBuyerFields}
      buyerPin={buyerPin}
      setBuyerPin={setBuyerPin}
      buyerName={buyerName}
      setBuyerName={setBuyerName}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      mpesaPhone={mpesaPhone}
      setMpesaPhone={setMpesaPhone}
      selectedCustomer={selectedCustomer}
      setSelectedCustomer={setSelectedCustomer}
      onGenerateInvoice={generateInvoice}
      onInitiateMpesa={initiateMpesaPayment}
      onValidatePin={validatePin}
      onToast={showToast}
    />
  );

  // ============================================
  // RENDER: INVOICES (with search + receipt preview)
  // ============================================
  const renderInvoices = () => {
    const filtered = invoices.filter(i => !invoiceSearch || i.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) || (i.buyerName || '').toLowerCase().includes(invoiceSearch.toLowerCase()));
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold">{t(locale, 'invoices.title')}</h2>
          <div className="flex items-center gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><input type="text" placeholder="Search invoices..." value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} className="pl-8 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary w-44" /></div>
            <button onClick={() => fetchInvoices()} className="p-1.5 hover:bg-muted rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'synced', 'queued', 'failed', 'cancelled'].map(status => (
            <button key={status} onClick={() => { setInvoiceFilter(status); fetchInvoices(status !== 'all' ? status : undefined); }}
              className={`px-3 py-1.5 text-xs rounded-full border transition ${invoiceFilter === status ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}>
              {t(locale, `invoices.${status}` as any)} {status !== 'all' && `(${invoices.filter(i => i.status === status).length})`}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><FileText className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>{t(locale, 'invoices.noInvoices')}</p></div>
        ) : (
          <div className="space-y-2">{filtered.map(inv => (
            <div key={inv.id} onClick={async () => { const r = await fetch(`/api/invoices?id=${inv.id}`); setSelectedInvoice(await r.json()); }}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary cursor-pointer transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><StatusBadge status={inv.status} /><div><p className="font-medium text-sm">{inv.invoiceNumber}</p><p className="text-xs text-muted-foreground">{inv.buyerName || 'Walk-in'} • {new Date(inv.createdAt).toLocaleDateString()}</p></div></div>
                <div className="text-right"><p className="font-bold text-sm">{formatCurrency(inv.totalAmount)}</p><p className="text-[10px] text-muted-foreground capitalize">{inv.paymentMethod}</p></div>
              </div>
              {inv.lastError && <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {inv.lastError}</p>}
            </div>
          ))}</div>
        )}
        {/* Invoice Detail Modal with Receipt Preview */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
            <div className="bg-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{selectedInvoice.invoiceNumber}</h3><button onClick={() => setSelectedInvoice(null)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><span className="text-muted-foreground">Status</span><div className="mt-1"><StatusBadge status={selectedInvoice.status} /></div></div>
                <div><span className="text-muted-foreground">Payment</span><p className="font-medium capitalize mt-1">{selectedInvoice.paymentMethod}</p></div>
                {selectedInvoice.buyerPin && <div><span className="text-muted-foreground">Buyer PIN</span><p className="font-mono font-medium mt-1">{selectedInvoice.buyerPin}</p></div>}
                {selectedInvoice.buyerName && <div><span className="text-muted-foreground">Buyer</span><p className="font-medium mt-1">{selectedInvoice.buyerName}</p></div>}
                {selectedInvoice.mpesaReceiptNumber && <div><span className="text-muted-foreground">M-Pesa</span><p className="font-mono text-green-600 mt-1">{selectedInvoice.mpesaReceiptNumber}</p></div>}
              </div>
              {/* Receipt Preview */}
              <div className="mb-4">{renderReceiptPreview(selectedInvoice)}</div>
              {/* KRA Details */}
              {selectedInvoice.kraControlNumber && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-1 mb-4">
                  <p className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1"><Shield className="w-3 h-3" /> KRA eTIMS Verified</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Control: <span className="font-mono">{selectedInvoice.kraControlNumber}</span></p>
                    <p>Signature: <span className="font-mono">{selectedInvoice.kraSignature?.substring(0, 24)}...</span></p>
                  </div>
                </div>
              )}
              {selectedInvoice.lastError && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-4">
                  <p className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {selectedInvoice.lastError}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Retries: {selectedInvoice.retryCount}/5</p>
                </div>
              )}
              <div className="flex gap-2">
                {selectedInvoice.status === 'failed' && <button onClick={() => { retryInvoiceSync(selectedInvoice.id); setSelectedInvoice(null); }} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Retry Sync</button>}
                {selectedInvoice.invoiceType === 'standard' && <button onClick={() => { setCreditNoteInvoice(selectedInvoice); setShowCreditNote(true); setSelectedInvoice(null); }} className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"><FileText className="w-4 h-4" /> Credit/Debit Note</button>}
                <button onClick={() => { window.print(); }} className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print Receipt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER: PURCHASES
  // ============================================
  const renderPurchases = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t(locale, 'purchases.title')}</h2>
        <button onClick={() => setShowNewPurchase(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> {t(locale, 'purchases.newPurchase')}</button>
      </div>
      {purchases.some(p => !p.isEtimesCompliant) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">{t(locale, 'purchases.expenseWarning')}</p>
        </div>
      )}
      {purchases.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>{t(locale, 'purchases.noPurchases')}</p></div> : (
        <div className="space-y-2">{purchases.map(purchase => (
          <div key={purchase.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">{purchase.isEtimesCompliant ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                <div><p className="font-medium text-sm">{purchase.description}</p><p className="text-xs text-muted-foreground">{purchase.supplierName} • {new Date(purchase.purchaseDate).toLocaleDateString()}</p></div>
              </div>
              <div className="text-right"><p className="font-bold text-sm">{formatCurrency(purchase.totalAmount)}</p>
                <div className="flex items-center gap-2 mt-1 justify-end">
                  {purchase.isEtimesCompliant ? <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">{t(locale, 'purchases.compliant')}</span> : <span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium">{t(locale, 'purchases.nonCompliant')}</span>}
                  {purchase.buyerInitiated && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">{t(locale, 'purchases.buyerInitiated')}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}</div>
      )}
      {showNewPurchase && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewPurchase(false)}>
          <div className="bg-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{t(locale, 'purchases.newPurchase')}</h3><button onClick={() => setShowNewPurchase(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">{t(locale, 'purchases.supplierName')}</label><input type="text" value={newPurchase.supplierName} onChange={e => setNewPurchase(p => ({ ...p, supplierName: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">{t(locale, 'purchases.supplierPin')}</label><input type="text" value={newPurchase.supplierPin} onChange={e => setNewPurchase(p => ({ ...p, supplierPin: e.target.value.toUpperCase() }))} placeholder="A00XXXXXXXB" maxLength={11} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">{t(locale, 'purchases.purchaseDescription')}</label><input type="text" value={newPurchase.description} onChange={e => setNewPurchase(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">{t(locale, 'purchases.category')}</label><select value={newPurchase.category} onChange={e => setNewPurchase(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">{['Food', 'Household', 'Beverages', 'Services', 'Equipment', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Total (KES)</label><input type="number" value={newPurchase.totalAmount} onChange={e => setNewPurchase(p => ({ ...p, totalAmount: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground">VAT (KES)</label><input type="number" value={newPurchase.totalVat} onChange={e => setNewPurchase(p => ({ ...p, totalVat: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newPurchase.isEtimesCompliant} onChange={e => setNewPurchase(p => ({ ...p, isEtimesCompliant: e.target.checked }))} className="w-4 h-4 accent-primary" />{t(locale, 'purchases.isCompliant')}</label>
              {!newPurchase.isEtimesCompliant && <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newPurchase.buyerInitiated} onChange={e => setNewPurchase(p => ({ ...p, buyerInitiated: e.target.checked }))} className="w-4 h-4 accent-primary" />{t(locale, 'purchases.generateCompliant')}</label>}
              <button onClick={async () => { try { const r = await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, ...newPurchase }) }); if (!r.ok) throw new Error((await r.json()).error); setShowNewPurchase(false); setNewPurchase({ supplierName: '', supplierPin: '', description: '', totalAmount: '', totalVat: '0', category: 'Food', paymentMethod: 'cash', isEtimesCompliant: false, buyerInitiated: false, notes: '' }); fetchPurchases(); showToast('Purchase recorded!', 'success'); } catch (err: any) { showToast(err.message, 'error'); } }} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">{t(locale, 'purchases.recordPurchase')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: PRODUCTS
  // ============================================
  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t(locale, 'products.title')}</h2>
        <button onClick={() => setShowNewProduct(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> {t(locale, 'products.newProduct')}</button>
      </div>
      {products.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>{t(locale, 'products.noProducts')}</p></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(product => (
            <div key={product.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition">
              <div className="flex items-start justify-between">
                <div><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku} • {product.category}</p></div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.quantity === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : product.quantity <= product.reorderLevel ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                  {product.quantity === 0 ? 'Out' : product.quantity <= product.reorderLevel ? 'Low' : 'In Stock'}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-3">
                <p className="text-lg font-bold text-primary">{formatCurrency(product.unitPrice)}</p>
                <p className="text-xs text-muted-foreground">VAT {product.vatRate}%</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-muted-foreground">Stock: <span className="font-medium text-foreground">{product.quantity}</span></p>
                <div className="flex gap-1">
                  <button onClick={async () => { await fetch('/api/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id, quantity: product.quantity + 10 }) }); fetchProducts(); showToast('Stock +10', 'success'); }} className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded hover:opacity-80 font-medium">+10</button>
                  <button onClick={async () => { await fetch(`/api/products?id=${product.id}`, { method: 'DELETE' }); fetchProducts(); showToast('Product removed', 'success'); }} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:opacity-80 font-medium">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showNewProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewProduct(false)}>
          <div className="bg-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{t(locale, 'products.newProduct')}</h3><button onClick={() => setShowNewProduct(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              {[{ key: 'name', label: 'Product Name', type: 'text' }, { key: 'sku', label: 'SKU', type: 'text' }, { key: 'unitPrice', label: 'Price (KES)', type: 'number' }, { key: 'costPrice', label: 'Cost Price (KES)', type: 'number' }, { key: 'vatRate', label: 'VAT Rate (%)', type: 'number' }, { key: 'quantity', label: 'Stock', type: 'number' }, { key: 'itemCode', label: 'KRA Item Code', type: 'text' }].map(f => (
                <div key={f.key}><label className="text-xs text-muted-foreground">{f.label}</label><input type={f.type} value={(newProduct as any)[f.key]} onChange={e => setNewProduct(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              ))}
              <div><label className="text-xs text-muted-foreground">Category</label><select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">{['Food', 'Dairy', 'Bakery', 'Beverages', 'Household', 'Services', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <button onClick={async () => { try { const r = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, ...newProduct }) }); if (!r.ok) throw new Error((await r.json()).error); setShowNewProduct(false); setNewProduct({ name: '', sku: '', category: 'Food', unitPrice: '', costPrice: '', vatRate: '16', vatType: 'VAT', quantity: '0', itemCode: '', itemClassCode: '', unitOfMeasure: 'PCE' }); fetchProducts(); showToast('Product added!', 'success'); } catch (err: any) { showToast(err.message, 'error'); } }} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">{t(locale, 'products.saveProduct')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: SUPPLIERS
  // ============================================
  const renderSuppliers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{t(locale, 'suppliers.title')}</h2><button onClick={() => setShowNewSupplier(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> {t(locale, 'suppliers.newSupplier')}</button></div>
      <p className="text-sm text-muted-foreground">{t(locale, 'suppliers.complianceNote')}</p>
      {suppliers.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Truck className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>{t(locale, 'suppliers.noSuppliers')}</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{suppliers.map(supplier => (
          <div key={supplier.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2"><h4 className="font-medium">{supplier.name}</h4>
              {supplier.isEtimesCompliant ? <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"><CheckCircle className="w-3 h-3" /> eTIMS</span> : <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"><AlertTriangle className="w-3 h-3" /> No eTIMS</span>}
            </div>
            {supplier.kraPin && <p className="text-xs text-muted-foreground font-mono">PIN: {supplier.kraPin}</p>}
            {supplier.phone && <p className="text-xs text-muted-foreground">{supplier.phone}</p>}
            {supplier._count && <p className="text-xs text-muted-foreground mt-1">{supplier._count.purchases} purchase records</p>}
          </div>
        ))}</div>
      )}
      {showNewSupplier && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewSupplier(false)}>
          <div className="bg-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{t(locale, 'suppliers.newSupplier')}</h3><button onClick={() => setShowNewSupplier(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Name</label><input type="text" value={newSupplier.name} onChange={e => setNewSupplier(s => ({ ...s, name: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">KRA PIN</label><input type="text" value={newSupplier.kraPin} onChange={e => setNewSupplier(s => ({ ...s, kraPin: e.target.value.toUpperCase() }))} placeholder="A00XXXXXXXB" maxLength={11} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Phone</label><input type="tel" value={newSupplier.phone} onChange={e => setNewSupplier(s => ({ ...s, phone: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Email</label><input type="email" value={newSupplier.email} onChange={e => setNewSupplier(s => ({ ...s, email: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newSupplier.isEtimesCompliant} onChange={e => setNewSupplier(s => ({ ...s, isEtimesCompliant: e.target.checked }))} className="w-4 h-4 accent-primary" />{t(locale, 'suppliers.isEtimesCompliant')}</label>
              <button onClick={async () => { try { const r = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, ...newSupplier }) }); if (!r.ok) throw new Error((await r.json()).error); setShowNewSupplier(false); setNewSupplier({ name: '', kraPin: '', phone: '', email: '', address: '', isEtimesCompliant: false }); fetchSuppliers(); showToast('Supplier added!', 'success'); } catch (err: any) { showToast(err.message, 'error'); } }} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">{t(locale, 'suppliers.saveSupplier')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: CUSTOMERS
  // ============================================
  const renderCustomers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{t(locale, 'customers.title')}</h2><button onClick={() => setShowNewCustomer(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"><Plus className="w-4 h-4" /> {t(locale, 'customers.newCustomer')}</button></div>
      <p className="text-sm text-muted-foreground">{t(locale, 'customers.b2bNote')}</p>
      {customers.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>{t(locale, 'customers.noCustomers')}</p></div> : (
        <div className="space-y-2">{customers.map(customer => (
          <div key={customer.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div><p className="font-medium">{customer.name}</p><div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">{customer.kraPin && <span className="font-mono">PIN: {customer.kraPin}</span>}{customer.phone && <span>{customer.phone}</span>}{customer.isVatRegistered && <span className="text-green-600 dark:text-green-400 font-medium">VAT Registered</span>}</div></div>
            <button className="text-xs text-primary hover:underline font-medium" onClick={() => { setSelectedCustomer(customer); setShowBuyerFields(true); setBuyerPin(customer.kraPin || ''); setBuyerName(customer.name); setCurrentView('pos'); }}>Use in POS</button>
          </div>
        ))}</div>
      )}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewCustomer(false)}>
          <div className="bg-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">{t(locale, 'customers.newCustomer')}</h3><button onClick={() => setShowNewCustomer(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Name</label><input type="text" value={newCustomer.name} onChange={e => setNewCustomer(c => ({ ...c, name: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">KRA PIN</label><input type="text" value={newCustomer.kraPin} onChange={e => setNewCustomer(c => ({ ...c, kraPin: e.target.value.toUpperCase() }))} placeholder="P00XXXXXXXQ" maxLength={11} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Phone</label><input type="tel" value={newCustomer.phone} onChange={e => setNewCustomer(c => ({ ...c, phone: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Email</label><input type="email" value={newCustomer.email} onChange={e => setNewCustomer(c => ({ ...c, email: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newCustomer.isVatRegistered} onChange={e => setNewCustomer(c => ({ ...c, isVatRegistered: e.target.checked }))} className="w-4 h-4 accent-primary" />{t(locale, 'customers.vatRegistered')}</label>
              <button onClick={async () => { try { const r = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, ...newCustomer }) }); if (!r.ok) throw new Error((await r.json()).error); setShowNewCustomer(false); setNewCustomer({ name: '', kraPin: '', phone: '', email: '', address: '', isVatRegistered: false }); fetchCustomers(); showToast('Customer added!', 'success'); } catch (err: any) { showToast(err.message, 'error'); } }} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">{t(locale, 'customers.saveCustomer')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: M-PESA
  // ============================================
  const renderMpesa = () => {
    const reconciled = mpesaTransactions.filter(t => t.reconciled).length;
    const unreconciled = mpesaTransactions.filter(t => !t.reconciled && t.status === 'completed').length;
    const totalAmount = mpesaTransactions.reduce((s, t) => s + t.amount, 0);
    return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">{t(locale, 'mpesa.title')}</h2>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            try {
              const r = await fetch('/api/mpesa/auto-reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) });
              const d = await r.json();
              if (d.success) {
                fetchMpesa();
                showToast(`Auto-matched ${d.matched} transactions! ${d.reconciliationRate}% reconciled.`, 'success');
              } else showToast(d.error || 'Auto-reconcile failed', 'error');
            } catch { showToast('Auto-reconcile error', 'error'); }
          }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:opacity-90 shadow-md shadow-green-600/20">
            <Zap className="w-4 h-4" /> Smart Reconcile
          </button>
          <button onClick={async () => { await fetch('/api/mpesa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reconcile', businessId }) }); fetchMpesa(); showToast('Reconciliation complete', 'success'); }} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90"><RefreshCw className="w-4 h-4" /> {t(locale, 'mpesa.reconcileNow')}</button>
        </div>
      </div>
      {/* M-Pesa Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-stat rounded-xl p-4"><p className="text-label">Total Transactions</p><p className="text-2xl font-bold mt-1">{mpesaTransactions.length}</p></div>
        <div className="card-stat rounded-xl p-4"><p className="text-label">Total Amount</p><p className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalAmount)}</p></div>
        <div className="card-stat rounded-xl p-4"><p className="text-label">Reconciled</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{reconciled}</p></div>
        <div className="card-stat rounded-xl p-4"><p className="text-label">Unmatched</p><p className={`text-2xl font-bold mt-1 ${unreconciled > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{unreconciled}</p></div>
      </div>
      {unreconciled > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">{unreconciled} transactions need matching. Click <strong>Smart Reconcile</strong> to auto-match by amount, phone & time.</p>
        </div>
      )}
      {mpesaTransactions.length === 0 ? <div className="text-center py-12 text-muted-foreground"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>{t(locale, 'mpesa.noTransactions')}</p></div> : (
        <div className="space-y-2">{mpesaTransactions.map(txn => (
          <div key={txn.id} className="bg-card border border-border rounded-xl p-4 card-interactive">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><StatusBadge status={txn.status} /><div><p className="font-medium text-sm">{txn.phoneNumber}</p><p className="text-xs text-muted-foreground">{new Date(txn.createdAt).toLocaleString()}</p></div></div>
              <div className="text-right"><p className="font-bold text-sm">{formatCurrency(txn.amount)}</p>
                <div className="flex items-center gap-2 mt-1 justify-end">{txn.mpesaReceipt && <span className="text-xs font-mono text-green-600">{txn.mpesaReceipt}</span>}
                  {txn.reconciled ? <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Matched</span> : <span className="text-xs text-yellow-600 font-medium">Unmatched</span>}
                </div>
                {txn.invoice && <p className="text-[10px] text-muted-foreground mt-1">→ {txn.invoice.invoiceNumber}</p>}
              </div>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
  };

  // ============================================
  // RENDER: REPORTS (NEW - the big undersell)
  // ============================================
  const renderReports = () => {
    if (!dashboard) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
    const tabs = [{ key: 'sales' as const, label: 'Sales', icon: <TrendingUp className="w-4 h-4" /> }, { key: 'vat' as const, label: 'VAT Return', icon: <FileSpreadsheet className="w-4 h-4" /> }, { key: 'pnl' as const, label: 'Profit & Loss', icon: <PiggyBank className="w-4 h-4" /> }, { key: 'products' as const, label: 'Products', icon: <BoxIcon className="w-4 h-4" /> }];
    const maxSales = Math.max(...dashboard.dailyTrend.map(d => d.sales), 1);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Reports & Analytics</h2>
          <button onClick={async () => { const csvRows = [['Type','Description','Amount','VAT','Date']]; invoices.filter(i => i.status !== 'cancelled').forEach(i => csvRows.push(['Sale', i.invoiceNumber, String(i.totalAmount), String(i.totalVat), new Date(i.createdAt).toLocaleDateString()])); purchases.forEach(p => csvRows.push(['Purchase', p.description, String(p.totalAmount), String(p.totalVat), new Date(p.purchaseDate).toLocaleDateString()])); const blob = new Blob([csvRows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sokoni-report-${Date.now()}.csv`; a.click(); showToast('Report exported!', 'success'); }} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90"><Download className="w-4 h-4" /> Export CSV</button>
        </div>

        <div className="flex gap-2 border-b border-border pb-1">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setReportTab(tab.key)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition ${reportTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {reportTab === 'sales' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card rounded-xl p-4 border border-border"><p className="text-xs text-muted-foreground">Today</p><p className="text-2xl font-bold text-primary">{formatCurrency(dashboard.sales.todaySales)}</p></div>
              <div className="bg-card rounded-xl p-4 border border-border"><p className="text-xs text-muted-foreground">This Week</p><p className="text-2xl font-bold">{formatCurrency(dashboard.sales.weekSales)}</p></div>
              <div className="bg-card rounded-xl p-4 border border-border"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold">{formatCurrency(dashboard.sales.totalSales)}</p></div>
              <div className="bg-card rounded-xl p-4 border border-border"><p className="text-xs text-muted-foreground">Avg Invoice</p><p className="text-2xl font-bold">{formatCurrency(dashboard.sales.averageInvoiceValue)}</p></div>
            </div>
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-bold text-sm mb-4">7-Day Sales Trend</h3>
              <MiniBarChart data={dashboard.dailyTrend.map(d => d.sales)} maxValue={maxSales} color="bg-emerald-500" />
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">{dashboard.dailyTrend.map(d => <span key={d.date}>{d.date}</span>)}</div>
            </div>
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-bold text-sm mb-4">Payment Method Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{ label: 'Cash', value: dashboard.sales.paymentBreakdown.cash, icon: <DollarSign className="w-5 h-5" />, color: 'text-emerald-600' }, { label: 'M-Pesa', value: dashboard.sales.paymentBreakdown.mpesa, icon: <Phone className="w-5 h-5" />, color: 'text-green-600' }, { label: 'Bank', value: dashboard.sales.paymentBreakdown.bank, icon: <CreditCard className="w-5 h-5" />, color: 'text-blue-600' }, { label: 'Credit', value: dashboard.sales.paymentBreakdown.credit, icon: <Clock className="w-5 h-5" />, color: 'text-orange-600' }].map(pm => (
                  <div key={pm.label} className="text-center p-3 bg-muted rounded-lg"><div className={`${pm.color} mx-auto mb-2`}>{pm.icon}</div><p className="font-bold">{formatCurrency(pm.value)}</p><p className="text-xs text-muted-foreground">{pm.label}</p></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {reportTab === 'vat' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 rounded-2xl p-6 text-white">
              <h3 className="font-bold flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> VAT Return Summary</h3>
              <p className="text-blue-200 text-xs mt-1">Period: {dashboard.vatReturn.period}</p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white/10 rounded-xl p-4 text-center"><p className="text-xs text-blue-200">Output VAT (Sales)</p><p className="text-2xl font-bold mt-1">{formatCurrency(dashboard.vatReturn.vatPayable)}</p></div>
                <div className="bg-white/10 rounded-xl p-4 text-center"><p className="text-xs text-blue-200">Input VAT (Purchases)</p><p className="text-2xl font-bold mt-1">{formatCurrency(dashboard.vatReturn.vatRecoverable)}</p></div>
                <div className="bg-white/10 rounded-xl p-4 text-center"><p className="text-xs text-blue-200">Net VAT Payable</p><p className={`text-2xl font-bold mt-1 ${dashboard.vatReturn.netVat >= 0 ? 'text-yellow-200' : 'text-green-200'}`}>{formatCurrency(dashboard.vatReturn.netVat)}</p></div>
              </div>
              {dashboard.vatReturn.netVat > 0 && <p className="text-xs text-yellow-200 mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> You owe KRA {formatCurrency(dashboard.vatReturn.netVat)} in VAT this period</p>}
              {dashboard.vatReturn.netVat < 0 && <p className="text-xs text-green-200 mt-3 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> You have a VAT credit of {formatCurrency(Math.abs(dashboard.vatReturn.netVat))}</p>}
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-bold text-sm mb-3">Purchase Compliance Impact</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Compliant supplier purchases</span><span className="font-medium text-green-600">{dashboard.purchases.compliant} ({dashboard.purchases.complianceRate}%)</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Non-compliant purchases</span><span className="font-medium text-yellow-600">{dashboard.purchases.nonCompliant}</span></div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Non-compliant purchase expenses risk being disallowed by KRA, increasing your tax liability</p>
              </div>
            </div>
          </div>
        )}

        {reportTab === 'pnl' && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-bold text-sm mb-4">Profit & Loss Statement</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2"><span className="font-medium">Revenue (Sales)</span><span className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(dashboard.profitLoss.revenue)}</span></div>
                <div className="flex justify-between items-center py-2 border-t border-border"><span className="text-muted-foreground">Cost of Goods Sold</span><span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(dashboard.profitLoss.costOfGoods)}</span></div>
                <div className="flex justify-between items-center py-2 border-t-2 border-border"><span className="font-bold">Gross Profit</span><div className="text-right"><span className={`text-lg font-bold ${dashboard.profitLoss.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(dashboard.profitLoss.grossProfit)}</span><p className="text-xs text-muted-foreground">Margin: {dashboard.profitLoss.grossProfitMargin}%</p></div></div>
                <div className="flex justify-between items-center py-2 border-t border-border"><span className="text-muted-foreground">Net VAT Payable</span><span className={dashboard.profitLoss.netVat >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>{dashboard.profitLoss.netVat >= 0 ? '-' : '+'}{formatCurrency(Math.abs(dashboard.profitLoss.netVat))}</span></div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-bold text-sm mb-3">Gross Margin Analysis</h3>
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700 flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${Math.max(dashboard.profitLoss.grossProfitMargin, 5)}%` }}>
                  {dashboard.profitLoss.grossProfitMargin}%
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground"><span>0%</span><span>50%</span><span>100%</span></div>
            </div>
          </div>
        )}

        {reportTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-bold text-sm mb-4">Top Selling Products</h3>
              {dashboard.topProducts.length === 0 ? <p className="text-sm text-muted-foreground">No sales data yet</p> : (
                <div className="space-y-3">{dashboard.topProducts.map((p, i) => {
                  const maxRev = dashboard.topProducts[0]?.revenue || 1;
                  const pct = Math.round((p.revenue / maxRev) * 100);
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline"><p className="text-sm font-medium truncate">{p.name}</p><span className="font-bold text-sm ml-2">{formatCurrency(p.revenue)}</span></div>
                        <div className="flex items-center gap-2 mt-1"><div className="flex-1 bg-muted rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div><span className="text-[10px] text-muted-foreground shrink-0">{Math.ceil(p.quantity)} sold</span></div>
                      </div>
                    </div>
                  );
                })}</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER: EXPENSE VALIDATION (THE MOAT)
  // ============================================
  const renderExpenseCheck = () => {
    if (!expenseValidation) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
    const ev = expenseValidation;

    return (
      <div className="space-y-5">
        {/* Hero: Compliance Status */}
        <div className={`rounded-2xl p-6 text-white relative overflow-hidden ${
          ev.overallStatus === 'good' ? 'bg-gradient-to-br from-emerald-600 to-teal-600' :
          ev.overallStatus === 'warning' ? 'bg-gradient-to-br from-amber-600 to-orange-600' :
          'bg-gradient-to-br from-red-600 to-rose-700'}`}>
          <div className="absolute -right-4 -bottom-4 opacity-10"><Shield className="w-32 h-32" /></div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <ProgressRing value={ev.complianceRate} size={80} strokeWidth={8}
                color={ev.overallStatus === 'good' ? '#4ade80' : ev.overallStatus === 'warning' ? '#fbbf24' : '#f87171'} />
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{ev.complianceRate}%</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">KRA Expense Validation</h2>
              <p className="text-sm opacity-90 mt-0.5">
                {ev.overallStatus === 'good' ? 'Your expenses are likely to pass KRA validation' :
                 ev.overallStatus === 'warning' ? 'Some expenses may be challenged by KRA' :
                 'Critical issues found — expenses at risk of disallowance'}
              </p>
              <p className="text-xs opacity-70 mt-1">Period: {ev.period?.from} — {ev.period?.to}</p>
            </div>
          </div>
        </div>

        {/* Financial Impact Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(ev.totalExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">This year</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Compliant Expenses</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(ev.compliantExpenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">{ev.complianceRate}% of total</p>
          </div>
          <div className={`rounded-xl border p-5 ${ev.atRiskAmount > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-card border-border'}`}>
            <p className="text-xs text-muted-foreground">At-Risk Amount</p>
            <p className={`text-2xl font-bold mt-1 ${ev.atRiskAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(ev.atRiskAmount)}</p>
            <p className="text-xs text-muted-foreground mt-1">{ev.atRiskAmount > 0 ? `~KES ${formatCurrency(ev.estimatedTaxRisk)} extra tax risk` : 'No risk detected'}</p>
          </div>
        </div>

        {/* KRA Validation Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">KRA Expense Validation is Now Active</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">{ev.kraValidationNote}</p>
          </div>
        </div>

        {/* Validation Checks */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Validation Results
            <span className="text-sm font-normal text-muted-foreground">({ev.summary.critical} critical, {ev.summary.warnings} warnings)</span>
          </h3>
          {ev.checks.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium">All Checks Passed</p>
              <p className="text-sm text-muted-foreground mt-1">Your expenses are compliant with KRA requirements</p>
            </div>
          ) : ev.checks.map((check: any) => (
            <div key={check.id} className={`rounded-xl border p-5 transition hover:shadow-sm ${
              check.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
              check.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' :
              'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-start gap-3">
                {check.severity === 'critical' ? <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> :
                 check.severity === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" /> :
                 <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">{check.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      check.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      check.severity === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>{check.severity}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{check.description}</p>
                  <p className="text-xs font-medium mt-2">Financial Impact: {check.financialImpact}</p>
                  <p className="text-xs text-muted-foreground mt-1">Recommendation: {check.recommendation}</p>

                  {/* Affected items */}
                  {check.affectedItems && check.affectedItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-1 max-h-32 overflow-y-auto">
                      {check.affectedItems.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate flex-1">{item.description}</span>
                          {item.amount > 0 && <span className="font-medium ml-2">{formatCurrency(item.amount)}</span>}
                          {item.date && <span className="text-muted-foreground ml-2">{item.date}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Compliance Health Audit */}
        {complianceHealth && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> eTIMS Compliance Audit
              </h3>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                complianceHealth.riskLevel === 'low' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                complianceHealth.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                complianceHealth.riskLevel === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {complianceHealth.riskLevel.toUpperCase()} RISK
              </span>
            </div>
            
            {/* Audit Checks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {complianceHealth.checks.map((check: any, i: number) => (
                <div key={i} className={`rounded-xl border p-4 flex items-start gap-3 transition hover:shadow-sm ${
                  check.status === 'pass' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' :
                  check.status === 'fail' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                  'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                }`}>
                  {check.status === 'pass' ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> :
                   check.status === 'fail' ? <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> :
                   <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{check.name}</p>
                      {check.critical && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold shrink-0">CRITICAL</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium ${check.status === 'pass' ? 'text-emerald-600 dark:text-emerald-400' : check.status === 'fail' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {check.status === 'pass' ? 'PASS' : check.status === 'fail' ? 'FAIL' : 'WARN'}
                      </span>
                      <span className="text-xs text-muted-foreground">Weight: {check.weight}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {complianceHealth.recommendations.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Priority Actions</h4>
                <div className="space-y-2">
                  {complianceHealth.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Penalty Risk */}
            {complianceHealth.totalAtRiskAmount > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-red-800 dark:text-red-300">Estimated Penalty Exposure</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{formatCurrency(complianceHealth.totalAtRiskAmount)} at risk based on current compliance gaps</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER: CREDIT NOTE MODAL
  // ============================================
  const renderCreditNoteModal = () => {
    if (!showCreditNote || !creditNoteInvoice) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCreditNote(false)}>
        <div className="bg-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">{creditNoteType === 'credit_note' ? 'Issue Credit Note' : 'Issue Debit Note'}</h3>
            <button onClick={() => setShowCreditNote(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-4 space-y-1 text-sm">
              <p className="font-medium">Original Invoice</p>
              <p className="text-muted-foreground">{creditNoteInvoice.invoiceNumber} — {creditNoteInvoice.buyerName || 'Walk-in'}</p>
              <p className="font-bold text-primary">{formatCurrency(creditNoteInvoice.totalAmount)}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Note Type</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button onClick={() => setCreditNoteType('credit_note')} className={`px-3 py-2 text-sm rounded-lg border transition font-medium ${creditNoteType === 'credit_note' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>Credit Note (Refund)</button>
                <button onClick={() => setCreditNoteType('debit_note')} className={`px-3 py-2 text-sm rounded-lg border transition font-medium ${creditNoteType === 'debit_note' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>Debit Note (Additional)</button>
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-xs text-yellow-700 dark:text-yellow-300">
              <p className="font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Important</p>
              <p className="mt-0.5">Credit/debit notes must reference the exact original invoice. The note total cannot exceed the original invoice amount. This will be synced to KRA eTIMS.</p>
            </div>
            <button onClick={async () => {
              try {
                const r = await fetch('/api/invoices/credit-note', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ businessId, originalInvoiceId: creditNoteInvoice.id, type: creditNoteType }),
                });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                setShowCreditNote(false);
                setCreditNoteInvoice(null);
                fetchInvoices();
                showToast(`${creditNoteType === 'credit_note' ? 'Credit' : 'Debit'} note created!`, 'success');
              } catch (err: any) { showToast(err.message, 'error'); }
            }} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">
              Create {creditNoteType === 'credit_note' ? 'Credit' : 'Debit'} Note
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: SETTINGS
  // ============================================
  const [settingsData, setSettingsData] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState({ name: '', email: '', phone: '', address: '', language: 'en', currentTier: 'free', receiptFooter: '' });
  useEffect(() => {
    if (currentView === 'settings' && businessId) {
      fetch(`/api/settings?businessId=${businessId}`).then(r => r.json()).then(data => {
        setSettingsData(data);
        if (data.business) setSettingsForm({ name: data.business.name || '', email: data.business.email || '', phone: data.business.phone || '', address: data.business.address || '', language: data.business.language || 'en', currentTier: data.business.currentTier || 'free', receiptFooter: data.business.receiptFooter || '' });
      }).catch(console.error);
    }
  }, [currentView, businessId]);

  const renderSettings = () => (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-xl font-bold">{t(locale, 'settings.title')}</h2>
      <div className="bg-card border border-border rounded-2xl p-6">
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
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> {t(locale, 'settings.kraCredentials')}</h3>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.kraUsername')}</label><input type="text" defaultValue={settingsData?.settings?.kra_username || ''} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          <div><label className="text-xs text-muted-foreground">{t(locale, 'settings.kraPassword')}</label><input type="password" placeholder="Enter password" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> {t(locale, 'settings.language')}</h3>
          <div className="grid grid-cols-2 gap-2">{['en', 'sw'].map(lang => (
            <button key={lang} onClick={() => { setSettingsForm(f => ({ ...f, language: lang })); setLocale(lang as Locale); }} className={`py-2.5 px-3 rounded-xl text-sm border transition font-medium ${settingsForm.language === lang ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>{lang === 'en' ? 'English' : 'Kiswahili'}</button>
          ))}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> {t(locale, 'settings.pricingPlan')}</h3>
          <div className="space-y-2">{settingsData?.tiers && Object.entries(settingsData.tiers).map(([key, tier]: [string, any]) => (
            <button key={key} onClick={() => setSettingsForm(f => ({ ...f, currentTier: key }))} className={`w-full text-left p-3 rounded-xl border text-sm transition ${settingsForm.currentTier === key ? 'bg-primary/10 border-primary' : 'border-border hover:border-primary/50'}`}>
              <div className="flex justify-between items-center"><span className="font-medium">{tier.name}</span><span className="font-bold">{tier.price === 0 ? 'Free' : `KES ${tier.price}/mo`}</span></div>
              <p className="text-xs text-muted-foreground mt-0.5">{tier.features.slice(0, 2).join(' • ')}</p>
            </button>
          ))}</div>
        </div>
      </div>
      <button onClick={async () => { try { const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId, business: settingsForm }) }); if (!r.ok) throw new Error((await r.json()).error); showToast(t(locale, 'settings.saved'), 'success'); } catch (err: any) { showToast(err.message, 'error'); } }} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"><Save className="w-5 h-5" /> {t(locale, 'settings.save')}</button>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  const notifCount = dashboard?.notifications.filter(n => n.type === 'error' || n.type === 'warning').length || 0;

  return (
    <div className="flex min-h-screen">
      {renderSidebar()}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 hover:bg-muted rounded"><Menu className="w-5 h-5" /></button>
            <h2 className="font-semibold text-lg">{t(locale, `nav.${currentView}` as any)}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full flex items-center gap-1 font-medium"><WifiOff className="w-3 h-3" /> Offline</span>}
            <button onClick={() => { fetchDashboard(); setShowNotifications(true); }} className="relative p-2 hover:bg-muted rounded-lg">
              <Bell className="w-4 h-4" />
              {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">{notifCount}</span>}
            </button>
            <button onClick={() => setIsDark(d => !d)} className="p-2 hover:bg-muted rounded-lg">{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
            <button onClick={() => setLocale(l => l === 'en' ? 'sw' : 'en')} className="px-2 py-1 text-xs bg-muted rounded-lg hover:bg-primary/10 font-medium">{locale === 'en' ? 'SW' : 'EN'}</button>
          </div>
        </header>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'pos' && renderPOS()}
          {currentView === 'invoices' && renderInvoices()}
          {currentView === 'purchases' && renderPurchases()}
          {currentView === 'products' && renderProducts()}
          {currentView === 'suppliers' && renderSuppliers()}
          {currentView === 'customers' && renderCustomers()}
          {currentView === 'mpesa' && renderMpesa()}
          {currentView === 'reports' && renderReports()}
          {currentView === 'expense-check' && renderExpenseCheck()}
          {currentView === 'settings' && renderSettings()}
        </div>
      </main>

      {renderWelcome()}
      {renderNotifications()}
      {renderCreditNoteModal()}

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
