import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Search, Filter, Phone, User, Ban, Trash2, Edit3, Eye, DollarSign, X, CheckCircle } from 'lucide-react';

export default function Customer() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'debt', 'blocked'
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  // Form state
  const [formData, setFormData] = useState({ id: null, name: '', phone: '', description: '' });

  // Fetch customers (excluding soft-deleted ones)
  const customers = useLiveQuery(async () => {
    const all = await db.customers.toArray();
    return all.filter(c => !c.isDeleted);
  });

  const safeCustomers = customers || [];

  // Filter and Search Logic
  const filteredCustomers = safeCustomers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone?.includes(searchQuery);
    if (filterType === 'debt') return matchesSearch && (c.outstandingDebt || 0) > 0;
    if (filterType === 'blocked') return matchesSearch && c.isBlocked;
    return matchesSearch;
  });

  // Handle Add/Edit Save
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (formData.id) {
      await db.customers.update(formData.id, { name: formData.name, phone: formData.phone, description: formData.description });
    } else {
      await db.customers.add({
        name: formData.name, phone: formData.phone, description: formData.description,
        isBlocked: false, outstandingDebt: 0, createdAt: new Date()
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ id: null, name: '', phone: '', description: '' });
    setShowAddModal(false);
  };

  const openEdit = (customer) => {
    setFormData({ id: customer.id, name: customer.name, phone: customer.phone, description: customer.description });
    setShowAddModal(true);
  };

  const toggleBlock = async (customer) => {
    await db.customers.update(customer.id, { isBlocked: !customer.isBlocked });
  };

  const softDelete = async (id) => {
    if (window.confirm('Hide this customer? Their transaction history will be kept.')) {
      await db.customers.update(id, { isDeleted: true });
    }
  };

  // Detail View & Payment Logic
  const openDetail = async (customer) => {
    const history = await db.transactions.where('customerId').equals(customer.id).toArray();
    setSelectedCustomer({ ...customer, history: history.sort((a, b) => b.date - a.date) });
    setShowDetailModal(true);
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    const newDebt = Math.max(0, (selectedCustomer.outstandingDebt || 0) - amount);
    
    await db.customers.update(selectedCustomer.id, { outstandingDebt: newDebt });
    await db.transactions.add({
      date: new Date(), customerId: selectedCustomer.id, customerName: selectedCustomer.name,
      totalAmount: amount, cogs: 0, profit: 0, paymentMethod: 'DEBT_PAYMENT', type: 'debt_payment', items: []
    });

    // Refresh detail view
    const updated = await db.customers.get(selectedCustomer.id);
    const history = await db.transactions.where('customerId').equals(selectedCustomer.id).toArray();
    setSelectedCustomer({ ...updated, history: history.sort((a, b) => b.date - a.date) });
    
    setPayAmount('');
    setShowPayModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customers</h2>
        <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium">
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['all', 'debt', 'blocked'].map(type => (
            <button key={type} onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                filterType === type ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}>
              {type === 'all' ? 'All Customers' : type === 'debt' ? 'Owe Money' : 'Blocked'}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No customers found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(c)}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{c.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {c.phone || 'No phone'}</p>
                  </div>
                </div>
                {c.isBlocked && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">BLOCKED</span>}
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500">Outstanding Debt</p>
                  <p className={`font-bold ${c.outstandingDebt > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                    KES {(c.outstandingDebt || 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"><Edit3 size={14} /></button>
                  <button onClick={() => toggleBlock(c)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"><Ban size={14} /></button>
                  <button onClick={() => softDelete(c.id)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg">{formData.id ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCustomer} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description / Notes</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm h-20 resize-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold">Save Customer</button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAIL MODAL */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">{selectedCustomer.name}</h3>
                <p className="text-sm text-gray-500">{selectedCustomer.phone || 'No phone'}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              {/* Debt Summary */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">KES {(selectedCustomer.outstandingDebt || 0).toLocaleString()}</p>
                </div>
                {(selectedCustomer.outstandingDebt || 0) > 0 && (
                  <button onClick={() => setShowPayModal(true)} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                    <DollarSign size={16} /> Settle Debt
                  </button>
                )}
              </div>

              {/* History */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><Eye size={18} /> Transaction History</h4>
                {selectedCustomer.history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No transactions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.history.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{t.type.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()} • {t.paymentMethod}</p>
                        </div>
                        <span className={`font-bold ${t.type === 'sale' ? 'text-gray-900 dark:text-gray-100' : 'text-green-600'}`}>
                          {t.type === 'sale' ? '-' : '+'} KES {t.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAY DEBT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">Record Payment</h3>
            <p className="text-sm text-gray-500 mb-4">Total owed: <span className="font-bold text-orange-600">KES {(selectedCustomer.outstandingDebt || 0).toLocaleString()}</span></p>
            <input type="number" placeholder="Amount received" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-lg font-bold mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowPayModal(false)} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium">Cancel</button>
              <button onClick={handleRecordPayment} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}