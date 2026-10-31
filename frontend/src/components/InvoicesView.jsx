import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  Receipt, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  X, ChevronDown, DollarSign, Calendar, FileText, Clock,
  XCircle, CreditCard, AlertTriangle, Bell, Percent, Tag
} from 'lucide-react';

/* ─────────────────────── helpers ─────────────────────── */
const STATUS_META = {
  draft:          { color: 'bg-slate-700 text-slate-200',   label: 'Draft',          icon: FileText },
  unpaid:         { color: 'bg-amber-900 text-amber-200',   label: 'Unpaid',         icon: Clock },
  partially_paid: { color: 'bg-blue-900 text-blue-200',     label: 'Partially Paid', icon: CreditCard },
  paid:           { color: 'bg-emerald-900 text-emerald-200',label: 'Paid',          icon: CheckCircle2 },
  overdue:        { color: 'bg-rose-900 text-rose-300',     label: 'Overdue',        icon: AlertTriangle },
  confirmed:      { color: 'bg-indigo-900 text-indigo-200', label: 'Confirmed',      icon: Clock },
  cancelled:      { color: 'bg-slate-800 text-slate-400',   label: 'Cancelled',      icon: XCircle },
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

/* ─────────────────────── Quick Record Payment Modal ─────────────────────── */
function QuickPayModal({ invoice, onSave, onClose, loading }) {
  const [amount, setAmount] = useState(String(invoice.balance_due || invoice.total_amount));
  const [method, setMethod] = useState('upi');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) { setErr('Enter a valid amount.'); return; }
    if (numAmt > Number(invoice.balance_due)) {
      setErr(`Amount cannot exceed balance due ($${invoice.balance_due}).`);
      return;
    }
    setErr('');
    try {
      await onSave({
        invoice_id: invoice.id,
        amount: numAmt.toFixed(2),
        payment_method: method,
        transaction_reference: ref || null,
        notes: notes || null
      });
    } catch (e) {
      setErr(e.message || 'Payment failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" /> Settle {invoice.invoice_number}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Total Invoice:</span>
            <span className="font-mono font-bold text-slate-100">{fmt(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Already Settled:</span>
            <span className="font-mono text-emerald-400">{fmt(invoice.amount_paid)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-700/60 pt-1">
            <span className="text-amber-400 font-semibold">Balance Due:</span>
            <span className="font-mono font-bold text-amber-400">{fmt(invoice.balance_due)}</span>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Payment Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Payment Method *</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 outline-none"
            >
              <option value="upi">UPI / Instant QR</option>
              <option value="card">Credit / Debit Card</option>
              <option value="bank_transfer">Bank Wire (NEFT/RTGS)</option>
              <option value="cash">Cash / Direct Deposit</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Reference / UTR / Check #</label>
            <input
              type="text"
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder="e.g. UPI-REF-992384"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 outline-none font-mono"
            />
          </div>
        </div>

        {err && (
          <p className="text-rose-400 text-xs bg-rose-900/30 border border-rose-700/40 rounded-lg px-3 py-2">
            {err}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Invoice Detail Modal ─────────────────────── */
function InvoiceDetailModal({ invoice, onClose, onOpenPay, onSendReminder, loading }) {
  const canPay = Number(invoice.balance_due) > 0 && invoice.status !== 'cancelled';
  const isOverdue = invoice.status === 'overdue' || (Number(invoice.balance_due) > 0 && new Date(invoice.due_date) < new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-400" /> {invoice.invoice_number}
            </h3>
            {invoice.customer && (
              <p className="text-xs text-slate-400">
                {invoice.customer.company_name || invoice.customer.contact_name} ({invoice.customer.email})
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Invoice meta */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</p>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Due Date</p>
            <p className="text-slate-200 font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-400" /> {invoice.due_date || '—'}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Billing Period</p>
            <p className="text-slate-200">{invoice.billing_period_start} → {invoice.billing_period_end}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Subscription Contract</p>
            <p className="text-indigo-300 font-mono font-semibold">{invoice.subscription_number || `#${invoice.subscription_id}`}</p>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal:</span>
            <span className="font-mono text-slate-200">{fmt(invoice.subtotal)}</span>
          </div>
          {Number(invoice.discount_total) > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount Savings:</span>
              <span className="font-mono">-{fmt(invoice.discount_total)}</span>
            </div>
          )}
          {Number(invoice.tax_total) > 0 && (
            <div className="flex justify-between text-indigo-400">
              <span>Taxes (GST/VAT):</span>
              <span className="font-mono">+{fmt(invoice.tax_total)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-700/60 pt-1 text-sm font-bold text-white">
            <span>Total Gross Invoice:</span>
            <span className="font-mono text-emerald-400">{fmt(invoice.total_amount)}</span>
          </div>
          <div className="flex justify-between text-slate-400 pt-0.5">
            <span>Total Settled (Amount Paid):</span>
            <span className="font-mono text-emerald-400">{fmt(invoice.amount_paid)}</span>
          </div>
          <div className="flex justify-between text-amber-400 font-semibold border-t border-slate-700/40 pt-1">
            <span>Outstanding Balance Due:</span>
            <span className="font-mono font-bold">{fmt(invoice.balance_due)}</span>
          </div>
        </div>

        {/* Itemized Lines */}
        {invoice.lines && invoice.lines.length > 0 && (
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Itemized Line Items</p>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                    <th className="text-left px-3 py-1.5">Item</th>
                    <th className="text-right px-3 py-1.5">Qty</th>
                    <th className="text-right px-3 py-1.5">Unit</th>
                    <th className="text-right px-3 py-1.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invoice.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-slate-300">{line.description}</td>
                      <td className="px-3 py-1.5 text-right text-slate-400">{line.quantity}</td>
                      <td className="px-3 py-1.5 text-right text-slate-400 font-mono">{fmt(line.unit_price)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-200 font-semibold">{fmt(line.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1.5">Payment Transactions History</p>
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                    <th className="text-left px-3 py-1.5">Payment #</th>
                    <th className="text-left px-3 py-1.5">Method</th>
                    <th className="text-left px-3 py-1.5">Date</th>
                    <th className="text-right px-3 py-1.5">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invoice.payments.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 font-mono text-emerald-400">{p.payment_number}</td>
                      <td className="px-3 py-1.5 uppercase font-mono text-[10px] text-slate-300">{p.payment_method}</td>
                      <td className="px-3 py-1.5 text-slate-400">{p.payment_date}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-400">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            Close
          </button>
          {isOverdue && (
            <button
              onClick={() => onSendReminder(invoice.id)}
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              Send Reminder
            </button>
          )}
          {canPay && (
            <button
              onClick={() => onOpenPay(invoice)}
              disabled={loading}
              className="flex-1 px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Record Payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Main Invoices View ─────────────────────── */
export default function InvoicesView() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payInvoice, setPayInvoice] = useState(null);
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
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleRecordPayment = async (payload) => {
    setActionLoading(true);
    try {
      await api.recordPayment(payload);
      flash(`Payment recorded successfully.`);
      setPayInvoice(null);
      setSelectedInvoice(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminder = async (invoiceId) => {
    setActionLoading(true);
    try {
      await api.sendPaymentReminder({ invoice_id: invoiceId, reminder_channel: 'email' });
      flash(`Overdue payment reminder dispatched.`);
      setSelectedInvoice(null);
      await load();
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

  const totalInvoiced = invoices.filter(i => i.status !== 'cancelled').reduce((acc, i) => acc + Number(i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((acc, i) => acc + Number(i.amount_paid || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + Number(i.balance_due || 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" /> Invoices & Accounts Receivable Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Idempotent billing records · Real-time payments tracking · Overdue recovery
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition self-start"
        >
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
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total Gross Invoiced</p>
          <p className="text-2xl font-extrabold text-white mt-1 font-mono">${totalInvoiced.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total Collected</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Outstanding Balance</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">${totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Overdue Invoices</p>
          <p className={`text-2xl font-extrabold mt-1 ${overdueCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {overdueCount}
          </p>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'unpaid', 'partially_paid', 'paid', 'overdue', 'confirmed', 'draft', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
              filterStatus === s
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
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
            <p className="text-sm">No invoices found in this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="text-left px-4 py-3">Invoice #</th>
                  <th className="text-left px-4 py-3">Contract / Customer</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Due Date</th>
                  <th className="text-right px-4 py-3">Total Amount</th>
                  <th className="text-right px-4 py-3">Amount Paid</th>
                  <th className="text-right px-4 py-3">Balance Due</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(inv => {
                  const hasBalance = Number(inv.balance_due) > 0 && inv.status !== 'cancelled';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-mono text-indigo-300 font-semibold text-xs">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono text-slate-400">{inv.subscription_number || `#${inv.subscription_id}`}</div>
                        {inv.customer && (
                          <div className="text-[10px] text-slate-300">
                            {inv.customer.company_name || inv.customer.contact_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {inv.due_date ? <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-500" />{inv.due_date}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-200 text-xs">{fmt(inv.total_amount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400 text-xs">{fmt(inv.amount_paid)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-400 text-xs">{fmt(inv.balance_due)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openDetail(inv)}
                            className="px-2 py-1 text-[11px] rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                          >
                            View
                          </button>
                          {hasBalance && (
                            <button
                              onClick={() => setPayInvoice(inv)}
                              className="px-2 py-1 text-[11px] rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" /> Pay
                            </button>
                          )}
                          {inv.status === 'overdue' && (
                            <button
                              onClick={() => handleSendReminder(inv.id)}
                              className="px-2 py-1 text-[11px] rounded-md bg-amber-700/40 hover:bg-amber-600/50 text-amber-300 border border-amber-600/40 transition flex items-center gap-1"
                              title="Send Reminder"
                            >
                              <Bell className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
          onOpenPay={(inv) => { setSelectedInvoice(null); setPayInvoice(inv); }}
          onSendReminder={handleSendReminder}
          loading={actionLoading}
        />
      )}

      {/* Quick Pay Modal */}
      {payInvoice && (
        <QuickPayModal
          invoice={payInvoice}
          onSave={handleRecordPayment}
          onClose={() => setPayInvoice(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
