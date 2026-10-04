import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [customMonth, setCustomMonth] = useState(new Date().toISOString().slice(0, 7));
  const [businessName, setBusinessName] = useState('mybiz'); // <-- NEW: Business Name State

  const transactions = useLiveQuery(() => 
    db.transactions.where('type').equals('sale').toArray()
  );

  const safeTransactions = transactions || [];

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === '3months') startDate.setMonth(now.getMonth() - 3);
    else if (period === '6months') startDate.setMonth(now.getMonth() - 6);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
    else if (period === 'custom') {
      const [year, month] = customMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      return safeTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startDate && tDate <= endDate;
      });
    }

    return safeTransactions.filter(t => new Date(t.date) >= startDate);
  }, [period, customMonth, safeTransactions]);

  const totalCash = filteredTransactions.reduce((sum, t) => sum + (t.paymentBreakdown?.cash || 0), 0);
  const totalMpesa = filteredTransactions.reduce((sum, t) => sum + (t.paymentBreakdown?.mpesa || 0), 0);
  const totalProfit = filteredTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalItems = filteredTransactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);

  const generatePDF = () => {
    const doc = new jsPDF();
    const bizName = businessName || 'mybiz';
    
    // Header
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(bizName, 14, 20); // Uses your custom name
    
    doc.setTextColor(100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sales Report`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 20);
    doc.text(`Period: ${period === 'custom' ? customMonth : period.replace('months', ' Months').replace('week', 'Week').replace('year', 'Year')}`, 14, 34);

    // Summary Box
    doc.setFillColor(240, 249, 255);
    doc.rect(14, 40, 182, 30, 'F');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(10);
    doc.text('Total Revenue', 20, 50);
    doc.text('Total Profit', 80, 50);
    doc.text('Transactions', 140, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`KES ${totalRevenue.toLocaleString()}`, 20, 60);
    doc.text(`KES ${totalProfit.toLocaleString()}`, 80, 60);
    doc.text(`${filteredTransactions.length}`, 140, 60);

    // Table
    const tableData = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.customerName || 'Walk-in',
      t.items.map(i => `${i.name} x${i.quantity}`).join(', '),
      `KES ${t.totalAmount.toLocaleString()}`,
      t.paymentMethod || 'CASH'
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['Date', 'Customer', 'Items', 'Amount', 'Method']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [240, 249, 255] }
    });

    doc.save(`${bizName}-report-${Date.now()}.pdf`);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Customer', 'Items', 'Amount', 'Method'];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.customerName || 'Walk-in',
      `"${t.items.map(i => `${i.name} x${i.quantity}`).join(', ')}"`,
      t.totalAmount,
      t.paymentMethod || 'CASH'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${businessName}-report-${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports & Analytics</h2>
        <input 
          type="text" 
          value={businessName} 
          onChange={(e) => setBusinessName(e.target.value)} 
          placeholder="Business Name for PDF"
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none" 
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: '3months', label: 'Last 3 Months' },
          { id: '6months', label: 'Last 6 Months' },
          { id: 'year', label: 'This Year' },
          { id: 'custom', label: 'Custom Month' }
        ].map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              period === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><FileText size={20} className="text-blue-600" /></div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash Revenue</p>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">KES {totalCash.toLocaleString()}</h3>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg"><FileText size={20} className="text-green-600" /></div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">M-Pesa Revenue</p>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">KES {totalMpesa.toLocaleString()}</h3>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg"><FileText size={20} className="text-emerald-600" /></div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Profit</p>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600">KES {totalProfit.toLocaleString()}</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row justify-around text-center divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700">
        <div className="py-2 md:py-0"><p className="text-xs text-gray-500">Total Transactions</p><p className="font-bold text-gray-900 dark:text-gray-100">{filteredTransactions.length}</p></div>
        <div className="py-2 md:py-0"><p className="text-xs text-gray-500">Avg. Value</p><p className="font-bold text-gray-900 dark:text-gray-100">KES {filteredTransactions.length ? Math.round(totalRevenue / filteredTransactions.length).toLocaleString() : 0}</p></div>
        <div className="py-2 md:py-0"><p className="text-xs text-gray-500">Items Sold</p><p className="font-bold text-gray-900 dark:text-gray-100">{totalItems}</p></div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Transaction Details</h3>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1">
              <Download size={14} /> CSV
            </button>
            <button onClick={generatePDF} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <Download size={14} /> PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400">No transactions found for this period.</td></tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t.customerName || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{t.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">KES {t.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        t.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' : 
                        t.paymentMethod === 'M-PESA' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>{t.paymentMethod}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}