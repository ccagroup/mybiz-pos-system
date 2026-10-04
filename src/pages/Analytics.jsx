import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

export default function Analytics() {
  // Fetch all data
  const transactions = useLiveQuery(() => db.transactions.where('type').equals('sale').toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());

  const safeTrans = transactions || [];
  const safeCust = customers || [];

  // --- DATA PROCESSING ---
  
  // 1. Monthly Revenue vs Profit (Line Chart)
  const monthlyData = useMemo(() => {
    const grouped = {};
    safeTrans.forEach(t => {
      const month = new Date(t.date).toLocaleString('default', { month: 'short' });
      if (!grouped[month]) grouped[month] = { month, revenue: 0, profit: 0 };
      grouped[month].revenue += t.totalAmount;
      grouped[month].profit += t.profit || 0;
    });
    return Object.values(grouped);
  }, [safeTrans]);

  // 2. Payment Methods (Donut Chart)
  const paymentData = useMemo(() => {
    let cash = 0, mpesa = 0, credit = 0;
    safeTrans.forEach(t => {
      cash += t.paymentBreakdown?.cash || 0;
      mpesa += t.paymentBreakdown?.mpesa || 0;
      credit += t.paymentBreakdown?.credit || 0;
    });
    return [
      { name: 'Cash', value: cash },
      { name: 'M-Pesa', value: mpesa },
      { name: 'Credit', value: credit }
    ].filter(d => d.value > 0);
  }, [safeTrans]);

  const COLORS = ['#10b981', '#3b82f6', '#f97316']; // Green, Blue, Orange

  // 3. Top Categories by Profit (Bar Chart)
  const categoryData = useMemo(() => {
    const grouped = {};
    safeTrans.forEach(t => {
      t.items?.forEach(item => {
        // Find product to get category (simplified for demo)
        const cat = item.name.split(' ')[0] || 'Other'; 
        if (!grouped[cat]) grouped[cat] = { category: cat, profit: 0 };
        grouped[cat].profit += (item.price - item.cost) * item.quantity;
      });
    });
    return Object.values(grouped).sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [safeTrans]);

  // 4. Top Debtors
  const topDebtors = [...safeCust].sort((a, b) => (b.outstandingDebt || 0) - (a.outstandingDebt || 0)).slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Business Analytics</h2>

      {/* Row 1: Line Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Revenue vs Profit Trend</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Donut & Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Sales by Payment Method</h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Top Categories by Profit</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="category" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="profit" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Profit (KES)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Top Debtors Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Top 5 Customers with Outstanding Debt</h3>
        {topDebtors.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No outstanding debts. Excellent!</p>
        ) : (
          <div className="space-y-3">
            {topDebtors.map((c, i) => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{i + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone || 'No phone'}</p>
                  </div>
                </div>
                <span className="font-bold text-orange-500">KES {(c.outstandingDebt || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}