import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Calculator, Home, ShoppingCart, Package, Users, BarChart3, FileText, CreditCard, X, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRegisterSW } from 'virtual:pwa-register/react'; // <-- NEW IMPORT

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');

  // --- NEW: PWA UPDATE LOGIC ---
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      r && setInterval(() => { r.update(); }, 60 * 60 * 1000); // Check for updates every hour
    }
  });

  const handleCalcClick = (val) => {
    if (val === 'C') { setCalcDisplay('0'); return; }
    if (val === '=') {
      try { setCalcDisplay(eval(calcDisplay).toString()); } catch { setCalcDisplay('Error'); }
      return;
    }
    if (val === 'DEL') { setCalcDisplay(calcDisplay.length > 1 ? calcDisplay.slice(0, -1) : '0'); return; }
    setCalcDisplay(calcDisplay === '0' ? val : calcDisplay + val);
  };

  const navItems = [
    { name: t('home'), path: '/', icon: Home },
    { name: t('sales'), path: '/sales', icon: ShoppingCart },
    { name: t('stock'), path: '/stock', icon: Package },
    { name: t('customer'), path: '/customer', icon: Users },
    { name: t('reports'), path: '/reports', icon: FileText },
    { name: t('analytics'), path: '/analytics', icon: BarChart3 },
    { name: t('debts'), path: '/debts', icon: CreditCard },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">mybiz</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCalculator(true)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition-colors">
            <Calculator size={20} className="text-gray-700 dark:text-gray-200" />
          </button>
          <button onClick={() => navigate('/settings')} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition-colors">
            <Settings size={20} className="text-gray-700 dark:text-gray-200" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24 max-w-7xl mx-auto w-full min-h-0">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-20 flex-shrink-0">
        <div className="flex overflow-x-auto no-scrollbar justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center min-w-[60px] py-3 px-1 transition-colors ${
                  isActive 
                    ? 'text-primary-600 dark:text-primary-400 border-t-2 border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] mt-1 font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* --- NEW: UPDATE AVAILABLE ALERT --- */}
      {needRefresh && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">New Update Available!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              We've added new features and improvements. Click below to refresh the app and get the latest version.
            </p>
            <button 
              onClick={() => updateServiceWorker(true)} 
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} /> Refresh Now
            </button>
          </div>
        </div>
      )}

      {/* CALCULATOR MODAL */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCalculator(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-gray-900 text-white text-right">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">Calculator</span>
                <button onClick={() => setShowCalculator(false)}><X size={16} /></button>
              </div>
              <div className="text-3xl font-bold truncate">{calcDisplay}</div>
            </div>
            <div className="grid grid-cols-4 gap-1 p-2 bg-gray-100 dark:bg-gray-900">
              {['C', 'DEL', '/', '*', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.'].map((btn) => (
                <button 
                  key={btn} 
                  onClick={() => handleCalcClick(btn)}
                  className={`p-4 rounded-lg font-bold text-lg transition-colors ${
                    btn === '=' ? 'bg-primary-600 text-white hover:bg-primary-700' :
                    ['/', '*', '-', '+', 'C', 'DEL'].includes(btn) ? 'bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-400' :
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50'
                  } ${btn === '0' ? 'col-span-2' : ''}`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}