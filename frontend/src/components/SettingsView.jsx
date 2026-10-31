import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import HealthCheckBadge from './HealthCheckBadge';
import AuthStatusCard from './AuthStatusCard';
import {
  Settings,
  ShieldCheck,
  UserCheck,
  Clock,
  RefreshCw,
  Key,
  Database,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers
} from 'lucide-react';

export default function SettingsView({ currentUser, onUserChange }) {
  const [simStatus, setSimStatus] = useState(null);
  const [loadingSim, setLoadingSim] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadSimStatus = async () => {
    try {
      const res = await api.getSimulatorStatus();
      setSimStatus(res?.data || null);
    } catch (err) {
      console.error('Failed to load simulator status:', err);
    }
  };

  useEffect(() => {
    loadSimStatus();
  }, []);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRoleSwitch = async (email, password, roleLabel) => {
    try {
      await api.login(email, password);
      const userRes = await api.getCurrentUser();
      if (onUserChange) onUserChange(userRes?.data || null);
      showToast(`Switched active session to ${roleLabel} (${email})`, 'success');
    } catch (err) {
      showToast(err?.message || `Failed to switch to ${roleLabel}`, 'error');
    }
  };

  const handleAdvanceTime = async (days) => {
    setLoadingSim(true);
    try {
      const res = await api.advanceTime(days);
      showToast(res?.message || `Advanced time by ${days} days.`, 'success');
      await loadSimStatus();
    } catch (err) {
      showToast(err?.message || 'Simulation failed.', 'error');
    } finally {
      setLoadingSim(false);
    }
  };

  const handleResetTime = async () => {
    setLoadingSim(true);
    try {
      const res = await api.resetSimulator();
      showToast(res?.message || 'Simulator reset to real-world date.', 'success');
      await loadSimStatus();
    } catch (err) {
      showToast(err?.message || 'Reset failed.', 'error');
    } finally {
      setLoadingSim(false);
    }
  };

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
        <div className="flex items-center gap-3">
          <span className="p-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
            <Settings className="w-5 h-5 text-indigo-400" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Platform Settings & Hackathon Evaluation Bench
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Role-based session switcher, SQLite architecture diagnostics, and time-travel simulator controls.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Role Switcher Card */}
      <div className="bg-slate-900/70 border border-indigo-500/30 rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              One-Click Role Switcher (Hackathon Demo Bench)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantaneously switch user authorization context to verify role-based access control (RBAC).
            </p>
          </div>
          {currentUser && (
            <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg border border-indigo-500/30">
              Active: {currentUser.role.toUpperCase()} ({currentUser.full_name})
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Admin Switch */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Administrator</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Full Access
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                admin@brightloop.io
              </p>
            </div>
            <button
              onClick={() => handleRoleSwitch('admin@brightloop.io', 'Admin@Brightloop2026!', 'Admin')}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow"
            >
              Switch to Admin
            </button>
          </div>

          {/* Staff Switch */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Staff Member</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  Operations
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                staff@brightloop.io
              </p>
            </div>
            <button
              onClick={() => handleRoleSwitch('staff@brightloop.io', 'Staff@Brightloop2026!', 'Staff')}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Switch to Staff
            </button>
          </div>

          {/* Customer Switch */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Customer Account</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Self-Service
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                testcustomer@example.com
              </p>
            </div>
            <button
              onClick={() => handleRoleSwitch('testcustomer@example.com', 'CustomerPass123!', 'Customer')}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition"
            >
              Switch to Customer
            </button>
          </div>
        </div>
      </div>

      {/* Quick Simulator Controller Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Time-Travel Billing Simulator Controls
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulated Date: <span className="text-white font-mono font-bold">{simStatus?.current_simulated_date || 'Today'}</span> (Offset: +{simStatus?.days_offset || 0} days)
            </p>
          </div>

          <button
            onClick={handleResetTime}
            disabled={loadingSim || simStatus?.days_offset === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 transition"
          >
            Reset to Today
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleAdvanceTime(1)}
            disabled={loadingSim}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition disabled:opacity-50"
          >
            +1 Day (Daily Plans)
          </button>
          <button
            onClick={() => handleAdvanceTime(7)}
            disabled={loadingSim}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition disabled:opacity-50"
          >
            +7 Days (Weekly Cycles)
          </button>
          <button
            onClick={() => handleAdvanceTime(30)}
            disabled={loadingSim}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition disabled:opacity-50"
          >
            +30 Days (Monthly Subscriptions)
          </button>
        </div>
      </div>

      {/* Core Diagnostics & Auth Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthCheckBadge />
        <AuthStatusCard />
      </div>
    </div>
  );
}

