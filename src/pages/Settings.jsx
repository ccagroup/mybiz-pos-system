import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { useLanguage } from '../contexts/LanguageContext';
import { Moon, Sun, Palette, Languages, Download, Upload, Trash2, AlertTriangle, CheckCircle, X } from 'lucide-react';

export default function Settings() {
  const { language, changeLanguage, t } = useLanguage();
  const [theme, setTheme] = useState('light');
  const [accentColor, setAccentColor] = useState('blue');
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Map of our 9 colors with their exact Tailwind shades
  const colorMap = {
    blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
    red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
    purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
    pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
    yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
    rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
    orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
    indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
    violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
  };

  const colors = [
    { name: 'Blue', value: 'blue', hex: '#2563eb' },
    { name: 'Red', value: 'red', hex: '#dc2626' },
    { name: 'Purple', value: 'purple', hex: '#9333ea' },
    { name: 'Pink', value: 'pink', hex: '#db2777' },
    { name: 'Yellow', value: 'yellow', hex: '#ca8a04' },
    { name: 'Maroon', value: 'rose', hex: '#e11d48' },
    { name: 'Orange', value: 'orange', hex: '#ea580c' },
    { name: 'Indigo', value: 'indigo', hex: '#4f46e5' },
    { name: 'Violet', value: 'violet', hex: '#7c3aed' },
  ];

  useEffect(() => {
    const loadSettings = async () => {
      const t = await db.settings.get('theme');
      const c = await db.settings.get('accentColor');
      if (t) setTheme(t.value);
      if (c) applyColor(c.value);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const applyColor = (colorKey) => {
    const shades = colorMap[colorKey];
    if (!shades) return;
    Object.keys(shades).forEach(shade => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, shades[shade]);
    });
    setAccentColor(colorKey);
    db.settings.put({ key: 'accentColor', value: colorKey });
  };

  const updateTheme = async (newTheme) => {
    await db.settings.put({ key: 'theme', value: newTheme });
    setTheme(newTheme);
  };

  // --- DATA MANAGEMENT (Same as before) ---
  const handleExport = async () => {
    const data = {};
    for (let table of db.tables) data[table.name] = await table.toArray();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mybiz-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    showSuccess('Backup downloaded successfully!');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        await db.delete(); await db.open();
        for (let tableName in data) await db.table(tableName).bulkAdd(data[tableName]);
        showSuccess('Data restored successfully! Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) { alert('Invalid backup file.'); }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    if (clearConfirmText !== 'YES') { alert('Please type YES to confirm.'); return; }
    await db.delete(); window.location.reload();
  };

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  return (
    <div className="space-y-8 pb-24 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>

      {successMsg && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* 1. Appearance */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"><Palette size={20} /> Appearance</h3>
        
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Theme Mode</p>
            <p className="text-sm text-gray-500">Switch between light and dark interface</p>
          </div>
          <button onClick={() => updateTheme(theme === 'light' ? 'dark' : 'light')} className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            {theme === 'light' ? <Moon size={20} className="text-gray-700" /> : <Sun size={20} className="text-yellow-400" />}
          </button>
        </div>

        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">Accent Color</p>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {colors.map(c => (
              <button key={c.value} onClick={() => applyColor(c.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${accentColor === c.value ? 'border-gray-900 dark:border-white scale-105' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}>
                <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: c.hex }}></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Language */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"><Languages size={20} /> Language</h3>
        <select value={language} onChange={(e) => changeLanguage(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-medium focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="en">English</option>
          <option value="sw">Kiswahili</option>
          <option value="ki">Kikuyu</option>
        </select>
      </section>

      {/* 3. Data Management */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"><Download size={20} /> Data Management</h3>
        <p className="text-sm text-gray-500 mb-6">Your data is stored locally on this device. Please back up regularly.</p>

        <div className="space-y-4">
          <button onClick={handleExport} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600"><Download size={20} /></div>
              <div className="text-left"><p className="font-bold text-gray-900 dark:text-gray-100">Backup Data</p><p className="text-xs text-gray-500">Download a JSON file</p></div>
            </div>
          </button>

          <label className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600"><Upload size={20} /></div>
              <div className="text-left"><p className="font-bold text-gray-900 dark:text-gray-100">Restore Data</p><p className="text-xs text-gray-500">Upload a backup file</p></div>
            </div>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          <button onClick={() => setShowClearModal(true)} className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600"><Trash2 size={20} /></div>
              <div className="text-left"><p className="font-bold text-red-700 dark:text-red-400">Clear All Data</p><p className="text-xs text-red-600/70 dark:text-red-400/70">Permanently delete all records</p></div>
            </div>
          </button>
        </div>
      </section>

      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-red-600 flex items-center gap-2"><AlertTriangle size={20} /> Danger Zone</h3>
              <button onClick={() => setShowClearModal(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">This will permanently delete all records. Type YES to confirm.</p>
            <input type="text" value={clearConfirmText} onChange={(e) => setClearConfirmText(e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 mb-4 font-bold uppercase" placeholder="YES" />
            <div className="flex gap-3">
              <button onClick={() => setShowClearModal(false)} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium">Cancel</button>
              <button onClick={handleClearData} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Delete Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}