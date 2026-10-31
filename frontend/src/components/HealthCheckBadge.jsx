import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Activity, Database, KeyRound, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function HealthCheckBadge() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHealth();
      setHealth(res?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Backend Health & Constraints</h2>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="text-sm text-slate-400 flex items-center gap-2 py-4">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Checking connection to FastAPI...
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Connection Error</p>
            <p className="text-xs text-rose-300/80 mt-1">{error}</p>
            <p className="text-xs text-slate-400 mt-2">Ensure FastAPI is running: <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">python -m uvicorn main:app --app-dir backend --port 8000</code></p>
          </div>
        </div>
      )}

      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/40">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              API Status
            </span>
            <p className="text-sm font-medium text-emerald-400 mt-1 uppercase tracking-wide">
              {health.status}
            </p>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/40">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              Database
            </span>
            <p className="text-sm font-medium text-slate-200 mt-1">
              {health.database_connected ? 'Connected (SQLite)' : 'Disconnected'}
            </p>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/40">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Foreign Keys
            </span>
            <p className="text-sm font-medium text-amber-400 mt-1">
              {health.sqlite_foreign_keys_enforced ? 'PRAGMA ON' : 'Disabled'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

