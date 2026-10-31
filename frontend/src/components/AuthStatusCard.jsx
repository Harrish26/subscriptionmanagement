import React, { useState } from 'react';
import { api } from '../api/client';
import { Shield, UserCheck, Lock, AlertTriangle, CheckCircle, LogOut } from 'lucide-react';

export default function AuthStatusCard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const loginAsAdmin = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.login('admin@brightloop.io', 'Admin@Brightloop2026!');
      const meRes = await api.getCurrentUser();
      setCurrentUser(meRes?.data || null);
      setStatusMsg({ type: 'success', text: `Authenticated as ${meRes?.data?.full_name} (${meRes?.data?.role.toUpperCase()})` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const testWeakPassword = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      await api.registerCustomer({
        email: `test_${Date.now()}@test.com`,
        full_name: 'Test Weak',
        password: 'weak',
      });
      setStatusMsg({ type: 'error', text: 'Unexpected: Weak password succeeded!' });
    } catch (err) {
      setStatusMsg({ type: 'info', text: `Strict password policy caught: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setStatusMsg({ type: 'info', text: 'Logged out successfully.' });
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Authentication & RBAC Test Bench</h2>
        </div>
        {currentUser && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 px-3 py-1.5 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        )}
      </div>

      <div className="space-y-3">
        {currentUser ? (
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-700/40">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <UserCheck className="w-4 h-4" />
              <span className="text-sm font-semibold">Active Session</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Email:</span>
                <p className="font-mono text-slate-200">{currentUser.email}</p>
              </div>
              <div>
                <span className="text-slate-400">Role:</span>
                <p className="font-semibold text-indigo-300 uppercase">{currentUser.role}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Permissions:</span>
                <p className="text-slate-300">
                  {currentUser.role === 'admin' && 'Full system control, staff management, tax & discount authoring.'}
                  {currentUser.role === 'staff' && 'Quotation creation, subscription handling, invoice tracking.'}
                  {currentUser.role === 'customer' && 'Self-service portal, view own invoices and subscriptions.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">
            No active JWT session. Test authentication using the actions below:
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={loginAsAdmin}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            Test Admin Login (JWT)
          </button>

          <button
            onClick={testWeakPassword}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-200 bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/40 px-3.5 py-2 rounded-lg transition disabled:opacity-50"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Test Password Policy Validator
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : statusMsg.type === 'error'
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : statusMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

