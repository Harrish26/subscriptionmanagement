import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  TrendingUp, DollarSign, AlertTriangle, CheckCircle2,
  Receipt, CreditCard, RefreshCw, AlertCircle, ArrowUpRight,
  ShieldCheck, Clock, Wallet, Bell, Loader2
} from 'lucide-react';

function StatCard({ title, amount, subtitle, icon: Icon, color, border = 'border-slate-800' }) {
  return (
    <div className={`bg-slate-900/60 border ${border} rounded-xl p-5 flex flex-col justify-between shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">{title}</p>
        <div className={`p-2 rounded-lg ${color.bg}`}>
          <Icon className={`w-4 h-4 ${color.text}`} />
        </div>
      </div>
      <div>
        <p className={`text-2xl font-extrabold font-mono tracking-tight ${color.text}`}>
          ${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function FinanceDashboardView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getFinanceDashboard();
      setData(res?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load finance dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleScanOverdue = async () => {
    setScanning(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.scanOverdueInvoices();
      setSuccess(res?.message || 'Overdue scan completed.');
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Overdue scan failed.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" /> Finance & Revenue Operations Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time accounts receivable, cash collections, overdue debt tracking, and payment method distribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScanOverdue}
            disabled={scanning || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            Scan Overdue
          </button>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Flash Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-900/40 border border-rose-700/50 text-rose-300 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-sm rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          amount={data?.total_invoiced_amount || 0}
          subtitle="Cumulative gross billing"
          icon={Receipt}
          color={{ bg: 'bg-indigo-500/10', text: 'text-indigo-400' }}
        />
        <StatCard
          title="Total Collected"
          amount={data?.total_collected_amount || 0}
          subtitle="Settled via UPI, Card, Wire"
          icon={CheckCircle2}
          color={{ bg: 'bg-emerald-500/10', text: 'text-emerald-400' }}
          border="border-emerald-500/20"
        />
        <StatCard
          title="Outstanding Receivables"
          amount={data?.total_outstanding_amount || 0}
          subtitle="Unpaid + Partially Paid"
          icon={Clock}
          color={{ bg: 'bg-amber-500/10', text: 'text-amber-400' }}
        />
        <StatCard
          title="Overdue Receivables"
          amount={data?.overdue_amount || 0}
          subtitle={`${data?.overdue_invoices_count || 0} invoice(s) past due date`}
          icon={AlertTriangle}
          color={{ bg: 'bg-rose-500/10', text: 'text-rose-400' }}
          border={data?.overdue_invoices_count > 0 ? "border-rose-500/40" : "border-slate-800"}
        />
      </div>

      {/* Middle Row: Payment Methods Breakdown & Invoice Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-400" /> Payment Methods Collections
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'upi', label: 'UPI / QR', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { id: 'card', label: 'Debit / Credit Card', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { id: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS)', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { id: 'cash', label: 'Cash / Manual', color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map(m => {
              const amt = data?.payment_methods_breakdown?.[m.id] || 0;
              return (
                <div key={m.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
                  <p className="text-[11px] text-slate-400">{m.label}</p>
                  <p className={`text-lg font-bold font-mono mt-1 ${m.color}`}>
                    ${Number(amt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoices Status Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" /> Invoices Status Distribution
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { id: 'paid', label: 'Paid', color: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40' },
              { id: 'partially_paid', label: 'Partially Paid', color: 'bg-blue-900/30 text-blue-300 border-blue-700/40' },
              { id: 'unpaid', label: 'Unpaid', color: 'bg-amber-900/30 text-amber-300 border-amber-700/40' },
              { id: 'overdue', label: 'Overdue', color: 'bg-rose-900/30 text-rose-300 border-rose-700/40' },
              { id: 'draft', label: 'Draft', color: 'bg-slate-800 text-slate-400 border-slate-700' },
              { id: 'cancelled', label: 'Cancelled', color: 'bg-slate-800 text-slate-500 border-slate-700' },
            ].map(s => {
              const count = data?.invoices_by_status?.[s.id] || 0;
              return (
                <div key={s.id} className={`p-3 rounded-lg border ${s.color}`}>
                  <p className="text-[10px] uppercase font-semibold tracking-wider">{s.label}</p>
                  <p className="text-xl font-bold font-mono mt-1">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Payments and Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" /> Recent Payment Transactions
          </h3>
          {(!data?.recent_payments || data.recent_payments.length === 0) ? (
            <p className="text-xs text-slate-500 py-6 text-center">No payment transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                    <th className="text-left px-3 py-2">Payment #</th>
                    <th className="text-left px-3 py-2">Method</th>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.recent_payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-mono text-indigo-300 font-semibold">{p.payment_number}</td>
                      <td className="px-3 py-2 text-slate-300 uppercase font-mono text-[10px]">{p.payment_method}</td>
                      <td className="px-3 py-2 text-slate-400">{p.payment_date}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                        ${Number(p.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" /> Recent Billing Invoices
          </h3>
          {(!data?.recent_invoices || data.recent_invoices.length === 0) ? (
            <p className="text-xs text-slate-500 py-6 text-center">No invoices generated yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                    <th className="text-left px-3 py-2">Invoice #</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="text-right px-3 py-2">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.recent_invoices.map(i => (
                    <tr key={i.id} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2 font-mono text-indigo-300 font-semibold">{i.invoice_number}</td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-slate-800 text-slate-300">
                          {i.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-200">
                        ${Number(i.total_amount).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-amber-400">
                        ${Number(i.balance_due).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
