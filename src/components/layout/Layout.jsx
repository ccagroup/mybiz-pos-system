import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Calculator, Home, ShoppingCart, Package, Users, BarChart3, FileText, CreditCard, X, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      r && setInterval(() => { r.update(); }, 60 * 60 * 1000);
    }
  });

  // Track if user has already dismissed/refreshed this version
  useEffect(() => {
    const dismissedVersion = localStorage.getItem('dismissedUpdateVersion');
    const currentVersion = needRefresh ? 'v' + Date.now() : null;
    
    if (needRefresh && dismissedVersion !== currentVersion) {
      setShowUpdateBanner(true);
    } else {
      setShowUpdateBanner(false);
    }
  }, [needRefresh]);

  const handleRefreshApp = async () => {
    localStorage.setItem('dismissedUpdateVersion', 'refreshed-' + Date.now());
    setShowUpdateBanner(false);
    await updateServiceWorker(true);
    setTimeout(() => {
      window.location.href = window.location.origin + '?t=' + Date.now();
    }, 300);
  };

  const handleDismissUpdate = () => {
    localStorage.setItem('dismissedUpdateVersion', 'dismissed-' + Date.now());
    setShowUpdateBanner(false);
  };

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

      {showUpdateBanner && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 p-3 flex flex-col md:flex-row justify-between items-center gap-3 z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <RefreshCw className="text-blue-600 flex-shrink-0 animate-spin" size={20} />
            <div>
              <p className="font-bold text-blue-800 dark:text-blue-400 text-sm">New Update Available!</p>
              <p className="text-xs text-blue-700 dark:text-blue-500">Click refresh to get the latest features.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={handleRefreshApp} className="flex-1 md:flex-none px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
              Refresh Now
            </button>
            <button onClick={handleDismissUpdate} className="flex-1 md:flex-none px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Later
            </button>
          </div>
        </div>
      )}

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