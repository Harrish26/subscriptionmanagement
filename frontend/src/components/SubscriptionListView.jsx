import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  RefreshCw, Plus, ChevronRight, X, CheckCircle2, AlertCircle,
  Clock, PauseCircle, XCircle, RotateCcw, PlayCircle, Loader2,
  FileText, Calendar, DollarSign, User, Layers
} from 'lucide-react';

/* ─────────────────────── helpers ─────────────────────── */
const STATUS_META = {
  draft:      { color: 'bg-slate-700 text-slate-200',   label: 'Draft',      icon: Clock },
  quotation:  { color: 'bg-indigo-900 text-indigo-200', label: 'Quotation',  icon: FileText },
  confirmed:  { color: 'bg-blue-900 text-blue-200',     label: 'Confirmed',  icon: CheckCircle2 },
  active:     { color: 'bg-emerald-900 text-emerald-200',label: 'Active',     icon: PlayCircle },
  paused:     { color: 'bg-amber-900 text-amber-200',   label: 'Paused',     icon: PauseCircle },
  closed:     { color: 'bg-rose-900 text-rose-300',     label: 'Closed',     icon: XCircle },
};

const TRANSITIONS = {
  draft:     ['confirm'],
  quotation: ['confirm'],
  confirmed: ['activate', 'close'],
  active:    ['pause', 'close', 'renew'],
  paused:    ['resume', 'close'],
  closed:    [],
};

const ACTION_META = {
  confirm:  { label: 'Confirm',     color: 'bg-blue-600 hover:bg-blue-500',    icon: CheckCircle2 },
  activate: { label: 'Activate',    color: 'bg-emerald-600 hover:bg-emerald-500', icon: PlayCircle },
  pause:    { label: 'Pause',       color: 'bg-amber-600 hover:bg-amber-500',  icon: PauseCircle },
  resume:   { label: 'Resume',      color: 'bg-indigo-600 hover:bg-indigo-500',icon: RefreshCw },
  close:    { label: 'Close',       color: 'bg-rose-700 hover:bg-rose-600',    icon: XCircle },
  renew:    { label: 'Renew',       color: 'bg-purple-600 hover:bg-purple-500',icon: RotateCcw },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { color: 'bg-slate-800 text-slate-300', label: status };
  const Icon = meta.icon || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.color}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function fmt(val) {
  return val != null ? `$${Number(val).toFixed(2)}` : '—';
}

/* ─────────────────────── Convert Quotation Modal ─────────────────────── */
function ConvertFromQuotationModal({ quotations, onConvert, onClose, loading }) {
  const [quotationId, setQuotationId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!quotationId) { setErr('Select a quotation.'); return; }
    setErr('');
    try {
      await onConvert({ quotation_id: parseInt(quotationId), start_date: startDate, expiry_date: expiryDate || null });
    } catch (e) { setErr(e.message); }
  };

  const available = quotations.filter(q => ['confirmed', 'draft'].includes(q.status));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-400" /> Convert Quotation → Subscription
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {available.length === 0 ? (
          <p className="text-amber-400 text-sm py-4 text-center">No confirmed/draft quotations available to convert.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Quotation</label>
              <select value={quotationId} onChange={e => setQuotationId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm p-2.5 focus:outline-none focus:border-indigo-500">
                <option value="">— Select quotation —</option>
                {available.map(q => (
                  <option key={q.id} value={q.id}>{q.quotation_number} — {q.title} ({q.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Subscription Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm p-2.5 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Expiry Date (optional)</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm p-2.5 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        )}

        {err && <p className="text-rose-400 text-xs mt-3 bg-rose-900/30 border border-rose-700/40 rounded-lg px-3 py-2">{err}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">Cancel</button>
          {available.length > 0 && (
            <button onClick={submit} disabled={loading}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Convert
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Transition Modal ─────────────────────── */
function TransitionModal({ sub, action, onConfirm, onClose, loading }) {
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const meta = ACTION_META[action];

  const submit = async () => {
    setErr('');
    try { await onConfirm(notes); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white text-base">
            {meta?.label} — {sub.subscription_number}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Transition <span className="text-white font-semibold">{sub.subscription_number}</span> from&nbsp;
          <StatusBadge status={sub.status} /> to <span className="text-white font-semibold uppercase">{action}</span>.
        </p>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Add a reason or note…"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm p-2.5 resize-none focus:outline-none focus:border-indigo-500" />
        </div>

        {err && <p className="text-rose-400 text-xs mt-3 bg-rose-900/30 border border-rose-700/40 rounded-lg px-3 py-2">{err}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">Cancel</button>
          <button onClick={submit} disabled={loading}
            className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 ${meta?.color}`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {meta?.label}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Main View ─────────────────────── */
export default function SubscriptionListView() {
  const [subs, setSubs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConvert, setShowConvert] = useState(false);
  const [transition, setTransition] = useState(null); // { sub, action }
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [subsRes, quotRes] = await Promise.all([
        api.getSubscriptions(),
        api.getQuotations(),
      ]);
      setSubs(subsRes?.data || []);
      setQuotations(quotRes?.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleConvert = async (payload) => {
    setActionLoading(true);
    try {
      const res = await api.createSubscriptionFromQuotation(payload);
      flash(`Created ${res?.data?.subscription_number} from quotation.`);
      setShowConvert(false);
      load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransition = async (notes) => {
    if (!transition) return;
    setActionLoading(true);
    try {
      await api.transitionSubscription(transition.sub.id, transition.action, notes);
      flash(`${transition.sub.subscription_number} → ${transition.action} successful.`);
      setTransition(null);
      load();
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = filterStatus === 'all' ? subs : subs.filter(s => s.status === filterStatus);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-400" /> Subscription Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Lifecycle state machine · Draft → Quotation → Confirmed → Active → Closed</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => setShowConvert(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition">
            <Plus className="w-3.5 h-3.5" /> Convert Quotation
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

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {s === 'all' ? 'All' : (STATUS_META[s]?.label || s)}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['active', 'paused', 'confirmed', 'closed'].map(s => (
          <div key={s} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">{STATUS_META[s]?.label}</p>
            <p className="text-2xl font-extrabold text-white mt-1">{subs.filter(x => x.status === s).length}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading subscriptions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No subscriptions found.</p>
            <p className="text-xs mt-1">Convert a confirmed quotation to create your first subscription.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="text-left px-4 py-3">Subscription #</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Start Date</th>
                  <th className="text-left px-4 py-3">Next Billing</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Cycle #</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-indigo-300 font-semibold text-xs">{sub.subscription_number}</td>
                    <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{sub.plan_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{sub.start_date || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {sub.next_billing_date
                        ? <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-400" />{sub.next_billing_date}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-mono font-semibold text-xs">{fmt(sub.total_amount)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs text-center">{sub.billing_cycle_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(TRANSITIONS[sub.status] || []).map(action => {
                          const m = ACTION_META[action];
                          const Icon = m.icon;
                          return (
                            <button key={action}
                              onClick={() => setTransition({ sub, action })}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md text-white transition ${m.color}`}>
                              <Icon className="w-3 h-3" />{m.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showConvert && (
        <ConvertFromQuotationModal
          quotations={quotations}
          onConvert={handleConvert}
          onClose={() => setShowConvert(false)}
          loading={actionLoading}
        />
      )}
      {transition && (
        <TransitionModal
          sub={transition.sub}
          action={transition.action}
          onConfirm={handleTransition}
          onClose={() => setTransition(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
