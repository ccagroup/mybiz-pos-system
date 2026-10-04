import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, X, Banknote, Smartphone, CreditCard } from 'lucide-react';

export default function Sales() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerType, setCustomerType] = useState('walkin');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  
  // Split Payment State
  const [cashPaid, setCashPaid] = useState(0);
  const [mpesaPaid, setMpesaPaid] = useState(0);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Variant Selection Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [chosenVariantId, setChosenVariantId] = useState(null);
  const [variantQty, setVariantQty] = useState(1);

  // Fetch products and variants
  const products = useLiveQuery(async () => {
    const allProducts = await db.products.toArray();
    const allVariants = await db.variants.toArray();
    return allProducts.map(prod => {
      const prodVariants = allVariants.filter(v => v.productId === prod.id && v.stockQuantity > 0);
      return { ...prod, variants: prodVariants };
    }).filter(p => !p.isDeleted && p.variants.length > 0);
  });

  const customers = useLiveQuery(() => db.customers.toArray());
  const safeProducts = products || [];
  const safeCustomers = customers || [];

  const categories = ['All', ...new Set(safeProducts.map(p => p.category).filter(Boolean))];

  const filteredProducts = safeProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // --- CART LOGIC ---
  const addToCartFromModal = () => {
    if (!chosenVariantId) return;
    const variant = selectedProduct.variants.find(v => v.id === chosenVariantId);
    if (variantQty > variant.stockQuantity) { alert(`Only ${variant.stockQuantity} left!`); return; }

    const existingItem = cart.find(item => item.variantId === chosenVariantId);
    if (existingItem) {
      if (existingItem.quantity + variantQty <= variant.stockQuantity) {
        setCart(cart.map(item => item.variantId === chosenVariantId ? { ...item, quantity: item.quantity + variantQty } : item));
      } else { alert('Not enough stock!'); return; }
    } else {
      setCart([...cart, { 
        variantId: variant.id, productId: selectedProduct.id, 
        name: `${selectedProduct.name} (${variant.color}, ${variant.size})`, 
        price: selectedProduct.sellingPrice, cost: selectedProduct.costPrice,
        quantity: variantQty, maxStock: variant.stockQuantity
      }]);
    }
    setSelectedProduct(null); setChosenVariantId(null); setVariantQty(1);
  };

  const updateCartQuantity = (variantId, delta) => {
    setCart(cart.map(item => {
      if (item.variantId === variantId) {
        const newQty = item.quantity + delta;
        return newQty > 0 && newQty <= item.maxStock ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (variantId) => setCart(cart.filter(item => item.variantId !== variantId));
  const clearCart = () => setCart([]);

  // --- CALCULATIONS ---
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalCOGS = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const totalPaidInstantly = (Number(cashPaid) || 0) + (Number(mpesaPaid) || 0);
  const creditAmount = Math.max(0, subtotal - totalPaidInstantly);
  const changeDue = totalPaidInstantly > subtotal ? totalPaidInstantly - subtotal : 0;

  // --- CHECKOUT LOGIC ---
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (totalPaidInstantly > subtotal) { alert("Paid amount cannot exceed total sale amount!"); return; }
    
    // If there is debt, we MUST have a named customer
    if (creditAmount > 0 && customerType === 'walkin' && !newCustomerName.trim()) {
      alert('Please enter a customer name to record the remaining debt.');
      return;
    }

    setIsProcessing(true);
    let finalCustomerId = selectedCustomerId;
    let finalCustomerName = 'Walk-in Customer';

    if (customerType === 'saved' && selectedCustomerId) {
      finalCustomerName = safeCustomers.find(c => c.id === selectedCustomerId).name;
    } else if (creditAmount > 0 && customerType === 'walkin') {
      finalCustomerId = await db.customers.add({
        name: newCustomerName, phone: '', isBlocked: false, createdAt: new Date(), outstandingDebt: creditAmount
      });
      finalCustomerName = newCustomerName;
    }

    // 1. Save Transaction
    await db.transactions.add({
      date: new Date(), customerId: finalCustomerId, customerName: finalCustomerName,
      totalAmount: subtotal, cogs: totalCOGS, profit: subtotal - totalCOGS, 
      paymentMethod: creditAmount > 0 ? 'MIXED' : (mpesaPaid > 0 ? 'M-PESA' : 'CASH'),
      paymentBreakdown: { cash: Number(cashPaid), mpesa: Number(mpesaPaid), credit: creditAmount },
      type: 'sale', items: cart
    });

    // 2. Update Stock
    for (const item of cart) {
      await db.variants.update(item.variantId, { stockQuantity: item.maxStock - item.quantity });
    }

    // 3. Update Customer Debt (if any)
    if (creditAmount > 0 && finalCustomerId) {
      const cust = await db.customers.get(finalCustomerId);
      await db.customers.update(finalCustomerId, { outstandingDebt: (cust.outstandingDebt || 0) + creditAmount });
    }

    setIsProcessing(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      setShowSuccess(false); setShowCheckout(false); setCart([]);
      setCashPaid(0); setMpesaPaid(0); setCustomerType('walkin'); setSelectedCustomerId(null);
      setNewCustomerName('');
    }, 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-4">
      {/* LEFT: Product Picker */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map(product => (
              <div key={product.id} onClick={() => { setSelectedProduct(product); setChosenVariantId(product.variants[0]?.id || null); setVariantQty(1); }}
                   className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:border-primary-500 hover:shadow-md transition-all cursor-pointer bg-gray-50 dark:bg-gray-900">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{product.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{product.variants.length} variant(s) in stock</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="font-bold text-primary-600 dark:text-primary-400 text-sm">KES {product.sellingPrice.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && <p className="text-center text-gray-400 mt-8">No products found.</p>}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="w-full lg:w-96 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col shadow-lg">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><ShoppingCart size={18} /> Current Order</h3>
          {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 font-medium">Clear All</button>}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-12"><ShoppingCart size={48} className="mx-auto mb-3 opacity-20" /><p className="text-sm">Cart is empty</p></div>
          ) : (
            cart.map(item => (
              <div key={item.variantId} className="flex justify-between items-start bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <div className="flex-1"><p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{item.name}</p><p className="text-xs text-gray-500">KES {item.price.toLocaleString()} each</p></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateCartQuantity(item.variantId, -1)} className="p-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><Minus size={14} /></button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.variantId, 1)} className="p-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><Plus size={14} /></button>
                  <button onClick={() => removeFromCart(item.variantId)} className="p-1 text-red-400 hover:text-red-600 ml-2"><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
          <div className="flex justify-between mb-4 text-lg font-bold text-gray-900 dark:text-gray-100"><span>Total</span><span>KES {subtotal.toLocaleString()}</span></div>
          <button disabled={cart.length === 0} onClick={() => setShowCheckout(true)} className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-bold">Proceed to Checkout</button>
        </div>
      </div>

      {/* VARIANT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div><h3 className="font-bold text-lg">{selectedProduct.name}</h3><p className="text-sm text-primary-600 font-semibold">KES {selectedProduct.sellingPrice.toLocaleString()}</p></div>
              <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 uppercase">Select Available Variant:</p>
              <div className="space-y-2">
                {selectedProduct.variants.map(variant => (
                  <button key={variant.id} onClick={() => { setChosenVariantId(variant.id); setVariantQty(1); }}
                    className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all ${chosenVariantId === variant.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-500' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="text-left"><span className="font-medium capitalize">{variant.color}</span><span className="text-gray-400 mx-2">|</span><span className="font-medium uppercase">{variant.size}</span></div>
                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">{variant.stockQuantity} left</span>
                  </button>
                ))}
              </div>
              {chosenVariantId && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Quantity</p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setVariantQty(Math.max(1, variantQty - 1))} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700"><Minus size={20} /></button>
                    <span className="text-xl font-bold w-8 text-center">{variantQty}</span>
                    <button onClick={() => { const max = selectedProduct.variants.find(v => v.id === chosenVariantId).stockQuantity; if (variantQty < max) setVariantQty(variantQty + 1); }} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700"><Plus size={20} /></button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button onClick={addToCartFromModal} disabled={!chosenVariantId} className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-bold">Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL (SPLIT PAYMENT) */}
      {showCheckout && !showSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg">Checkout</h3>
              <button onClick={() => setShowCheckout(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Customer Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Customer</label>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setCustomerType('walkin')} className={`flex-1 py-2 text-sm rounded-lg border ${customerType === 'walkin' ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'border-gray-200 dark:border-gray-700'}`}>Walk-in</button>
                  <button onClick={() => setCustomerType('saved')} className={`flex-1 py-2 text-sm rounded-lg border ${customerType === 'saved' ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'border-gray-200 dark:border-gray-700'}`}>Saved Customer</button>
                </div>
                {customerType === 'saved' ? (
                  <select value={selectedCustomerId || ''} onChange={(e) => setSelectedCustomerId(Number(e.target.value))} className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
                    <option value="">Select a customer...</option>
                    {safeCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : creditAmount > 0 && (
                  <input type="text" placeholder="Enter name for credit customer" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className="w-full p-2 rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-sm" />
                )}
              </div>

              {/* Split Payment Inputs */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Payment Breakdown</label>
                <div className="space-y-3">
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="number" placeholder="Cash Paid" value={cashPaid || ''} onChange={(e) => setCashPaid(Math.max(0, Number(e.target.value)))} className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
                  </div>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="number" placeholder="M-Pesa Paid" value={mpesaPaid || ''} onChange={(e) => setMpesaPaid(Math.max(0, Number(e.target.value)))} className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
                  </div>
                  
                  {/* Live Summary Box */}
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Total Sale:</span><span className="font-bold">KES {subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Paid Instantly:</span><span className="font-bold text-green-600">KES {totalPaidInstantly.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Remaining Debt:</span>
                      <span className={`font-bold ${creditAmount > 0 ? 'text-orange-500' : 'text-gray-900 dark:text-gray-100'}`}>KES {creditAmount.toLocaleString()}</span>
                    </div>
                    {changeDue > 0 && (
                      <div className="flex justify-between text-sm pt-2 border-t border-dashed border-gray-300 dark:border-gray-600">
                        <span className="font-semibold text-blue-600">Change Due:</span>
                        <span className="font-bold text-blue-600">KES {changeDue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={handleCompleteSale} disabled={isProcessing || totalPaidInstantly > subtotal}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-2">
                {isProcessing ? 'Processing...' : <><CheckCircle size={20} /> Complete Sale</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS OVERLAY */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Sale Completed!</h3>
            <p className="text-gray-500">Stock updated and transaction saved.</p>
          </div>
        </div>
      )}
    </div>
  );
}