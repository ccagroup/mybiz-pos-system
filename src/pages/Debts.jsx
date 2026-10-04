import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, X, CheckCircle, User, Truck, DollarSign, Calendar } from 'lucide-react';

export default function Debts() {
  // --- STATE ---
  const [activeSection, setActiveSection] = useState('customers'); // 'customers' or 'suppliers'
  
  // Customer Debt Modal
  const [payCustId, setPayCustId] = useState(null);
  const [payCustAmount, setPayCustAmount] = useState('');
  
  // Supplier Debt Modal
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', amount: '', description: '' });
  
  // Supplier Payment Modal
  const [paySuppId, setPaySuppId] = useState(null);
  const [paySuppAmount, setPaySuppAmount] = useState('');

  // --- DATA FETCHING ---
  const customersWithDebt = useLiveQuery(() => 
    db.customers.where('outstandingDebt').above(0).toArray()
  );

  const supplierDebts = useLiveQuery(() => 
    db.supplierDebts.where('amountOwed').above(0).toArray()
  );

  const safeCustomers = customersWithDebt || [];
  const safeSuppliers = supplierDebts || [];

  // --- CUSTOMER DEBT LOGIC ---
  const handleCustomerPayment = async () => {
    const amount = parseFloat(payCustAmount);
    if (!amount || amount <= 0) return;

    const customer = await db.customers.get(payCustId);
    const newDebt = Math.max(0, customer.outstandingDebt - amount);

    await db.customers.update(payCustId, { outstandingDebt: newDebt });
    await db.transactions.add({
      date: new Date(), customerId: payCustId, customerName: customer.name,
      totalAmount: amount, cogs: 0, profit: 0, paymentMethod: 'DEBT_PAYMENT', 
      type: 'debt_payment', items: []
    });

    setPayCustId(null); setPayCustAmount('');
  };

  // --- SUPPLIER DEBT LOGIC ---
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.amount) return;
    await db.supplierDebts.add({
      supplierName: supplierForm.name,
      amountOwed: parseFloat(supplierForm.amount),
      description: supplierForm.description,
      createdAt: new Date()
    });
    setSupplierForm({ name: '', amount: '', description: '' });
    setShowAddSupplier(false);
  };

  const handleSupplierPayment = async () => {
    const amount = parseFloat(paySuppAmount);
    if (!amount || amount <= 0) return;

    const debt = await db.supplierDebts.get(paySuppId);
    const newOwed = Math.max(0, debt.amountOwed - amount);

    await db.supplierDebts.update(paySuppId, { amountOwed: newOwed });
    await db.supplierPayments.add({
      debtId: paySuppId, amount: amount, date: new Date()
    });

    setPaySuppId(null); setPaySuppAmount('');
  };

  // --- UI RENDER ---
  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Debts Tracker</h2>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button onClick={() => setActiveSection('customers')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'customers' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-500'}`}>
            Customers Owe Me
          </button>
          <button onClick={() => setActiveSection('suppliers')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'suppliers' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-500'}`}>
            I Owe Suppliers
          </button>
        </div>
      </div>

      {/* SECTION 1: CUSTOMERS */}
      {activeSection === 'customers' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 text-center">
            <p className="text-sm text-gray-500 mb-1">Total Outstanding from Customers</p>
            <h3 className="text-3xl font-bold text-orange-500">
              KES {safeCustomers.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0).toLocaleString()}
            </h3>
          </div>

          {safeCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <User size={48} className="mx-auto mb-3 opacity-20" />
              <p>No customers currently owe you money. Great job!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeCustomers.map(c => (
                <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100">{c.name}</h4>
                      <p className="text-xs text-gray-500">{c.phone || 'No phone'}</p>
                    </div>
                    <span className="text-lg font-bold text-orange-500">KES {(c.outstandingDebt || 0).toLocaleString()}</span>
                  </div>
                  <button onClick={() => { setPayCustId(c.id); setPayCustAmount(''); }} 
                    className="w-full py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center justify-center gap-2">
                    <DollarSign size={16} /> Record Payment
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: SUPPLIERS */}
      {activeSection === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex-1 mr-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Owed to Suppliers</p>
              <h3 className="text-2xl font-bold text-red-500">
                KES {safeSuppliers.reduce((sum, s) => sum + (s.amountOwed || 0), 0).toLocaleString()}
              </h3>
            </div>
            <button onClick={() => setShowAddSupplier(true)} className="bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-xl shadow-sm">
              <Plus size={24} />
            </button>
          </div>

          {safeSuppliers.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <Truck size={48} className="mx-auto mb-3 opacity-20" />
              <p>No supplier debts recorded.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeSuppliers.map(s => (
                <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100">{s.supplierName}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{s.description || 'No description'}</p>
                    </div>
                    <span className="text-lg font-bold text-red-500">KES {(s.amountOwed || 0).toLocaleString()}</span>
                  </div>
                  <button onClick={() => { setPaySuppId(s.id); setPaySuppAmount(''); }} 
                    className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2 mt-3">
                    <DollarSign size={16} /> Record Payment
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Customer Payment Modal */}
      {payCustId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">Record Customer Payment</h3>
            <input type="number" placeholder="Amount received" value={payCustAmount} onChange={(e) => setPayCustAmount(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-lg font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setPayCustId(null)} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium">Cancel</button>
              <button onClick={handleCustomerPayment} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg">Add Supplier Debt</h3>
              <button onClick={() => setShowAddSupplier(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Supplier Name *</label>
                <input type="text" required value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount Owed (KES) *</label>
                <input type="number" required value={supplierForm.amount} onChange={(e) => setSupplierForm({...supplierForm, amount: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description / Items</label>
                <textarea value={supplierForm.description} onChange={(e) => setSupplierForm({...supplierForm, description: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm h-20 resize-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold">Record Debt</button>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Payment Modal */}
      {paySuppId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">Pay Supplier</h3>
            <input type="number" placeholder="Amount paid" value={paySuppAmount} onChange={(e) => setPaySuppAmount(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-lg font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setPaySuppId(null)} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium">Cancel</button>
              <button onClick={handleSupplierPayment} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}