import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  TrendingUp,
  Users,
  RefreshCw,
  Package,
  Receipt,
  DollarSign,
  AlertTriangle,
  Brain,
  ShieldCheck,
  ArrowUpRight,
  PlusCircle,
  CreditCard,
  Briefcase,
  Clock,
  ChevronRight,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboardView({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [scanningOverdue, setScanningOverdue] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminOverview();
      setData(res?.data || null);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
      setError(err?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleScanOverdue = async () => {
    setScanningOverdue(true);
    try {
      const res = await api.scanOverdueInvoices();
      showToast(res?.message || 'Overdue scan completed.', 'success');
      await loadData();
    } catch (err) {
      showToast(err?.message || 'Overdue scan failed.', 'error');
    } finally {
      setScanningOverdue(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
          <Activity className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <p className="text-sm text-slate-400">Loading Enterprise Operations Dashboard...</p>
      </div>
    );
  }

  const {
    as_of_date,
    total_customers,
    active_subscriptions,
    total_products,
    current_mrr,
    total_invoiced_amount,
    total_collected_amount,
    total_outstanding_amount,
    overdue_invoices_count,
    overdue_amount,
    portfolio_churn_rate_pct,
    high_risk_customers_count,
    recent_activity
  } = data || {};

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 ${
          toastMessage.type === 'error'
            ? 'bg-rose-950/90 border-rose-800 text-rose-200'
            : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
                <Activity className="w-5 h-5 text-indigo-400" />
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Enterprise Operations Dashboard
              </h1>
              <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Consolidated subscription metrics, revenue collections, overdue aging, and AI machine-learning portfolio churn analytics.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleScanOverdue}
              disabled={scanningOverdue}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
              title="Scan and mark past-due invoices as overdue"
            >
              <Clock className={`w-3.5 h-3.5 ${scanningOverdue ? 'animate-spin' : ''}`} />
              <span>{scanningOverdue ? 'Scanning...' : 'Scan Overdue'}</span>
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 8 Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customers */}
        <div 
          onClick={() => onNavigate && onNavigate('customers')}
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/40 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Customers</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/20 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-white font-mono">{total_customers || 0}</span>
            <span className="text-[11px] text-slate-400">client accounts</span>
          </div>
          <p className="text-[11px] text-indigo-400 flex items-center gap-1">
            <span>Manage Directory</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div 
          onClick={() => onNavigate && onNavigate('subscriptions')}
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/40 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Subscriptions</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600/20 transition">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-emerald-400 font-mono">{active_subscriptions || 0}</span>
            <span className="text-[11px] text-slate-400">contracts</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Lifecycle state: <span className="text-emerald-300 font-semibold">Active</span>
          </p>
        </div>

        {/* Card 3: Total Products */}
        <div 
          onClick={() => onNavigate && onNavigate('products')}
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/40 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Product Catalog</span>
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/20 transition">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-white font-mono">{total_products || 0}</span>
            <span className="text-[11px] text-slate-400">catalog items</span>
          </div>
          <p className="text-[11px] text-blue-400 flex items-center gap-1">
            <span>View Catalog & Variants</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 4: Monthly Recurring Revenue (MRR) */}
        <div 
          onClick={() => onNavigate && onNavigate('ai_analytics')}
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/40 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Monthly Run-Rate (MRR)</span>
            <div className="w-7 h-7 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-600/20 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-purple-300 font-mono">
              ${Number(current_mrr || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Normalized across all plans
          </p>
        </div>

        {/* Card 5: Total Invoiced */}
        <div 
          onClick={() => onNavigate && onNavigate('invoices')}
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/40 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Invoiced</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/20 transition">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-white font-mono">
              ${Number(total_invoiced_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Gross billing volume
          </p>
        </div>

        {/* Card 6: Collected Payments */}
        <div 
          onClick={() => onNavigate && onNavigate('payments')}
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/40 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Collected Payments</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600/20 transition">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              ${Number(total_collected_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Settled collections
          </p>
        </div>

        {/* Card 7: Outstanding Payments */}
        <div 
          onClick={() => onNavigate && onNavigate('invoices')}
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-amber-500/40 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Outstanding Receivables</span>
            <div className="w-7 h-7 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-600/20 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-amber-400 font-mono">
              ${Number(total_outstanding_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Pending settlement
          </p>
        </div>

        {/* Card 8: Overdue Invoices */}
        <div 
          onClick={() => onNavigate && onNavigate('invoices')}
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-rose-500/40 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Overdue Invoices</span>
            <div className="w-7 h-7 rounded-lg bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-600/20 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-rose-400 font-mono">{overdue_invoices_count || 0}</span>
            <span className="text-[11px] text-slate-400">invoices</span>
          </div>
          <p className="text-[11px] text-rose-300 font-mono">
            ${Number(overdue_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} past due
          </p>
        </div>
      </div>

      {/* AI Churn Intelligence Summary Banner */}
      <div 
        onClick={() => onNavigate && onNavigate('ai_analytics')}
        className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:border-indigo-400/60 transition shadow-lg group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">AI Portfolio Churn Risk Summary</h3>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                Random Forest ML
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Portfolio Churn Rate: <span className="text-white font-semibold">{portfolio_churn_rate_pct || 0}%</span> • High-Risk Accounts: <span className="text-rose-400 font-semibold">{high_risk_customers_count || 0}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 group-hover:text-white transition">
          <span>Explore AI Risk Analytics & Forecasts</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
        </div>
      </div>

      {/* Operations Quick Shortcuts & Activity Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Operations Quick Actions */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Quick Operations
          </h3>
          <p className="text-xs text-slate-400">
            Fast shortcuts to create records and execute business workflows.
          </p>

          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => onNavigate && onNavigate('quotations')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 text-left transition group"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-xs font-semibold text-white">New Quotation Proposal</div>
                  <div className="text-[10px] text-slate-400">Create custom quote or from template</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => onNavigate && onNavigate('subscriptions')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 text-left transition group"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Manage Subscriptions</div>
                  <div className="text-[10px] text-slate-400">Lifecycle, pause, resume & renew</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => onNavigate && onNavigate('payments')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 text-left transition group"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Record Payment</div>
                  <div className="text-[10px] text-slate-400">UPI, Card, Cash, Bank Transfer</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => onNavigate && onNavigate('simulator')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 text-left transition group"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Billing Simulator</div>
                  <div className="text-[10px] text-slate-400">Time-travel +1, +7, +30 days</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>
          </div>
        </div>

        {/* Right 2 Cols: Live Activity Stream */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Recent Ledger Activity Stream
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Live DB Audit</span>
          </div>

          <div className="space-y-2.5">
            {(!recent_activity || recent_activity.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No recent activity recorded yet.
              </div>
            ) : (
              recent_activity.map(item => {
                const isInvoice = item.type === 'invoice';
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isInvoice
                          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {isInvoice ? <Receipt className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{item.title}</div>
                        <div className="text-[11px] text-slate-400">{item.description}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-200">
                        ${Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{item.timestamp}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
