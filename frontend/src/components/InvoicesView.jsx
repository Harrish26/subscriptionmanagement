import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  Receipt, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  X, ChevronDown, DollarSign, Calendar, FileText, Clock,
  XCircle, CreditCard, AlertTriangle
} from 'lucide-react';

/* ─────────────────────── helpers ─────────────────────── */
const STATUS_META = {
  draft:     { color: 'bg-slate-700 text-slate-200',   label: 'Draft',     icon: FileText },
  confirmed: { color: 'bg-blue-900 text-blue-200',     label: 'Confirmed', icon: CheckCircle2 },
  paid:      { color: 'bg-emerald-900 text-emerald-200',label: 'Paid',      icon: DollarSign },
  cancelled: { color: 'bg-rose-900 text-rose-300',     label: 'Cancelled', icon: XCircle },
  overdue:   { color: 'bg-amber-900 text-amber-200',   label: 'Overdue',   icon: AlertTriangle },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { color: 'bg-slate-800 text-slate-300', label: status, icon: Clock };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.color}`}>
      <Icon className="w-3 h-3" />{meta.label}
    </span>
  );
}

function fmt(val) {
  return val != null ? `$${Number(val).toFixed(2)}` : '—';
}

/* ─────────────────────── Invoice Detail Modal ─────────────────────── */
function InvoiceDetailModal({ invoice, onClose, onMarkPaid, loading }) {
  const canPay = invoice.status === 'confirmed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" /> {invoice.invoice_number}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Invoice meta */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[11px] text-slate-500 mb-0.5">Status</p>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[11px] text-slate-500 mb-0.5">Total Amount</p>
            <p className="text-emerald-400 font-bold font-mono text-lg">{fmt(invoice.total_amount)}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[11px] text-slate-500 mb-0.5">Billing Period</p>
            <p className="text-slate-200 text-xs">{invoice.billing_period_start} → {invoice.billing_period_end}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[11px] text-slate-500 mb-0.5">Due Date</p>
            <p className="text-slate-200 text-xs flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {invoice.due_date || '—'}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 col-span-2">
            <p className="text-[11px] text-slate-500 mb-0.5">Subscription</p>
            <p className="text-indigo-300 font-mono text-xs font-semibold">{invoice.subscription_number || `#${invoice.subscription_id}`}</p>
          </div>
        </div>

        {/* Line items */}
        {invoice.lines && invoice.lines.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">Line Items</p>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-[10px] uppercase text-slate-500">
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Unit Price</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, i) => (
                    <tr key={i} className="border-b border-slate-800 last:border-0">
                      <td className="px-3 py-2 text-slate-300">{line.description || line.product_name || '—'}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{line.quantity}</td>
                      <td className="px-3 py-2 text-right text-slate-400 font-mono">{fmt(line.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-400 font-semibold">{fmt(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700 font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-right text-slate-300">Total</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{fmt(invoice.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">Close</button>
          {canPay && (
            <button onClick={() => onMarkPaid(invoice.id)} disabled={loading}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Mark as Paid
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Main View ─────────────────────── */
export default function InvoicesView() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getInvoices();
      setInvoices(res?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleMarkPaid = async (invoiceId) => {
    setActionLoading(true);
    try {
      await api.updateInvoiceStatus(invoiceId, 'paid');
      flash(`Invoice marked as paid.`);
      setSelectedInvoice(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = async (invoice) => {
    try {
      const res = await api.getInvoice(invoice.id);
      setSelectedInvoice(res?.data || invoice);
    } catch {
      setSelectedInvoice(invoice);
    }
  };

  const filtered = filterStatus === 'all' ? invoices : invoices.filter(i => i.status === filterStatus);

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + Number(i.total_amount || 0), 0);
  const totalPending = invoices.filter(i => ['confirmed', 'draft'].includes(i.status)).reduce((acc, i) => acc + Number(i.total_amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" /> Invoices & Billing Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Idempotent invoice generation · Recurring billing records</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition self-start">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Alerts */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total Invoices</p>
          <p className="text-2xl font-extrabold text-white mt-1">{invoices.length}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total Collected</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">${totalPending.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Paid</p>
          <p className="text-2xl font-extrabold text-indigo-300 mt-1">{invoices.filter(i => i.status === 'paid').length}</p>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'confirmed', 'paid', 'overdue', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {s === 'all' ? 'All' : (STATUS_META[s]?.label || s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading invoices…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No invoices found.</p>
            <p className="text-xs mt-1">Use the Billing Simulator to generate invoices for active subscriptions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="text-left px-4 py-3">Invoice #</th>
                  <th className="text-left px-4 py-3">Subscription</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Billing Period</th>
                  <th className="text-left px-4 py-3">Due Date</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-indigo-300 font-semibold text-xs">
                      <div>{inv.invoice_number}</div>
                      {inv.customer && (
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {inv.customer.company_name || inv.customer.contact_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{inv.subscription_number || `#${inv.subscription_id}`}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {inv.billing_period_start} → {inv.billing_period_end}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {inv.due_date ? <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{inv.due_date}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 text-xs">{fmt(inv.total_amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openDetail(inv)}
                          className="px-2 py-1 text-[11px] rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition">
                          View
                        </button>
                        {inv.status === 'confirmed' && (
                          <button onClick={() => handleMarkPaid(inv.id)} disabled={actionLoading}
                            className="px-2 py-1 text-[11px] rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition flex items-center gap-1 disabled:opacity-60">
                            <CreditCard className="w-3 h-3" /> Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onMarkPaid={handleMarkPaid}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

