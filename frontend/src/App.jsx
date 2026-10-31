import React, { useState, useEffect } from 'react';
import ProductCatalogView from './components/ProductCatalogView';
import SubscriptionPlansView from './components/SubscriptionPlansView';
import QuotationTemplatesView from './components/QuotationTemplatesView';
import QuotationEngineView from './components/QuotationEngineView';
import HealthCheckBadge from './components/HealthCheckBadge';
import AuthStatusCard from './components/AuthStatusCard';
import { api } from './api/client';
import { 
  Zap, 
  Package, 
  Calendar, 
  FileSpreadsheet, 
  Briefcase, 
  ShieldCheck, 
  Layers,
  Cpu,
  Database,
  User,
  LogOut,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('products');
  const [currentUser, setCurrentUser] = useState(null);

  const checkUserSession = async () => {
    try {
      const res = await api.getCurrentUser();
      setCurrentUser(res?.data || null);
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  const quickLoginAsAdmin = async () => {
    try {
      await api.login('admin@brightloop.io', 'Admin@Brightloop2026!');
      await checkUserSession();
    } catch (err) {
      console.error('Quick login failed', err);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const navItems = [
    { id: 'products', label: 'Products & Variants', icon: Package, badge: 'Phase 2' },
    { id: 'plans', label: 'Subscription Plans', icon: Calendar, badge: 'Phase 2' },
    { id: 'templates', label: 'Quotation Templates', icon: FileSpreadsheet, badge: 'Phase 2' },
    { id: 'quotations', label: 'Quotation Engine', icon: Briefcase, badge: 'Phase 2' },
    { id: 'system', label: 'Diagnostics & Auth', icon: ShieldCheck, badge: 'Core' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  SubscriptNova
                </span>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-semibold">
                  Phase 2 Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Brightloop Software • Subscription & Recurring Billing</p>
            </div>
          </div>

          {/* User Session Pill */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-300 font-medium">{currentUser.full_name}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                  {currentUser.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-rose-400 ml-1"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={quickLoginAsAdmin}
                className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition"
              >
                <User className="w-3.5 h-3.5" />
                Quick Admin Login
              </button>
            )}
          </div>
        </div>

        {/* Sub-Header Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto flex gap-1 border-t border-slate-800/60 pt-1 pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {activeTab === 'products' && <ProductCatalogView />}
        {activeTab === 'plans' && <SubscriptionPlansView />}
        {activeTab === 'templates' && <QuotationTemplatesView />}
        {activeTab === 'quotations' && <QuotationEngineView />}
        
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Phase 1 & Phase 2 System Architecture Status
              </h2>
              <p className="text-xs text-slate-400">
                Verifying active foreign key constraints, Decimal precision, JWT authentication, and RBAC endpoints.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HealthCheckBadge />
              <AuthStatusCard />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        SubscriptNova • AI-Powered Subscription & Recurring Billing Platform • Phase 2 Verified
      </footer>
    </div>
  );
}
