import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShoppingCart, AlertTriangle, CreditCard, Plus } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [hideProfit, setHideProfit] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  // --- SMART BACKUP REMINDER LOGIC ---
  useEffect(() => {
    const checkBackup = async () => {
      const lastBackup = await db.settings.get('lastBackup');
      const lastReminder = await db.settings.get('lastReminderShown');

      let daysSinceBackup = 999;
      if (lastBackup && lastBackup.value) {
        const lastDate = new Date(lastBackup.value);
        daysSinceBackup = (new Date() - lastDate) / (1000 * 60 * 60 * 24);
      }

      // Only show if 30 days have passed since the last backup
      if (daysSinceBackup >= 30) {
        let daysSinceReminder = 999;
        if (lastReminder && lastReminder.value) {
          const rDate = new Date(lastReminder.value);
          daysSinceReminder = (new Date() - rDate) / (1000 * 60 * 60 * 24);
        }
        // And only show if we haven't shown it in the last 30 days
        if (daysSinceReminder >= 30) {
          setShowBackupReminder(true);
        }
      }
    };
    checkBackup();
  }, []);

  const dismissReminder = async () => {
    setShowBackupReminder(false);
    // Save today's date so it doesn't show again for 30 days
    await db.settings.put({ key: 'lastReminderShown', value: new Date().toISOString() });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayTransactions = useLiveQuery(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return db.transactions.where('date').aboveOrEqual(today).toArray();
  });

  const todayExpenses = useLiveQuery(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return db.expenses.where('date').aboveOrEqual(today).toArray();
  });

  const lowStockItems = useLiveQuery(() => db.variants.where('stockQuantity').belowOrEqual(5).toArray());

  const totalDebt = useLiveQuery(() => db.customers.toArray().then(c => c.reduce((s, c) => s + (c.outstandingDebt || 0), 0)));

  const totalRevenue = todayTransactions?.reduce((s, t) => s + t.totalAmount, 0) || 0;
  const totalCOGS = todayTransactions?.reduce((s, t) => s + (t.cogs || 0), 0) || 0;
  const totalExpenses = todayExpenses?.reduce((s, e) => s + e.amount, 0) || 0;
  const netProfit = (totalRevenue - totalCOGS) - totalExpenses;

  return (
    <div className="space-y-6">
      {showBackupReminder && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-600 flex-shrink-0" size={20} />
            <div>
              <p className="font-bold text-orange-800 dark:text-orange-400 text-sm">Time for a Monthly Backup!</p>
              <p className="text-xs text-orange-700 dark:text-orange-500">Keep your business data safe.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => navigate('/settings')} className="flex-1 md:flex-none px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700">Back Up Now</button>
            <button onClick={dismissReminder} className="flex-1 md:flex-none px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700">Dismiss</button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{getGreeting()}, Seller! 👋</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here is your business overview for today.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Net Profit</p>
            <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">{hideProfit ? '****' : `KES ${netProfit.toLocaleString()}`}</h3>
          </div>
          <button onClick={() => setHideProfit(!hideProfit)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
            {hideProfit ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className="flex gap-6 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div><p className="text-xs text-gray-500">Revenue</p><p className="text-lg font-semibold">KES {totalRevenue.toLocaleString()}</p></div>
          <div><p className="text-xs text-gray-500">Expenses</p><p className="text-lg font-semibold text-red-500">KES {totalExpenses.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button onClick={() => navigate('/reports')} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-left">
          <ShoppingCart size={20} className="text-primary-600 mb-2" />
          <p className="text-xs text-gray-500">Today's Sales</p>
          <p className="text-xl font-bold">{todayTransactions?.length || 0}</p>
        </button>
        <button onClick={() => navigate('/debts')} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-left">
          <CreditCard size={20} className="text-orange-500 mb-2" />
          <p className="text-xs text-gray-500">Outstanding Debt</p>
          <p className="text-xl font-bold">KES {(totalDebt || 0).toLocaleString()}</p>
        </button>
        <button onClick={() => navigate('/stock')} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-left col-span-2 md:col-span-1">
          <AlertTriangle size={20} className="text-red-500 mb-2" />
          <p className="text-xs text-gray-500">Low Stock Items</p>
          <p className="text-xl font-bold">{lowStockItems?.length || 0}</p>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
        {(!todayTransactions || todayTransactions.length === 0) ? (
          <p className="text-center text-gray-400 py-8">No sales yet today.</p>
        ) : (
          <div className="space-y-3">
            {todayTransactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div><p className="font-medium">{t.customerName || 'Walk-in'}</p><p className="text-xs text-gray-500">{t.paymentMethod}</p></div>
                <p className="font-bold">KES {t.totalAmount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => navigate('/sales')} className="fixed bottom-24 right-6 bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-lg z-30">
        <Plus size={24} />
      </button>
    </div>
  );
}