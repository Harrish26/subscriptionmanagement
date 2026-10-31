import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  Clock, FastForward, RotateCcw, AlertCircle, CheckCircle2,
  Loader2, Zap, Calendar, DollarSign, RefreshCw, Receipt,
  TrendingUp, AlertTriangle, XCircle
} from 'lucide-react';

/* ─────────────────────── helpers ─────────────────────── */
function StatCard({ icon: Icon, label, value, color = 'text-white', sub }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">{label}</p>
      </div>
      <p className={`text-2xl font-extrabold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function RunSummaryCard({ result }) {
  if (!result) return null;

  const { invoices_generated, total_amount_billed, skipped_duplicates, auto_closed, errors, generated_invoices } = result;

  return (
    <div className="bg-slate-900/70 border border-indigo-600/40 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
        <Zap className="w-4 h-4" /> Billing Run Results
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
          <p className="text-[11px] text-slate-400">Invoices Generated</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{invoices_generated ?? 0}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
          <p className="text-[11px] text-slate-400">Total Billed</p>
          <p className="text-lg font-extrabold text-emerald-400 mt-1 font-mono">
            ${Number(total_amount_billed ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
          <p className="text-[11px] text-slate-400">Duplicates Skipped</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1">{skipped_duplicates ?? 0}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
          <p className="text-[11px] text-slate-400">Auto-Closed</p>
          <p className="text-2xl font-extrabold text-slate-300 mt-1">{auto_closed ?? 0}</p>
        </div>
      </div>

      {errors && errors.length > 0 && (
        <div className="bg-rose-900/30 border border-rose-700/40 rounded-lg p-3">
          <p className="text-xs font-semibold text-rose-300 mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Errors ({errors.length})
          </p>
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-rose-400 font-mono">{e}</p>
          ))}
        </div>
      )}

      {generated_invoices && generated_invoices.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Generated Invoices</p>
          <div className="rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-[10px] uppercase text-slate-500">
                  <th className="text-left px-3 py-2">Invoice #</th>
                  <th className="text-left px-3 py-2">Subscription</th>
                  <th className="text-left px-3 py-2">Period</th>
                  <th className="text-right px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {generated_invoices.map((inv, i) => (
                  <tr key={i} className="border-b border-slate-800 last:border-0">
                    <td className="px-3 py-2 font-mono text-indigo-300 font-semibold">{inv.invoice_number}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{inv.subscription_number}</td>
                    <td className="px-3 py-2 text-slate-400">{inv.billing_period_start} → {inv.billing_period_end}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400 font-bold">
                      ${Number(inv.total_amount ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Main View ─────────────────────── */
export default function BillingSimulatorView() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSimulatorStatus();
      setStatus(res?.data || res);
    } catch (e) {
      setError(e.message || 'Failed to load simulator status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 6000);
  };

  const handleAdvance = async (days) => {
    setAdvancing(true);
    setError('');
    setLastResult(null);
    try {
      const res = await api.advanceTime(days);
      const data = res?.data || res;
      setLastResult(data);
      flash(`Time advanced +${days} day${days > 1 ? 's' : ''}. ${data.invoices_generated ?? 0} invoice(s) generated.`);
      await loadStatus();
    } catch (e) {
      setError(e.message || 'Failed to advance time.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError('');
    setLastResult(null);
    try {
      await api.resetSimulator();
      flash('Simulator reset to today.');
      await loadStatus();
    } catch (e) {
      setError(e.message || 'Failed to reset simulator.');
    } finally {
      setResetting(false);
    }
  };

  const isSimulated = status && status.offset_days !== 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> Time-Travel Billing Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fast-forward the billing clock to test recurring invoice generation and idempotency guarantees.
            </p>
          </div>
          <button onClick={loadStatus} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition self-start">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Date display */}
        {status && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Real Date (Server)</p>
              <p className="text-xl font-bold font-mono text-slate-100">{status.real_date}</p>
            </div>
            <div className={`flex-1 rounded-xl p-4 border ${isSimulated ? 'bg-indigo-900/30 border-indigo-600/50' : 'bg-slate-800/50 border-slate-700'}`}>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">
                Simulated Date {isSimulated && <span className="text-indigo-400 ml-1">(+{status.offset_days}d offset)</span>}
              </p>
              <p className={`text-xl font-bold font-mono ${isSimulated ? 'text-indigo-300' : 'text-slate-100'}`}>
                {status.simulated_date}
              </p>
            </div>
            <div className="flex-1 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Active Subscriptions Due</p>
              <p className="text-xl font-bold font-mono text-amber-400">{status.active_subscriptions_due ?? '—'}</p>
            </div>
          </div>
        )}

        {isSimulated && (
          <div className="mt-3 flex items-center gap-2 bg-indigo-900/20 border border-indigo-600/30 rounded-lg px-3 py-2 text-xs text-indigo-300">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Simulator is <strong>active</strong> — billing engine uses the simulated date. Reset to return to today.
          </div>
        )}
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

      {/* Time-travel controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <FastForward className="w-4 h-4 text-indigo-400" /> Advance Simulated Date
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Each advance runs the full billing engine: identifies due subscriptions, generates invoices, 
          and enforces idempotency (no duplicate invoices for the same billing period).
        </p>

        <div className="flex flex-wrap gap-3">
          {[
            { days: 1,  label: '+1 Day',   color: 'bg-slate-700 hover:bg-slate-600 border-slate-600', desc: 'Daily cycle' },
            { days: 7,  label: '+7 Days',  color: 'bg-blue-800 hover:bg-blue-700 border-blue-700',   desc: 'Weekly cycle' },
            { days: 30, label: '+30 Days', color: 'bg-indigo-700 hover:bg-indigo-600 border-indigo-600', desc: 'Monthly cycle' },
          ].map(({ days, label, color, desc }) => (
            <button key={days}
              onClick={() => handleAdvance(days)}
              disabled={advancing || resetting}
              className={`flex flex-col items-center px-6 py-4 rounded-xl border text-white font-semibold transition disabled:opacity-60 ${color}`}
            >
              {advancing ? (
                <Loader2 className="w-5 h-5 animate-spin mb-1" />
              ) : (
                <FastForward className="w-5 h-5 mb-1" />
              )}
              <span className="text-sm">{label}</span>
              <span className="text-[10px] opacity-70 mt-0.5">{desc}</span>
            </button>
          ))}

          <button
            onClick={handleReset}
            disabled={advancing || resetting || !isSimulated}
            className="flex flex-col items-center px-6 py-4 rounded-xl border border-rose-700 bg-rose-900/30 hover:bg-rose-800/40 text-rose-300 font-semibold transition disabled:opacity-40"
          >
            {resetting ? (
              <Loader2 className="w-5 h-5 animate-spin mb-1" />
            ) : (
              <RotateCcw className="w-5 h-5 mb-1" />
            )}
            <span className="text-sm">Reset to Today</span>
            <span className="text-[10px] opacity-70 mt-0.5">Clear offset</span>
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-indigo-400" /> How the Billing Engine Works
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-white font-semibold mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> 1. Identify Due Subscriptions
            </p>
            <p>All <em>active</em> subscriptions with <code>next_billing_date ≤ simulated_date</code> are selected for billing.</p>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-white font-semibold mb-1 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" /> 2. Generate Invoices
            </p>
            <p>One invoice per billing period. A <strong>unique constraint</strong> on (subscription_id, period_start, period_end) prevents duplicates.</p>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-white font-semibold mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> 3. Advance Next Billing Date
            </p>
            <p>After each invoice, <code>next_billing_date</code> advances by the plan interval (daily/weekly/monthly/yearly).</p>
          </div>
        </div>
      </div>

      {/* Last run result */}
      {lastResult && <RunSummaryCard result={lastResult} />}
    </div>
  );
}
