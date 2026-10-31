import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  FileText,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  PieChart,
  Clock,
  RefreshCw,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fRes, sRes, iRes, pRes] = await Promise.all([
        api.getFinanceDashboard(),
        api.getSubscriptions(),
        api.getInvoices(),
        api.getPayments()
      ]);
      setFinanceData(fRes?.data || null);
      setSubscriptions(sRes?.data || []);
      setInvoices(iRes?.data || []);
      setPayments(pRes?.data || []);
    } catch (err) {
      console.error('Failed to load reports data:', err);
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

  const handleExportCSV = (reportName, rows) => {
    if (!rows || rows.length === 0) {
      showToast(`No records to export for ${reportName}.`, 'error');
      return;
    }

    const headers = Object.keys(rows[0]).join(',');
    const csvContent = [
      headers,
      ...rows.map(row => 
        Object.values(row)
          .map(val => `"${String(val || '').replace(/"/g, '""')}"`)
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `subscriptnova_${reportName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${reportName} to CSV successfully.`, 'success');
  };

  if (loading && !financeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading Financial & Subscription Reports...</p>
      </div>
    );
  }

  // Calculate Aging Buckets from Invoices
  const today = new Date();
  let currentDue = 0;
  let overdue1to30 = 0;
  let overdue31to60 = 0;
  let overdue60Plus = 0;

  invoices.forEach(inv => {
    const due = new Date(inv.due_date);
    const bal = Number(inv.balance_due || 0);
    if (bal > 0) {
      const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        currentDue += bal;
      } else if (diffDays <= 30) {
        overdue1to30 += bal;
      } else if (diffDays <= 60) {
        overdue31to60 += bal;
      } else {
        overdue60Plus += bal;
      }
    }
  });

  const totalOutstanding = currentDue + overdue1to30 + overdue31to60 + overdue60Plus;

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

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
                <FileText className="w-5 h-5 text-indigo-400" />
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Financial Reports & Ledger Statements
              </h1>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Accounts receivable aging analysis, billing lifecycle status breakdown, collections efficiency, and data export.
            </p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Reports</span>
          </button>
        </div>
      </div>

      {/* Export Shortcuts */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Export Official Audit Statements (CSV)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleExportCSV('invoices_ledger', invoices)}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 text-xs text-left transition"
          >
            <div className="flex items-center gap-2.5">
              <Receipt className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="font-semibold text-white">Invoices Statement</div>
                <div className="text-[10px] text-slate-400">{invoices.length} billing records</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => handleExportCSV('payments_ledger', payments)}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 text-xs text-left transition"
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-white">Payments Receipts</div>
                <div className="text-[10px] text-slate-400">{payments.length} transactions</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => handleExportCSV('subscriptions_ledger', subscriptions)}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 text-xs text-left transition"
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <div>
                <div className="font-semibold text-white">Subscriptions Roster</div>
                <div className="text-[10px] text-slate-400">{subscriptions.length} contracts</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Accounts Receivable Aging Analysis Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Accounts Receivable Aging Analysis
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Outstanding debt categorized by aging brackets past due date.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-300">
            Total Outstanding: ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* 4 Aging Buckets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-emerald-400">Current (Not Overdue)</span>
            <div className="text-lg font-black font-mono text-white">
              ${currentDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400">Within payment terms</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-amber-400">1 – 30 Days Overdue</span>
            <div className="text-lg font-black font-mono text-amber-300">
              ${overdue1to30.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400">First-level dunning phase</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-orange-400">31 – 60 Days Overdue</span>
            <div className="text-lg font-black font-mono text-orange-300">
              ${overdue31to60.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400">Escalated collections phase</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-rose-400">60+ Days Overdue</span>
            <div className="text-lg font-black font-mono text-rose-300">
              ${overdue60Plus.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400">High default risk debt</div>
          </div>
        </div>
      </div>

      {/* Payment Method Distribution & Invoice Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            Payment Collections by Method
          </h3>
          <div className="space-y-3">
            {Object.entries(financeData?.payment_methods_breakdown || {}).map(([method, amt]) => {
              const numAmt = Number(amt);
              const totalCol = Number(financeData?.total_collected_amount || 1);
              const pct = totalCol > 0 ? Math.round((numAmt / totalCol) * 100) : 0;
              return (
                <div key={method} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="uppercase font-mono text-slate-300 font-semibold">{method.replace('_', ' ')}</span>
                    <span className="font-mono text-slate-200">
                      ${numAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice Status Breakdown */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            Invoice Lifecycle Status Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(financeData?.invoices_by_status || {}).map(([st, cnt]) => {
              const totalInvs = Object.values(financeData?.invoices_by_status || {}).reduce((a, b) => a + b, 0);
              const pct = totalInvs > 0 ? Math.round((cnt / totalInvs) * 100) : 0;
              return (
                <div key={st} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="uppercase font-mono text-slate-300 font-semibold">{st.replace('_', ' ')}</span>
                    <span className="font-mono text-slate-200">{cnt} invoices ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        st === 'paid' ? 'bg-emerald-500' : st === 'overdue' ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

