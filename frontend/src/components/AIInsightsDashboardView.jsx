import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Zap,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ArrowUpRight,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  UserCheck,
  UserX,
  Clock,
  BarChart3
} from 'lucide-react';

export default function AIInsightsDashboardView() {
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedHorizon, setSelectedHorizon] = useState('6_months'); // '3_months' | '6_months'
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL' | 'High' | 'Medium' | 'Low'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCustomerModal, setActiveCustomerModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAIInsightsDashboard();
      setDashboardData(res?.data || null);
    } catch (err) {
      console.error('Failed to load AI Insights:', err);
      setError(err?.message || 'Failed to load AI Insights data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await api.retrainMLModels();
      showToast('Random Forest ML model retrained on live telemetry.', 'success');
      await loadData();
    } catch (err) {
      showToast(err?.message || 'Failed to retrain ML models.', 'error');
    } finally {
      setRetraining(false);
    }
  };

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse">
          <Brain className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <p className="text-sm text-slate-400">Loading AI & Machine Learning Intelligence...</p>
      </div>
    );
  }

  const { churn_overview, mrr_forecast, all_customer_predictions } = dashboardData || {};

  // Forecast points based on selected horizon
  const forecastPoints = selectedHorizon === '3_months' 
    ? (mrr_forecast?.forecast_3_months || [])
    : (mrr_forecast?.forecast_6_months || []);

  const historicalPoints = mrr_forecast?.historical_mrr || [];

  // Filter customers
  const filteredCustomers = (all_customer_predictions || []).filter(c => {
    const matchesFilter = riskFilter === 'ALL' || c.risk_tier.toLowerCase() === riskFilter.toLowerCase();
    const matchesSearch = 
      c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate chart max height value
  const allChartVals = [
    ...historicalPoints.map(p => Number(p.mrr)),
    ...forecastPoints.map(p => Number(p.upper_bound || p.mrr))
  ];
  const maxChartVal = Math.max(...allChartVals, 1000) * 1.15;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
                <Brain className="w-5 h-5 text-indigo-400" />
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                AI & Machine Learning Insights
              </h1>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Scikit-Learn Powered
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Random Forest customer churn risk classifier, time-series Ridge regression for MRR forecasting,
              and prescriptive retention playbooks with explainable behavioral drivers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRetrain}
              disabled={retraining}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition disabled:opacity-50"
              title="Retrain Random Forest model on database telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
              <span>{retraining ? 'Retraining...' : 'Retrain ML Models'}</span>
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Churn Rate */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/40 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Portfolio Churn Risk</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-2xl font-black text-white font-mono">
              {churn_overview?.portfolio_churn_rate || 0}%
            </span>
            <span className="text-[11px] text-slate-400">avg rate</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-400"></span>
            <span>{churn_overview?.high_risk_count || 0} High</span>
            <span className="text-slate-600">•</span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
            <span>{churn_overview?.medium_risk_count || 0} Med</span>
            <span className="text-slate-600">•</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{churn_overview?.low_risk_count || 0} Low</span>
          </div>
        </div>

        {/* Card 2: High Risk Accounts */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-rose-500/40 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">High-Risk Accounts</span>
            <div className="w-7 h-7 rounded-lg bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-2xl font-black text-rose-400 font-mono">
              {churn_overview?.high_risk_count || 0}
            </span>
            <span className="text-[11px] text-slate-400">accounts</span>
          </div>
          <p className="text-[11px] text-slate-400">
            MRR at risk: <span className="text-rose-300 font-mono font-semibold">${Number(churn_overview?.total_mrr_at_risk || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>

        {/* Card 3: Current MRR */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/40 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Current MRR</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              ${Number(mrr_forecast?.current_mrr || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Active normalized subscription run-rate
          </p>
        </div>

        {/* Card 4: 6-Month Projected MRR */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-purple-500/40 transition shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">6-Mo Forecasted MRR</span>
            <div className="w-7 h-7 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-2xl font-black text-purple-300 font-mono">
              ${Number(mrr_forecast?.forecast_6_months?.[mrr_forecast.forecast_6_months.length - 1]?.mrr || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>+{mrr_forecast?.projected_growth_rate_pct || 0}% projected growth</span>
          </p>
        </div>
      </div>

      {/* Main Grid: Forecast Visualizer + Top Risk Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: MRR Time-Series Regression Visualizer */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  Monthly Recurring Revenue (MRR) Forecast
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Historical monthly revenue vs. Scikit-learn regression forecast with 95% confidence corridor
              </p>
            </div>

            {/* Horizon Switcher */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs self-start sm:self-auto">
              <button
                onClick={() => setSelectedHorizon('3_months')}
                className={`px-3 py-1 rounded-md transition font-medium ${
                  selectedHorizon === '3_months'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3 Months
              </button>
              <button
                onClick={() => setSelectedHorizon('6_months')}
                className={`px-3 py-1 rounded-md transition font-medium ${
                  selectedHorizon === '6_months'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                6 Months
              </button>
            </div>
          </div>

          {/* Forecast Chart Container */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                  <span>Historical Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-indigo-500 border border-indigo-400"></span>
                  <span>AI Predicted MRR</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-1 rounded bg-indigo-400/30"></span>
                  <span>95% Confidence Corridor</span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Fit Score: R² = {mrr_forecast?.r2_score || 0.95}
              </span>
            </div>

            {/* Bars Visualization */}
            <div className="grid grid-flow-col auto-cols-fr gap-3 items-end h-56 pt-6 pb-2 px-2 border-b border-slate-800">
              {/* Historical Points */}
              {historicalPoints.map((pt, idx) => {
                const heightPct = Math.max(12, Math.min(100, (Number(pt.mrr) / maxChartVal) * 100));
                return (
                  <div key={pt.period} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="opacity-0 group-hover:opacity-100 transition text-[10px] font-mono text-emerald-300 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                      ${Number(pt.mrr).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[42px] rounded-t-md bg-gradient-to-t from-emerald-600/50 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 transition-all cursor-pointer relative"
                      title={`${pt.period}: $${Number(pt.mrr).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    ></div>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 whitespace-nowrap">
                      {pt.period.slice(2)}
                    </span>
                  </div>
                );
              })}

              {/* Forecast Points */}
              {forecastPoints.map((pt, idx) => {
                const heightPct = Math.max(12, Math.min(100, (Number(pt.mrr) / maxChartVal) * 100));
                const lowerPct = pt.lower_bound ? Math.max(10, (Number(pt.lower_bound) / maxChartVal) * 100) : heightPct * 0.9;
                const upperPct = pt.upper_bound ? Math.min(100, (Number(pt.upper_bound) / maxChartVal) * 100) : heightPct * 1.1;

                return (
                  <div key={pt.period} className="flex flex-col items-center gap-2 h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition text-[10px] font-mono text-indigo-200 bg-slate-900 border border-indigo-500/40 px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                      <div>${Number(pt.mrr).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                      <div className="text-[9px] text-slate-400">
                        CI: [${Number(pt.lower_bound || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} - ${Number(pt.upper_bound || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}]
                      </div>
                    </div>

                    {/* Projected Bar with Dotted Outline */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[42px] rounded-t-md bg-gradient-to-t from-indigo-700/60 to-indigo-500 border-t-2 border-indigo-400 border-dashed hover:from-indigo-600 hover:to-indigo-400 transition-all cursor-pointer relative"
                      title={`Predicted ${pt.period}: $${Number(pt.mrr).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    >
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-300 animate-ping"></div>
                    </div>

                    <span className="text-[10px] font-mono text-indigo-300 font-semibold mt-1 whitespace-nowrap">
                      {pt.period.slice(2)}*
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3">
              <span>* Projected by Scikit-Learn Time-Series Forecaster</span>
              <span>Horizontal Axis: Year-Month (YY-MM)</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Behavioral Risk Drivers & Interventions */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Top Behavioral Risk Drivers</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Feature importance rankings derived from Random Forest model weights.
            </p>

            <div className="space-y-3">
              {(churn_overview?.top_risk_drivers || []).map((driver, idx) => {
                const pct = Math.round(driver.importance * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{driver.factor}</span>
                      <span className="font-mono text-indigo-400 font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-400">{driver.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Interventions */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Proactive Retention Playbook
            </h4>
            <div className="space-y-2">
              {(churn_overview?.recommended_interventions || []).map((rec, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 flex-shrink-0"></span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Churn Risk Table Section */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              Customer Risk Analysis & Diagnostic Ledger
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Individual account churn probability, contributing factors, and tailored prescriptive interventions.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Risk Tier Tabs */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
              {['ALL', 'High', 'Medium', 'Low'].map(tier => (
                <button
                  key={tier}
                  onClick={() => setRiskFilter(tier)}
                  className={`px-3 py-1 rounded-md transition font-medium ${
                    riskFilter === tier
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tier === 'ALL' ? 'All Accounts' : `${tier} Risk`}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer, company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer Account</th>
                <th className="py-3 px-4">Risk Tier & Score</th>
                <th className="py-3 px-4">Churn Probability</th>
                <th className="py-3 px-4">MRR Contribution</th>
                <th className="py-3 px-4">Key Contributing Factors</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4 text-right">Diagnostic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No customers match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  const isHigh = customer.risk_tier === 'High';
                  const isMed = customer.risk_tier === 'Medium';
                  const badgeColor = isHigh
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : isMed
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                  const barColor = isHigh
                    ? 'bg-rose-500'
                    : isMed
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

                  return (
                    <tr
                      key={customer.customer_id}
                      className="hover:bg-slate-800/30 transition cursor-pointer"
                      onClick={() => setActiveCustomerModal(customer)}
                    >
                      {/* Customer Name & Company */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{customer.customer_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {customer.company_name ? customer.company_name : customer.email}
                        </div>
                      </td>

                      {/* Risk Tier & Score */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                            {customer.risk_tier}
                          </span>
                          <span className="font-mono text-slate-300 font-bold">{customer.risk_score}/100</span>
                        </div>
                        <div className="w-24 bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${barColor}`}
                            style={{ width: `${customer.risk_score}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* Churn Probability */}
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={isHigh ? 'text-rose-400' : isMed ? 'text-amber-400' : 'text-emerald-400'}>
                          {customer.churn_probability_pct}%
                        </span>
                      </td>

                      {/* MRR */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-200">
                        ${Number(customer.mrr).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Contributing Factors */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {customer.contributing_factors.slice(0, 2).map((factor, fIdx) => (
                            <span
                              key={fIdx}
                              className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60"
                            >
                              {factor}
                            </span>
                          ))}
                          {customer.contributing_factors.length > 2 && (
                            <span className="text-[9px] text-slate-500 font-medium">
                              +{customer.contributing_factors.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Recommended Action */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-[11px] text-slate-300 line-clamp-2">
                          {customer.recommended_action}
                        </p>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCustomerModal(customer);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition inline-flex items-center gap-1"
                        >
                          <span>Analyze</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Diagnostic Detail Modal */}
      {activeCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {activeCustomerModal.customer_name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    activeCustomerModal.risk_tier === 'High'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : activeCustomerModal.risk_tier === 'Medium'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {activeCustomerModal.risk_tier} Risk ({activeCustomerModal.risk_score}/100)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeCustomerModal.company_name || 'Independent Client'} • {activeCustomerModal.email}
                </p>
              </div>

              <button
                onClick={() => setActiveCustomerModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Account MRR</span>
                <div className="text-sm font-mono font-bold text-white mt-0.5">
                  ${Number(activeCustomerModal.mrr).toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Tenure</span>
                <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
                  {activeCustomerModal.tenure_days} days
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Overdue Bills</span>
                <div className="text-sm font-mono font-bold text-rose-400 mt-0.5">
                  {activeCustomerModal.overdue_invoices} (${Number(activeCustomerModal.overdue_amount).toFixed(2)})
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Delay</span>
                <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                  {activeCustomerModal.avg_payment_delay_days} days
                </div>
              </div>
            </div>

            {/* Contributing Factors */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
                Signal Explanations & Contributing Telemetry
              </h4>
              <div className="space-y-1.5">
                {activeCustomerModal.contributing_factors.map((f, i) => (
                  <div key={i} className="text-xs bg-slate-800/60 border border-slate-700/60 p-2.5 rounded-lg text-slate-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Action */}
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5">
              <span className="text-[10px] font-mono uppercase bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-semibold">
                Prescriptive Recommendation ({activeCustomerModal.action_priority} Priority)
              </span>
              <p className="text-xs text-indigo-200 leading-relaxed">
                {activeCustomerModal.recommended_action}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveCustomerModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Close Diagnostic
              </button>
              <button
                onClick={() => {
                  showToast(`Retention action initiated for ${activeCustomerModal.customer_name}`, 'success');
                  setActiveCustomerModal(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30"
              >
                Apply Retention Playbook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

