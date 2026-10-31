import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Repeat,
  PauseCircle,
  StopCircle
} from 'lucide-react';

export default function SubscriptionPlansView() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    billing_interval: 'monthly',
    base_cost: '',
    min_quantity: 1,
    available_from: todayStr,
    available_to: '',
    auto_close_on_expiry: false,
    allow_early_close: true,
    allow_pause: true,
    allow_renewal: true,
  });

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPlans(false);
      setPlans(res?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await api.createPlan({
        ...newPlan,
        base_cost: parseFloat(newPlan.base_cost) || 0,
        min_quantity: parseInt(newPlan.min_quantity, 10) || 1,
        available_to: newPlan.available_to || null,
      });
      setShowModal(false);
      setNewPlan({
        name: '',
        description: '',
        billing_interval: 'monthly',
        base_cost: '',
        min_quantity: 1,
        available_from: todayStr,
        available_to: '',
        auto_close_on_expiry: false,
        allow_early_close: true,
        allow_pause: true,
        allow_renewal: true,
      });
      fetchPlans();
    } catch (err) {
      alert(`Error creating plan: ${err.message}`);
    }
  };

  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Delete plan "${name}"?`)) return;
    try {
      await api.deletePlan(id);
      fetchPlans();
    } catch (err) {
      alert(`Error deleting plan: ${err.message}`);
    }
  };

  const getIntervalBadge = (interval) => {
    switch (interval) {
      case 'daily':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'weekly':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'monthly':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'yearly':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-400" />
            Subscription Cadence & Plan Governance
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure daily, weekly, monthly, and yearly recurring fees, minimum license seats, and termination rules.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading subscription plans...</div>
      ) : plans.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
          No plans configured. Click "Create Plan" to define your first subscription plan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${getIntervalBadge(plan.billing_interval)}`}>
                      {plan.billing_interval}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-2">{plan.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDeletePlan(plan.id, plan.name)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {plan.description && (
                  <p className="text-xs text-slate-400 line-clamp-2">{plan.description}</p>
                )}

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Base Recurring Cost:</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">
                      ${parseFloat(plan.base_cost).toFixed(2)}
                      <span className="text-xs text-slate-400 font-normal">/{plan.billing_interval}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                    <span>Min Quantity:</span>
                    <span className="font-semibold text-slate-200">{plan.min_quantity} seat(s)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                    <span>Availability:</span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {plan.available_from} {plan.available_to ? `→ ${plan.available_to}` : '(Indefinite)'}
                    </span>
                  </div>
                </div>

                {/* Lifecycle Governance Rules */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Lifecycle Rules</span>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      {plan.auto_close_on_expiry ? (
                        <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px]">Auto-close on end</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-300">
                      {plan.allow_early_close ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px]">Early closure</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-300">
                      {plan.allow_pause ? (
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px]">Pausable</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-300">
                      {plan.allow_renewal ? (
                        <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px]">Renewable</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                Create Subscription Plan
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Monthly Plan"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Target audience or contract stipulations"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Billing Cadence</label>
                  <select
                    value={newPlan.billing_interval}
                    onChange={(e) => setNewPlan({ ...newPlan, billing_interval: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Base Recurring Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="99.00"
                    value={newPlan.base_cost}
                    onChange={(e) => setNewPlan({ ...newPlan, base_cost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPlan.min_quantity}
                    onChange={(e) => setNewPlan({ ...newPlan, min_quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Available From</label>
                  <input
                    type="date"
                    required
                    value={newPlan.available_from}
                    onChange={(e) => setNewPlan({ ...newPlan, available_from: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Available To</label>
                  <input
                    type="date"
                    value={newPlan.available_to}
                    onChange={(e) => setNewPlan({ ...newPlan, available_to: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Lifecycle Checkboxes */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <span className="block text-xs font-semibold text-slate-300">Plan Policy Rules</span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlan.auto_close_on_expiry}
                    onChange={(e) => setNewPlan({ ...newPlan, auto_close_on_expiry: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Auto-close on expiration (Terminates without renewal)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlan.allow_early_close}
                    onChange={(e) => setNewPlan({ ...newPlan, allow_early_close: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Allow early termination by customer or staff</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlan.allow_pause}
                    onChange={(e) => setNewPlan({ ...newPlan, allow_pause: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Allow subscription to be paused</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlan.allow_renewal}
                    onChange={(e) => setNewPlan({ ...newPlan, allow_renewal: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Allow renewal upon completion</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
