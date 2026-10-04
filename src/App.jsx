import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/layout/Layout';

// Import Pages
import Home from './pages/Home';
import Sales from './pages/Sales';
import Stock from './pages/Stock';
import Customer from './pages/Customer';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Debts from './pages/Debts';
import Settings from './pages/Settings';

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="sales" element={<Sales />} />
              <Route path="stock" element={<Stock />} />
              <Route path="customer" element={<Customer />} />
              <Route path="reports" element={<Reports />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="debts" element={<Debts />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </LanguageProvider>
  );
}