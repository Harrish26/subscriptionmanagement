import React, { useState } from 'react';
import { api } from '../api/client';
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  Building,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Zap,
  Key,
  UserPlus
} from 'lucide-react';

export default function AuthModal({ onLoginSuccess, isOpen = true, onClose = null }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.login(email.trim(), password);
      const userRes = await api.getCurrentUser();
      if (onLoginSuccess) {
        onLoginSuccess(userRes?.data || null);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err?.message || 'Login failed. Please verify credentials or ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!email || !fullName || !password) {
      setError('Full name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters with uppercase, lowercase, numbers, and symbols.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.registerCustomer({
        email: email.trim(),
        full_name: fullName.trim(),
        password: password,
        company_name: companyName.trim() || fullName.trim()
      });

      setSuccessMsg('Account registered successfully! Logging you in...');
      // Auto login
      await api.login(email.trim(), password);
      const userRes = await api.getCurrentUser();
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(userRes?.data || null);
        }
      }, 700);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err?.message || 'Account registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setError(null);
    try {
      await api.login(demoEmail, demoPassword);
      const userRes = await api.getCurrentUser();
      if (onLoginSuccess) {
        onLoginSuccess(userRes?.data || null);
      }
    } catch (err) {
      setError(err?.message || `Failed to log in as ${demoEmail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        {/* Header */}
        <div className="p-6 pb-4 text-center border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">SubscriptNova</h2>
          <p className="text-xs text-slate-400 mt-1">Enterprise Subscription & Recurring Billing Platform</p>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl mt-4 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-2 rounded-lg transition ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); }}
              className={`py-2 rounded-lg transition ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Authenticating...' : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Company / Organization</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Global Inc"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@acmeglobal.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Password (8+ chars, upper, lower, number, symbol)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="StrongPass@2026!"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Creating Account...' : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Customer Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Logins Pill Bar */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2 text-center font-bold">
              One-Click Evaluation Accounts
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickDemoLogin('admin@brightloop.io', 'Admin@Brightloop2026!')}
                className="p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 text-purple-200 text-[11px] font-semibold text-center transition flex flex-col items-center gap-0.5"
              >
                <span className="font-bold">Admin</span>
                <span className="text-[9px] text-purple-400 font-mono">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => quickDemoLogin('staff@brightloop.io', 'Staff@Brightloop2026!')}
                className="p-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 text-blue-200 text-[11px] font-semibold text-center transition flex flex-col items-center gap-0.5"
              >
                <span className="font-bold">Staff</span>
                <span className="text-[9px] text-blue-400 font-mono">Operations</span>
              </button>

              <button
                type="button"
                onClick={() => quickDemoLogin('customer@brightloop.io', 'Customer@Brightloop2026!')}
                className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 text-emerald-200 text-[11px] font-semibold text-center transition flex flex-col items-center gap-0.5"
              >
                <span className="font-bold">Customer</span>
                <span className="text-[9px] text-emerald-400 font-mono">Self-Service</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        {onClose && (
          <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-center">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Cancel and return
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
