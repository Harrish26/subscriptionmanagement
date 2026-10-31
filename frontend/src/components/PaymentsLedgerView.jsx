import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  CreditCard, Plus, RefreshCw, AlertCircle, CheckCircle2,
  DollarSign, Calendar, Wallet, FileText, X, Loader2,
  Search, ShieldCheck, ArrowDownRight, Layers
} from 'lucide-react';

const METHOD_LABELS = {
  upi: { label: 'UPI / QR', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' },
  card: { label: 'Credit/Debit Card', color: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50' },
  bank_transfer: { label: 'Bank Wire / NEFT', color: 'bg-blue-900/40 text-blue-300 border-blue-700/50' },
  cash: { label: 'Cash / Manual', color: 'bg-amber-900/40 text-amber-300 border-amber-700/50' },
};

function RecordPaymentModal({ invoices, onSave, onClose, loading }) {
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  // Only open invoices with balance > 0
  const openInvoices = invoices.filter(inv => Number(inv.balance_due) > 0 && inv.status !== 'cancelled');

  const selectedInvoice = invoices.find(inv => String(inv.id) === String(invoiceId));

  const handleSelectInvoice = (id) => {
    setInvoiceId(id);
    const chosen = invoices.find(inv => String(inv.id) === String(id));
    if (chosen) {
      setAmount(String(chosen.balance_due));
    }
  };

  const submit = async () => {
    if (!invoiceId) {
      setErr('Please select an invoice.');
      return;
    }
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) {
      setErr('Please enter a valid positive payment amount.');
      return;
    }
    if (selectedInvoice && numAmt > Number(selectedInvoice.balance_due)) {
      setErr(`Amount cannot exceed outstanding balance of $${selectedInvoice.balance_due}.`);
      return;
    }

    setErr('');
    try {
      await onSave({
        invoice_id: parseInt(invoiceId),
        amount: numAmt.toFixed(2),
        payment_method: method,
        transaction_reference: reference || null,
        notes: notes || null
      });
    } catch (e) {
      setErr(e.message || 'Payment recording failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" /> Record Customer Payment
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {openInvoices.length === 0 ? (
          <p className="text-amber-400 text-xs py-4 text-center">
            No outstanding invoices currently require payment.
          </p>
        ) : (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Select Invoice *</label>
              <select
                value={invoiceId}
                onChange={e => handleSelectInvoice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none"
              >
                <option value="">— Select an invoice —</option>
                {openInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} ({inv.customer?.company_name || inv.customer?.contact_name || 'Customer'}) — Due: ${inv.balance_due}
                  </option>
                ))}
              </select>
            </div>

            {selectedInvoice && (
              <div className="bg-slate-800/60 rounded-lg p-3 text-[11px] text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Invoice Amount:</span>
                  <span className="font-mono font-bold">${Number(selectedInvoice.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Already Settled:</span>
                  <span className="font-mono text-emerald-400">${Number(selectedInvoice.amount_paid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-700/60 pt-1">
                  <span className="text-amber-400 font-semibold">Remaining Balance Due:</span>
                  <span className="font-mono font-bold text-amber-400">${Number(selectedInvoice.balance_due).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Payment Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 500.00"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Payment Method *</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none"
              >
                <option value="upi">UPI / Instant QR</option>
                <option value="card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Wire Transfer (NEFT/RTGS)</option>
                <option value="cash">Cash / Direct Deposit</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Transaction Reference / UTR</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. UPI Ref / Bank UTR / Card Auth Code"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Notes (Optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Cleared via corporate account"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none resize-none"
              />
            </div>
          </div>
        )}

        {err && (
          <p className="text-rose-400 text-xs bg-rose-900/30 border border-rose-700/40 rounded-lg px-3 py-2">
            {err}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Cancel
          </button>
          {openInvoices.length > 0 && (
            <button
              onClick={submit}
              disabled={loading}
              className="flex-1 px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              Save Payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentsLedgerView() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [methodFilter, setMethodFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [payRes, invRes] = await Promise.all([
        api.getPayments(),
        api.getInvoices()
      ]);
      setPayments(payRes?.data || []);
      setInvoices(invRes?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load payments ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleRecordPayment = async (payload) => {
    setActionLoading(true);
    try {
      const res = await api.recordPayment(payload);
      flash(`Payment ${res?.data?.payment_number} ($${res?.data?.amount}) recorded successfully.`);
      setShowModal(false);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = methodFilter === 'all'
    ? payments
    : payments.filter(p => p.payment_method === methodFilter);

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" /> Payments & Reconciliation Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track settled transactions, reconcile invoices, support partial payments, and inspect audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Payment
          </button>
        </div>
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total Transactions</p>
          <p className="text-2xl font-extrabold text-white mt-1">{payments.length}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total Settled Cash</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
            ${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">UPI Transactions</p>
          <p className="text-2xl font-extrabold text-indigo-300 mt-1">
            {payments.filter(p => p.payment_method === 'upi').length}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Bank Wires</p>
          <p className="text-2xl font-extrabold text-blue-300 mt-1">
            {payments.filter(p => p.payment_method === 'bank_transfer').length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All Methods' },
          { id: 'upi', label: 'UPI / QR' },
          { id: 'card', label: 'Card' },
          { id: 'bank_transfer', label: 'Bank Transfer' },
          { id: 'cash', label: 'Cash' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMethodFilter(m.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
              methodFilter === m.id
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading payment records…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No payment records found.</p>
            <p className="text-xs mt-1">Record a payment against an open invoice to see it in the ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="text-left px-4 py-3">Payment #</th>
                  <th className="text-left px-4 py-3">Invoice #</th>
                  <th className="text-left px-4 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Reference / UTR</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(p => {
                  const meta = METHOD_LABELS[p.payment_method] || { label: p.payment_method, color: 'bg-slate-800 text-slate-300' };
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-mono text-emerald-400 font-semibold text-xs">
                        {p.payment_number}
                      </td>
                      <td className="px-4 py-3 font-mono text-indigo-300 text-xs">
                        #{p.invoice_id}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        {p.customer?.company_name || p.customer?.contact_name || `#${p.customer_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                        {p.transaction_reference || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {p.payment_date}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 text-xs">
                        ${Number(p.amount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <RecordPaymentModal
          invoices={invoices}
          onSave={handleRecordPayment}
          onClose={() => setShowModal(false)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
