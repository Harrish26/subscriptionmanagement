import React from 'react';
import HealthCheckBadge from './components/HealthCheckBadge';
import AuthStatusCard from './components/AuthStatusCard';
import { Layers, CheckCircle2, Cpu, Database, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const requirements = [
    { title: 'Decimal Precision', desc: 'All financial calculations use Decimal instead of float', done: true },
    { title: 'Secure Passwords & JWT', desc: 'Bcrypt hashing, >8 chars policy, and HS256 JWT tokens', done: true },
    { title: 'Role-Based Access Control', desc: 'Granular Admin, Staff, and Customer RBAC dependencies', done: true },
    { title: 'Environment Config', desc: 'Decoupled settings via .env and python-dotenv', done: true },
    { title: 'SQLite Foreign Keys', desc: 'PRAGMA foreign_keys=ON strictly enforced via engine event', done: true },
    { title: 'Modular Architecture', desc: 'Clean separation: routers, models, schemas, and services', done: true },
    { title: 'CORS & Frontend Client', desc: 'Configured CORSMiddleware and Fetch API client', done: true },
    { title: 'Diagnostic Health Endpoint', desc: 'Live /api/v1/health reporting DB and FK status', done: true },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                SubscriptNova
              </span>
              <span className="ml-2 text-xs font-mono uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                Phase 1 Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            System Online
          </div>
        </div>
      </header>

      {/* Hero / Overview Banner */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 space-y-8 w-full">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            AI-Powered Subscription Management & Recurring Billing
          </h1>
          <p className="mt-2 text-slate-400 text-sm max-w-3xl">
            Unified subscription lifecycle backbone for Brightloop Software. Engineered with FastAPI, React, SQLite, SQLAlchemy, and Scikit-learn.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              FastAPI + Uvicorn
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              React + Vite + Tailwind
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              SQLite (FK Enforced)
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/60 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              JWT + Granular RBAC
            </span>
          </div>
        </div>

        {/* Live System Diagnostics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HealthCheckBadge />
          <AuthStatusCard />
        </div>

        {/* Phase 1 Verification Checklist */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Phase 1 Architecture Compliance Checklist</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {requirements.map((req, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-slate-950/40 rounded-lg border border-slate-800/80"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-slate-200">{req.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{req.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        SubscriptNova • Brightloop Billing System • Ready for Phase 2: Product Catalog & Quotations
      </footer>
    </div>
  );
}

