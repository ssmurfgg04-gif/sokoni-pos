'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, Search, Package, Plus, Trash2, ChevronRight, Receipt, Phone,
  AlertTriangle, CreditCard, Wallet, Divide, Pause, Play, Barcode, Clock,
  Zap, Hash, Minus, X, CheckCircle, ArrowRight, ToggleLeft
} from 'lucide-react';
import { formatCurrency, type Locale } from '@/lib/i18n';

// ============================================
// TYPES
// ============================================
interface Product {
  id: string; name: string; sku?: string; category?: string; unitPrice: number;
  costPrice?: number; vatRate: number; vatType: string; quantity: number;
  reorderLevel: number; itemCode?: string; itemClassCode?: string; unitOfMeasure?: string; isActive: boolean;
}

interface CartItem { product: Product; quantity: number; }

interface HeldCart {
  id: string; name: string; items: CartItem[]; total: number; createdAt: Date;
}

interface POSViewProps {
  locale: Locale;
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showBuyerFields: boolean;
  setShowBuyerFields: React.Dispatch<React.SetStateAction<boolean>>;
  buyerPin: string;
  setBuyerPin: React.Dispatch<React.SetStateAction<string>>;
  buyerName: string;
  setBuyerName: React.Dispatch<React.SetStateAction<string>>;
  paymentMethod: string;
  setPaymentMethod: React.Dispatch<React.SetStateAction<string>>;
  mpesaPhone: string;
  setMpesaPhone: React.Dispatch<React.SetStateAction<string>>;
  selectedCustomer: any;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<any>>;
  onGenerateInvoice: () => void;
  onInitiateMpesa: () => void;
  onValidatePin: (pin: string) => void;
  onToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

function t(locale: Locale, path: string): string {
  // Inline minimal translations for POS-specific labels
  const posTranslations: Record<string, Record<string, string>> = {
    en: {
      'pos.searchProducts': 'Search products or scan barcode...',
      'pos.cart': 'Cart',
      'pos.clearCart': 'Clear',
      'pos.emptyCart': 'Cart is empty',
      'pos.addBuyer': 'Add B2B Buyer Details',
      'pos.buyerPin': 'Buyer KRA PIN',
      'pos.validatePin': 'Validate',
      'pos.buyerName': 'Buyer Name',
      'pos.paymentMethod': 'Payment Method',
      'pos.cash': 'Cash',
      'pos.mpesa': 'M-Pesa',
      'pos.bank_transfer': 'Bank Transfer',
      'pos.credit': 'Credit',
      'pos.mpesaPhone': 'M-Pesa Phone Number',
      'pos.initiatePayment': 'Send STK Push',
      'pos.generateInvoice': 'Generate Invoice',
      'pos.noProducts': 'No products found',
      'pos.quickKeys': 'Quick Keys',
      'pos.recent': 'Recent',
      'pos.grid': 'All',
      'pos.holdCart': 'Hold',
      'pos.recallCart': 'Recall',
      'pos.splitPay': 'Split Pay',
      'pos.cashTender': 'Quick Cash',
      'pos.barcode': 'Scan Barcode',
      'pos.heldCarts': 'Held Orders',
      'pos.noHeldCarts': 'No held orders',
      'pos.recallThis': 'Recall',
      'pos.discardThis': 'Discard',
      'pos.splitCashAmount': 'Cash Amount',
      'pos.splitMpesaAmount': 'M-Pesa Amount',
      'pos.splitMpesaPhone': 'M-Pesa Phone',
      'pos.completeSplit': 'Complete Split Payment',
      'pos.change': 'Change',
      'pos.tendered': 'Tendered',
      'pos.quickAmounts': 'Quick Amounts',
      'pos.exact': 'Exact',
      'pos.scanPlaceholder': 'Scan or type barcode / SKU...',
      'pos.lastSold': 'Last sold items',
      'pos.subtotal': 'Subtotal',
      'pos.vat': 'VAT',
      'pos.total': 'Total',
    },
    sw: {
      'pos.searchProducts': 'Tafuta bidhaa au scan barkodi...',
      'pos.cart': 'Kikapu',
      'pos.clearCart': 'Futa',
      'pos.emptyCart': 'Kikapu ni tupu',
      'pos.addBuyer': 'Ongeza Maelezo ya Mnunuzi B2B',
      'pos.buyerPin': 'KRA PIN ya Mnunuzi',
      'pos.validatePin': 'Thibitisha',
      'pos.buyerName': 'Jina la Mnunuzi',
      'pos.paymentMethod': 'Njia ya Malipo',
      'pos.cash': 'Pesa',
      'pos.mpesa': 'M-Pesa',
      'pos.bank_transfer': 'Benki',
      'pos.credit': 'Mkopo',
      'pos.mpesaPhone': 'Nambari ya Simu M-Pesa',
      'pos.initiatePayment': 'Tuma STK Push',
      'pos.generateInvoice': 'Tengeneza Ankara',
      'pos.noProducts': 'Hakuna bidhaa',
      'pos.quickKeys': 'Vibonyezo Haraka',
      'pos.recent': 'Hivi karibuni',
      'pos.grid': 'Zote',
      'pos.holdCart': 'Shikilia',
      'pos.recallCart': 'Rudisha',
      'pos.splitPay': 'Gawanya Malipo',
      'pos.cashTender': 'Pesa Haraka',
      'pos.barcode': 'Scan Barkodi',
      'pos.heldCarts': 'Maagizo Yaliyoshikiliwa',
      'pos.noHeldCarts': 'Hakuna maagizo',
      'pos.recallThis': 'Rudisha',
      'pos.discardThis': 'Tupa',
      'pos.splitCashAmount': 'Kiasi cha Pesa',
      'pos.splitMpesaAmount': 'Kiasi cha M-Pesa',
      'pos.splitMpesaPhone': 'Simu ya M-Pesa',
      'pos.completeSplit': 'Maliza Malipo ya Mgawanyiko',
      'pos.change': 'Badilisho',
      'pos.tendered': 'Iliyolipwa',
      'pos.quickAmounts': 'Kiasi Haraka',
      'pos.exact': 'Kamili',
      'pos.scanPlaceholder': 'Scan au andika barkodi / SKU...',
      'pos.lastSold': 'Bidhaa za mwisho',
      'pos.subtotal': 'Jumla ndogo',
      'pos.vat': 'VAT',
      'pos.total': 'Jumla',
    }
  };
  const val = posTranslations[locale]?.[path] || posTranslations.en?.[path] || path;
  return val;
}

// ============================================
// QUICK KEYS CONFIG - Popular items for fast access
// ============================================
const QUICK_KEY_PRESETS = [
  { label: 'KES 50', type: 'amount' as const, amount: 50 },
  { label: 'KES 100', type: 'amount' as const, amount: 100 },
  { label: 'KES 200', type: 'amount' as const, amount: 200 },
  { label: 'KES 500', type: 'amount' as const, amount: 500 },
  { label: 'KES 1000', type: 'amount' as const, amount: 1000 },
  { label: 'KES 2000', type: 'amount' as const, amount: 2000 },
  { label: 'KES 5000', type: 'amount' as const, amount: 5000 },
  { label: '×2 Qty', type: 'multiply' as const },
  { label: '×3 Qty', type: 'multiply' as const },
  { label: '×5 Qty', type: 'multiply' as const },
  { label: '×10 Qty', type: 'multiply' as const },
  { label: 'Discount', type: 'discount' as const },
];

export default function POSView({
  locale, products, cart, setCart,
  showBuyerFields, setShowBuyerFields, buyerPin, setBuyerPin, buyerName, setBuyerName,
  paymentMethod, setPaymentMethod, mpesaPhone, setMpesaPhone,
  selectedCustomer, setSelectedCustomer,
  onGenerateInvoice, onInitiateMpesa, onValidatePin, onToast
}: POSViewProps) {

  // POS tabs
  const [posTab, setPosTab] = useState<'grid' | 'quick' | 'recent'>('grid');
  const [posSearch, setPosSearch] = useState('');

  // Hold/Recall
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [holdName, setHoldName] = useState('');

  // Quick Cash Tender
  const [showCashTender, setShowCashTender] = useState(false);
  const [cashTendered, setCashTendered] = useState('');

  // Split Payment
  const [showSplitPay, setShowSplitPay] = useState(false);
  const [splitCash, setSplitCash] = useState('');
  const [splitMpesa, setSplitMpesa] = useState('');
  const [splitMpesaPhone, setSplitMpesaPhone] = useState('');

  // Barcode scanner
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcode, setShowBarcode] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Recent items (track items added to cart)
  const [recentItemIds, setRecentItemIds] = useState<string[]>([]);

