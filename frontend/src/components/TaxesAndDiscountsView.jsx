import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  Percent, Tag, Plus, RefreshCw, AlertCircle, CheckCircle2,
  Trash2, X, Loader2, Calendar, ShieldCheck, DollarSign,
  Check, Play, HelpCircle
} from 'lucide-react';

/* ─────────────────────── Add Tax Modal ─────────────────────── */
function AddTaxModal({ onSave, onClose, loading }) {
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!name.trim()) { setErr('Tax name is required.'); return; }
    const r = parseFloat(rate);
    if (isNaN(r) || r < 0 || r > 100) { setErr('Rate must be between 0% and 100%.'); return; }
    setErr('');
    try {
      await onSave({
        name: name.trim(),
        rate: r.toFixed(2),
        description: description.trim() || null,
        is_default: isDefault,
        is_active: true
      });
    } catch (e) {
      setErr(e.message || 'Failed to create tax rate.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-400" /> Configure New Tax Rate
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Tax Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. GST 18%, VAT 5%, State Sales Tax"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Percentage Rate (%) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={rate}
              onChange={e => setRate(e.target.value)}
              placeholder="e.g. 18.00"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Applicable on SaaS software subscription contracts"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultTax"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-slate-800 border-slate-600 rounded focus:ring-0"
            />
            <label htmlFor="isDefaultTax" className="text-slate-300 font-semibold cursor-pointer">
              Set as system default tax rate
            </label>
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
            className="flex-1 px-4 py-2 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Percent className="w-3.5 h-3.5" />}
            Create Tax Rate
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Add Discount Modal ─────────────────────── */
function AddDiscountModal({ onSave, onClose, loading }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('0.00');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [scope, setScope] = useState('all');
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!code.trim()) { setErr('Promo code is required.'); return; }
    if (!name.trim()) { setErr('Discount title is required.'); return; }
    const v = parseFloat(value);
    if (isNaN(v) || v <= 0) { setErr('Discount value must be greater than 0.'); return; }
    if (type === 'percentage' && v > 100) { setErr('Percentage discount cannot exceed 100%.'); return; }

    setErr('');
    try {
      await onSave({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        discount_type: type,
        value: v.toFixed(2),
        min_purchase_amount: parseFloat(minPurchase || 0).toFixed(2),
        start_date: startDate || null,
        expiry_date: expiryDate || null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        scope: scope,
        is_active: true
      });
    } catch (e) {
      setErr(e.message || 'Failed to create discount.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" /> Create Discount & Promo Rule
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Promo Code *</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. WELCOME20, FLATSAVE100"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Campaign Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Summer Enterprise Promotion"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Discount Type *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none"
            >
              <option value="percentage">Percentage Off (%)</option>
              <option value="fixed">Fixed Cash Amount ($)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">
              {type === 'percentage' ? 'Percentage Rate (%) *' : 'Discount Amount ($) *'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={type === 'percentage' ? 'e.g. 20.00' : 'e.g. 100.00'}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Min Purchase Threshold ($)</label>
            <input
              type="number"
              step="0.01"
              value={minPurchase}
              onChange={e => setMinPurchase(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Usage Limit (Max Uses)</label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={e => setMaxUses(e.target.value)}
              placeholder="Leave empty for unlimited"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Start Date (Optional)</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Expiry Date (Optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 p-2.5 focus:border-indigo-500 outline-none"
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
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
            Create Discount
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Main View ─────────────────────── */
export default function TaxesAndDiscountsView() {
  const [taxes, setTaxes] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Test discount widget
  const [testCode, setTestCode] = useState('');
  const [testAmount, setTestAmount] = useState('1500.00');
  const [testResult, setTestResult] = useState(null);
  const [testingDiscount, setTestingDiscount] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [taxRes, discRes] = await Promise.all([
        api.getTaxes(false),
        api.getDiscounts(false)
      ]);
      setTaxes(taxRes?.data || []);
      setDiscounts(discRes?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load tax and discount data.');
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

  const handleCreateTax = async (payload) => {
    setActionLoading(true);
    try {
      const res = await api.createTax(payload);
      flash(`Tax rate '${res?.data?.name}' created.`);
      setShowTaxModal(false);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTax = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tax rate?')) return;
    try {
      await api.deleteTax(id);
      flash('Tax rate deleted.');
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreateDiscount = async (payload) => {
    setActionLoading(true);
    try {
      const res = await api.createDiscount(payload);
      flash(`Discount '${res?.data?.code}' created.`);
      setShowDiscountModal(false);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDiscount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) return;
    try {
      await api.deleteDiscount(id);
      flash('Discount deleted.');
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleTestDiscount = async () => {
    if (!testCode.trim()) return;
    setTestingDiscount(true);
    setTestResult(null);
    try {
      const res = await api.validateDiscount({
        code: testCode.trim(),
        purchase_amount: parseFloat(testAmount || 0).toFixed(2),
        is_subscription: true
      });
      setTestResult(res?.data || null);
    } catch (e) {
      setTestResult({ valid: false, message: e.message, discount_amount: 0 });
    } finally {
      setTestingDiscount(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-400" /> Tax Rates & Promotional Discount Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure jurisdiction taxes, promotional codes, usage quotas, minimum thresholds, and expiry guards.
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
            onClick={() => setShowTaxModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tax
          </button>
          <button
            onClick={() => setShowDiscountModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Discount
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

      {/* Tax Rates Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-400" /> Configured Tax Rates ({taxes.length})
          </h3>
          <span className="text-xs text-slate-400">Precision Decimal Math • Zero-loss rounding</span>
        </div>

        {taxes.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No tax rates configured.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                  <th className="text-left px-3 py-2">Tax Name</th>
                  <th className="text-left px-3 py-2">Rate (%)</th>
                  <th className="text-left px-3 py-2">Default</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {taxes.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-semibold text-slate-200">{t.name}</td>
                    <td className="px-3 py-2 font-mono text-indigo-400 font-bold">{Number(t.rate).toFixed(2)}%</td>
                    <td className="px-3 py-2">
                      {t.is_default ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
                          Default
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{t.description || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDeleteTax(t.id)}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Discounts Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" /> Promotional Discount Codes ({discounts.length})
          </h3>
          <span className="text-xs text-slate-400">Guarded by Start/End Dates & Usage Caps</span>
        </div>

        {discounts.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No promotional codes configured.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                  <th className="text-left px-3 py-2">Code</th>
                  <th className="text-left px-3 py-2">Campaign Title</th>
                  <th className="text-left px-3 py-2">Type / Value</th>
                  <th className="text-left px-3 py-2">Min Purchase</th>
                  <th className="text-left px-3 py-2">Validity Window</th>
                  <th className="text-left px-3 py-2">Uses</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {discounts.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-mono text-emerald-400 font-bold">{d.code}</td>
                    <td className="px-3 py-2 text-slate-200">{d.name}</td>
                    <td className="px-3 py-2 font-mono text-indigo-300">
                      {d.discount_type === 'percentage' ? `${d.value}% Off` : `$${d.value} Flat Off`}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-400">${d.min_purchase_amount}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {d.start_date || d.expiry_date ? `${d.start_date || 'Any'} → ${d.expiry_date || 'No Expiry'}` : 'Forever'}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">
                      {d.used_count} / {d.max_uses ?? '∞'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDeleteDiscount(d.id)}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Discount Validator Tester */}
      <div className="bg-slate-900/60 border border-indigo-600/30 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
          <Play className="w-4 h-4" /> Interactive Promo Code Validation Tester
        </h3>
        <p className="text-xs text-slate-400">
          Verify whether a discount code qualifies given a hypothetical purchase amount, date, and usage parameters.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <input
            type="text"
            value={testCode}
            onChange={e => setTestCode(e.target.value.toUpperCase())}
            placeholder="Enter promo code (e.g. SAVE20)"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs p-2.5 outline-none font-mono uppercase"
          />
          <input
            type="number"
            step="0.01"
            value={testAmount}
            onChange={e => setTestAmount(e.target.value)}
            placeholder="Cart purchase amount ($)"
            className="w-full sm:w-48 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs p-2.5 outline-none font-mono"
          />
          <button
            onClick={handleTestDiscount}
            disabled={testingDiscount || !testCode.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 justify-center"
          >
            {testingDiscount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Test Code
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            testResult.valid
              ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
              : 'bg-rose-900/30 border-rose-700/50 text-rose-300'
          }`}>
            <div>
              <p className="font-semibold">{testResult.message}</p>
              {testResult.valid && (
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  Savings: ${Number(testResult.discount_amount).toFixed(2)} | Net Total: ${(Number(testAmount) - Number(testResult.discount_amount)).toFixed(2)}
                </p>
              )}
            </div>
            <span className="font-mono font-bold text-sm">
              {testResult.valid ? `-$${Number(testResult.discount_amount).toFixed(2)}` : 'Invalid'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