  // Cart calculations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const e = prev.find(i => i.product.id === product.id);
      return e ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { product, quantity: 1 }];
    });
    // Track recent items
    setRecentItemIds(prev => {
      const filtered = prev.filter(id => id !== product.id);
      return [product.id, ...filtered].slice(0, 12);
    });
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(i => i.product.id !== productId));
  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const cartSubtotal = cart.reduce((sum, i) => sum + i.product.unitPrice * i.quantity, 0);
  const cartVat = cart.reduce((sum, i) => sum + (i.product.unitPrice * i.quantity * i.product.vatRate / 100), 0);
  const cartTotal = cartSubtotal + cartVat;

  // Filter products
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(posSearch.toLowerCase()) ||
    p.itemCode?.toLowerCase().includes(posSearch.toLowerCase())
  );
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Recent products (based on what was recently added)
  const recentProducts = recentItemIds
    .map(id => products.find(p => p.id === id))
    .filter((p): p is Product => !!p);

  // Barcode scanner handler
  useEffect(() => {
    if (!showBarcode || !barcodeInput) return;
    // Try to find product by SKU, itemCode, or name match
    const found = products.find(p =>
      p.sku?.toLowerCase() === barcodeInput.toLowerCase() ||
      p.itemCode?.toLowerCase() === barcodeInput.toLowerCase() ||
      p.name.toLowerCase() === barcodeInput.toLowerCase()
    );
    if (found) {
      addToCart(found);
      onToast(`Added: ${found.name}`, 'success');
      setBarcodeInput('');
    }
  }, [barcodeInput, products, showBarcode]);

  // Hold cart
  const holdCurrentCart = () => {
    if (cart.length === 0) return;
    const name = holdName || `Order #${heldCarts.length + 1}`;
    setHeldCarts(prev => [...prev, {
      id: `hold-${Date.now()}`,
      name,
      items: [...cart],
      total: cartTotal,
      createdAt: new Date()
    }]);
    setCart([]);
    setHoldName('');
    onToast(`Cart held as "${name}"`, 'success');
  };

  // Recall cart
  const recallCart = (heldCart: HeldCart) => {
    if (cart.length > 0) {
      // Current cart has items - hold it first
      const name = `Auto-hold #${heldCarts.length + 1}`;
      setHeldCarts(prev => [...prev, {
        id: `hold-${Date.now()}`,
        name,
        items: [...cart],
        total: cartTotal,
        createdAt: new Date()
      }]);
    }
    setCart(heldCart.items);
    setHeldCarts(prev => prev.filter(h => h.id !== heldCart.id));
    setShowRecallModal(false);
    onToast(`Recalled "${heldCart.name}"`, 'success');
  };

  // Discard held cart
  const discardHeldCart = (id: string) => {
    setHeldCarts(prev => prev.filter(h => h.id !== id));
    onToast('Held order discarded', 'warning');
  };

  // Quick cash tender calculation
  const cashChange = cashTendered ? parseFloat(cashTendered) - cartTotal : 0;
  const quickCashAmounts = [
    cartTotal > 0 ? Math.ceil(cartTotal / 50) * 50 : 0,
    cartTotal > 0 ? Math.ceil(cartTotal / 100) * 100 : 0,
    cartTotal > 0 ? Math.ceil(cartTotal / 500) * 500 : 0,
    500, 1000, 2000, 5000
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i).sort((a, b) => a - b).slice(0, 6);

  // Split payment validation
  const splitCashVal = parseFloat(splitCash) || 0;
  const splitMpesaVal = parseFloat(splitMpesa) || 0;
  const splitTotal = splitCashVal + splitMpesaVal;
  const splitValid = Math.abs(splitTotal - cartTotal) < 1 && splitTotal > 0;

  return (
    <div className="pos-grid">
      {/* LEFT: Product Selection Area */}
      <div className="space-y-3 overflow-y-auto">
        {/* Search + Barcode toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder={t(locale, 'pos.searchProducts')} value={posSearch} onChange={e => setPosSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button
            onClick={() => { setShowBarcode(!showBarcode); setTimeout(() => barcodeRef.current?.focus(), 100); }}
            className={`px-3 py-2.5 rounded-lg border text-sm flex items-center gap-1.5 transition ${showBarcode ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
            title="Barcode Scanner"
          >
            <Barcode className="w-4 h-4" />
          </button>
        </div>

        {/* Barcode Scanner Input */}
        {showBarcode && (
          <div className="bg-card border-2 border-primary/30 rounded-lg p-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <Barcode className="w-5 h-5 text-primary animate-pulse" />
            <input
              ref={barcodeRef}
              type="text"
              placeholder={t(locale, 'pos.scanPlaceholder')}
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && barcodeInput) {
                  const found = products.find(p =>
                    p.sku?.toLowerCase() === barcodeInput.toLowerCase() ||
                    p.itemCode?.toLowerCase() === barcodeInput.toLowerCase() ||
                    p.name.toLowerCase() === barcodeInput.toLowerCase()
                  );
                  if (found) {
                    addToCart(found);
                    onToast(`Scanned: ${found.name}`, 'success');
                  } else {
                    onToast(`No product found for "${barcodeInput}"`, 'error');
                  }
                  setBarcodeInput('');
                }
              }}
              className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              autoFocus
            />
            <button onClick={() => { setShowBarcode(false); setBarcodeInput(''); }} className="p-1.5 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setPosSearch(posSearch === cat ? '' : cat || '')}
              className={`px-3 py-1 text-xs rounded-full border transition ${posSearch === cat ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Tab Switcher: Grid | Quick Keys | Recent */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[
            { key: 'grid' as const, label: t(locale, 'pos.grid'), icon: <Package className="w-3.5 h-3.5" /> },
            { key: 'quick' as const, label: t(locale, 'pos.quickKeys'), icon: <Zap className="w-3.5 h-3.5" /> },
            { key: 'recent' as const, label: t(locale, 'pos.recent'), icon: <Clock className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setPosTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md font-medium transition ${posTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* === GRID TAB: All Products === */}
        {posTab === 'grid' && (
          products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t(locale, 'pos.noProducts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <button key={product.id} onClick={() => addToCart(product)}
                  className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all active:scale-[0.97] group">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm truncate flex-1">{product.name}</p>
                    {product.quantity <= product.reorderLevel && <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0 ml-1" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{product.sku || product.itemCode}</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className="text-primary font-bold">{formatCurrency(product.unitPrice)}</p>
                    <p className="text-[10px] text-muted-foreground">{product.quantity} left</p>
                  </div>
                  <div className="mt-1.5 h-0.5 bg-muted rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((product.quantity / (product.reorderLevel * 5)) * 100, 100)}%` }} />
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* === QUICK KEYS TAB === */}
        {posTab === 'quick' && (
          <div className="space-y-4">
            {/* Speed Buttons for Products (top sellers) */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Sellers</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {products.slice(0, 8).map(product => (
                  <button key={product.id} onClick={() => addToCart(product)}
                    className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center hover:bg-primary/20 active:scale-95 transition-all">
                    <p className="font-semibold text-xs truncate">{product.name}</p>
                    <p className="text-primary font-bold text-sm mt-1">{formatCurrency(product.unitPrice)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Amount/Qty Keys */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h3>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_KEY_PRESETS.map((preset, i) => (
                  <button key={i}
                    onClick={() => {
                      if (preset.type === 'multiply' && cart.length > 0) {
                        // Multiply quantity of last cart item
                        const multiplier = parseInt(preset.label.replace(/[^0-9]/g, ''));
                        const lastItem = cart[cart.length - 1];
                        if (lastItem) {
                          updateCartQty(lastItem.product.id, lastItem.quantity * (multiplier - 1) + lastItem.quantity);
                          onToast(`${lastItem.product.name} x${multiplier}`, 'success');
                        }
                      } else if (preset.type === 'discount' && cart.length > 0) {
                        onToast('Discount feature coming soon', 'warning');
                      }
                    }}
                    className="bg-card border border-border rounded-xl p-2.5 text-center hover:border-primary hover:bg-primary/5 active:scale-95 transition-all">
                    <p className="font-semibold text-xs">{preset.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === RECENT TAB === */}
        {posTab === 'recent' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t(locale, 'pos.lastSold')}</p>
            {recentProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent items yet. Start selling!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {recentProducts.map(product => (
                  <button key={product.id} onClick={() => addToCart(product)}
                    className="bg-card border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 text-left hover:border-primary hover:shadow-lg transition-all active:scale-[0.97]">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-blue-500" />
                      <p className="font-medium text-sm truncate">{product.name}</p>
                    </div>
                    <p className="text-primary font-bold">{formatCurrency(product.unitPrice)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Cart & Payment Area */}
      <div className="bg-card border border-border rounded-xl flex flex-col h-full">
        {/* Cart Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> {t(locale, 'pos.cart')}
              {cart.length > 0 && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{cart.length}</span>}
            </h2>
            {cart.length > 0 && (
              <div className="flex gap-1">
                <button onClick={() => setShowRecallModal(true)} className="px-2 py-1 text-[10px] rounded border border-border text-muted-foreground hover:border-primary flex items-center gap-1" title="Recall held orders">
                  <Play className="w-3 h-3" /> {t(locale, 'pos.recallCart')}
                  {heldCarts.length > 0 && <span className="bg-primary text-primary-foreground px-1 rounded text-[9px]">{heldCarts.length}</span>}
                </button>
                <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive">{t(locale, 'pos.clearCart')}</button>
              </div>
            )}
          </div>

          {/* Hold Cart Bar */}
          {cart.length > 0 && (
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Order name (optional)"
                value={holdName}
                onChange={e => setHoldName(e.target.value)}
                className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={holdCurrentCart}
                className="px-3 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/50 flex items-center gap-1 font-medium">
                <Pause className="w-3 h-3" /> {t(locale, 'pos.holdCart')}
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t(locale, 'pos.emptyCart')}</p>
              {heldCarts.length > 0 && (
                <button onClick={() => setShowRecallModal(true)} className="mt-3 text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
                  <Play className="w-3 h-3" /> Recall held order ({heldCarts.length})
                </button>
              )}
            </div>
          ) : cart.map(item => (
            <div key={item.product.id} className="flex items-center gap-2 bg-muted rounded-lg p-2.5 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(item.product.unitPrice)} x {item.quantity}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center rounded bg-card border border-border text-sm hover:bg-muted">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded bg-card border border-border text-sm hover:bg-muted">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <p className="font-semibold text-sm w-20 text-right">{formatCurrency(item.product.unitPrice * item.quantity)}</p>
              <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Payment Section */}
        <div className="border-t border-border p-3 space-y-2.5">
          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t(locale, 'pos.subtotal')}</span><span>{formatCurrency(cartSubtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t(locale, 'pos.vat')}</span><span>{formatCurrency(cartVat)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-1 border-t border-border"><span>{t(locale, 'pos.total')}</span><span className="text-primary">{formatCurrency(cartTotal)}</span></div>
          </div>

          {/* B2B Buyer Toggle */}
          <button onClick={() => setShowBuyerFields(!showBuyerFields)} className="w-full text-left text-xs text-primary hover:underline flex items-center gap-1">
            <ChevronRight className={`w-3 h-3 transition-transform ${showBuyerFields ? 'rotate-90' : ''}`} />{t(locale, 'pos.addBuyer')}
          </button>
          {showBuyerFields && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <div>
                <label className="text-xs text-muted-foreground">{t(locale, 'pos.buyerPin')}</label>
                <div className="flex gap-1">
                  <input type="text" value={buyerPin} onChange={e => setBuyerPin(e.target.value.toUpperCase())} placeholder="A001234567B" maxLength={11}
                    className="flex-1 px-2 py-1.5 text-sm bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={() => onValidatePin(buyerPin)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90">{t(locale, 'pos.validatePin')}</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t(locale, 'pos.buyerName')}</label>
                <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Company Name"
                  className="w-full px-2 py-1.5 text-sm bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="text-xs text-muted-foreground">{t(locale, 'pos.paymentMethod')}</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {['cash', 'mpesa', 'bank_transfer', 'credit'].map(method => (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  className={`px-3 py-2 text-xs rounded-lg border transition flex items-center justify-center gap-1.5 ${paymentMethod === method ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}>
                  {method === 'cash' && <Wallet className="w-3.5 h-3.5" />}
                  {method === 'mpesa' && <Phone className="w-3.5 h-3.5" />}
                  {method === 'bank_transfer' && <CreditCard className="w-3.5 h-3.5" />}
                  {method === 'credit' && <Hash className="w-3.5 h-3.5" />}
                  {t(locale, `pos.${method}`)}
                </button>
              ))}
            </div>
          </div>

          {/* M-Pesa STK Push */}
          {paymentMethod === 'mpesa' && (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">{t(locale, 'pos.mpesaPhone')}</label>
                <input type="tel" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} placeholder="254712345678"
                  className="w-full px-2 py-1.5 text-sm bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={onInitiateMpesa}
                className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" /> {t(locale, 'pos.initiatePayment')}
              </button>
            </div>
          )}

          {/* Advanced Payment Buttons: Quick Cash + Split Pay */}
          {cart.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => { setShowCashTender(true); setCashTendered(''); }}
                className="flex-1 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition flex items-center justify-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" /> {t(locale, 'pos.cashTender')}
              </button>
              <button onClick={() => { setShowSplitPay(true); setSplitCash(''); setSplitMpesa(''); setSplitMpesaPhone(''); }}
                className="flex-1 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition flex items-center justify-center gap-1.5">
                <Divide className="w-3.5 h-3.5" /> {t(locale, 'pos.splitPay')}
              </button>
            </div>
          )}

          {/* Generate Invoice Button */}
          <button onClick={onGenerateInvoice} disabled={cart.length === 0}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
            <Receipt className="w-5 h-5" /> {t(locale, 'pos.generateInvoice')}
          </button>
        </div>
      </div>

      {/* ====== QUICK CASH TENDER MODAL ====== */}
      {showCashTender && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCashTender(false)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> {t(locale, 'pos.cashTender')}</h3>
              <button onClick={() => setShowCashTender(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(cartTotal)}</p>
            </div>
            <div className="mb-3">
              <label className="text-xs text-muted-foreground">{t(locale, 'pos.tendered')}</label>
              <input type="number" value={cashTendered} onChange={e => setCashTendered(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-3 text-xl font-bold text-center bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
            </div>
            {/* Quick amount buttons */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">{t(locale, 'pos.quickAmounts')}</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => setCashTendered(cartTotal.toString())}
                  className="py-2 text-xs bg-primary/10 border border-primary/20 rounded-lg font-semibold text-primary hover:bg-primary/20 transition">
                  {t(locale, 'pos.exact')}
                </button>
                {quickCashAmounts.map(amt => (
                  <button key={amt} onClick={() => setCashTendered(amt.toString())}
                    className="py-2 text-xs bg-muted border border-border rounded-lg font-medium hover:border-primary transition">
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>
            {cashTendered && parseFloat(cashTendered) >= cartTotal && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 mb-4 text-center">
                <p className="text-xs text-muted-foreground">{t(locale, 'pos.change')}</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(cashChange)}</p>
              </div>
            )}
            <button
              onClick={() => {
                if (parseFloat(cashTendered) >= cartTotal) {
                  setPaymentMethod('cash');
                  onGenerateInvoice();
                  setShowCashTender(false);
                  setCashTendered('');
                }
              }}
              disabled={!cashTendered || parseFloat(cashTendered) < cartTotal}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> Complete Cash Sale
            </button>
          </div>
        </div>
      )}

      {/* ====== SPLIT PAYMENT MODAL ====== */}
      {showSplitPay && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowSplitPay(false)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><Divide className="w-5 h-5 text-primary" /> {t(locale, 'pos.splitPay')}</h3>
              <button onClick={() => setShowSplitPay(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Total Due</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(cartTotal)}</p>
              {splitTotal > 0 && (
                <p className={`text-xs mt-1 ${splitValid ? 'text-emerald-600' : splitTotal > cartTotal ? 'text-red-600' : 'text-amber-600'}`}>
                  {splitValid ? '✓ Amounts match' : splitTotal > cartTotal ? `Over by ${formatCurrency(splitTotal - cartTotal)}` : `${formatCurrency(cartTotal - splitTotal)} remaining`}
                </p>
              )}
            </div>

            {/* Cash portion */}
            <div className="space-y-3 mb-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
                <label className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><Wallet className="w-3 h-3" /> {t(locale, 'pos.splitCashAmount')}</label>
                <input type="number" value={splitCash} onChange={e => setSplitCash(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 text-lg font-bold bg-transparent border-b border-emerald-300 dark:border-emerald-700 focus:outline-none focus:border-primary mt-1" />
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                <label className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {t(locale, 'pos.splitMpesaAmount')}</label>
                <input type="number" value={splitMpesa} onChange={e => setSplitMpesa(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 text-lg font-bold bg-transparent border-b border-green-300 dark:border-green-700 focus:outline-none focus:border-primary mt-1" />
                <input type="tel" value={splitMpesaPhone} onChange={e => setSplitMpesaPhone(e.target.value)} placeholder="254712345678"
                  className="w-full px-3 py-1.5 text-sm bg-transparent focus:outline-none focus:border-primary mt-2" />
              </div>
            </div>

            {/* Quick fill: half-half */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setSplitCash((cartTotal / 2).toFixed(0)); setSplitMpesa((cartTotal / 2).toFixed(0)); }}
                className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:border-primary transition">50/50</button>
              <button onClick={() => { setSplitCash(cartTotal.toString()); setSplitMpesa('0'); }}
                className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:border-primary transition">All Cash</button>
              <button onClick={() => { setSplitCash('0'); setSplitMpesa(cartTotal.toString()); }}
                className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:border-primary transition">All M-Pesa</button>
            </div>

            <button
              onClick={async () => {
                if (!splitValid) return;
                // Process split payment: first M-Pesa, then cash for remainder
                if (splitMpesaVal > 0 && splitMpesaPhone) {
                  try {
                    const res = await fetch('/api/mpesa', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'stk_push', phoneNumber: splitMpesaPhone, amount: splitMpesaVal, businessId: '', accountReference: `SPLIT-${Date.now()}`, transactionDesc: 'Sokoni Split Payment' })
                    });
                    const data = await res.json();
                    if (!data.success) { onToast(data.error || 'M-Pesa failed', 'error'); return; }
                    onToast(`M-Pesa STK push sent for ${formatCurrency(splitMpesaVal)}`, 'success');
                  } catch { onToast('M-Pesa error', 'error'); return; }
                }
                onToast(`Split payment: Cash ${formatCurrency(splitCashVal)} + M-Pesa ${formatCurrency(splitMpesaVal)}`, 'success');
                setShowSplitPay(false);
                onGenerateInvoice();
              }}
              disabled={!splitValid}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> {t(locale, 'pos.completeSplit')}
            </button>
          </div>
        </div>
      )}

      {/* ====== RECALL HELD CARTS MODAL ====== */}
      {showRecallModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowRecallModal(false)}>
          <div className="bg-card rounded-2xl w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><Pause className="w-5 h-5 text-amber-500" /> {t(locale, 'pos.heldCarts')}</h3>
              <button onClick={() => setShowRecallModal(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
            </div>
            {heldCarts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Pause className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t(locale, 'pos.noHeldCarts')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {heldCarts.map(held => (
                  <div key={held.id} className="bg-muted rounded-xl p-3 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{held.name}</p>
                        <p className="text-xs text-muted-foreground">{held.items.length} items • {held.createdAt.toLocaleTimeString()}</p>
                      </div>
                      <p className="font-bold text-primary">{formatCurrency(held.total)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => recallCart(held)}
                        className="flex-1 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-1">
                        <Play className="w-3 h-3" /> {t(locale, 'pos.recallThis')}
                      </button>
                      <button onClick={() => discardHeldCart(held.id)}
                        className="py-1.5 px-3 text-xs border border-border rounded-lg text-muted-foreground hover:text-destructive hover:border-destructive transition">
                        {t(locale, 'pos.discardThis')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
