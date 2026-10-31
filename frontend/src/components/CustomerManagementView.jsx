import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Brain,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Receipt,
  CreditCard,
  Building,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  TrendingUp,
  Activity,
  ShieldCheck,
  UserCheck,
  Pencil,
  Trash2
} from 'lucide-react';

export default function CustomerManagementView({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [balanceFilter, setBalanceFilter] = useState('ALL');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeCustomerDetail, setActiveCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'subscriptions' | 'invoices' | 'payments'
  const [toastMessage, setToastMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company_name: '',
    billing_address: '',
    phone: '',
    tax_identifier: '',
    password: 'Customer@Brightloop2026!'
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Edit state
  const [editFormData, setEditFormData] = useState({
    customer_id: null,
    full_name: '',
    email: '',
    company_name: '',
    billing_address: '',
    phone: '',
    tax_identifier: '',
    credit_balance: 0,
    password: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCustomersOverview();
      setCustomers(res?.data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
      const isNetworkErr = err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError');
      if (isNetworkErr) {
        setError('Cannot connect to backend API server at http://localhost:8000. Please ensure the backend server is running.');
      } else if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        setError('Session expired or unauthorized. Please log in using the Admin or Staff credentials.');
      } else {
        setError(err?.message || 'Failed to load customers directory.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      showToast('Please provide full name and email.', 'error');
      return;
    }
    setSavingCustomer(true);
    try {
      await api.createCustomerAccount(formData);
      showToast(`Customer '${formData.full_name}' onboarded successfully.`, 'success');
      setShowAddModal(false);
      setFormData({
        full_name: '',
        email: '',
        company_name: '',
        billing_address: '',
        phone: '',
        tax_identifier: '',
        password: 'Customer@Brightloop2026!'
      });
      await loadCustomers();
    } catch (err) {
      showToast(err?.message || 'Failed to create customer.', 'error');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleOpenDetail = async (customerId) => {
    setLoadingDetail(true);
    setActiveTab('overview');
    try {
      const res = await api.getCustomerFullDetail(customerId);
      setActiveCustomerDetail(res?.data || null);
    } catch (err) {
      showToast(err?.message || 'Failed to load customer profile details.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenEdit = (customer, e) => {
    if (e) e.stopPropagation();
    setEditFormData({
      customer_id: customer.customer_id || customer.id,
      full_name: customer.full_name || '',
      email: customer.email || '',
      company_name: customer.company_name || '',
      billing_address: customer.billing_address || '',
      phone: customer.phone || '',
      tax_identifier: customer.tax_identifier || '',
      credit_balance: customer.credit_balance || 0,
      password: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editFormData.full_name || !editFormData.email) {
      showToast('Please provide full name and email.', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      const payload = {
        full_name: editFormData.full_name,
        email: editFormData.email,
        company_name: editFormData.company_name || null,
        billing_address: editFormData.billing_address || null,
        phone: editFormData.phone || null,
        tax_identifier: editFormData.tax_identifier || null,
        credit_balance: Number(editFormData.credit_balance) || 0
      };
      if (editFormData.password && editFormData.password.trim().length > 0) {
        payload.password = editFormData.password.trim();
      }
      await api.updateCustomer(editFormData.customer_id, payload);
      showToast(`Customer '${editFormData.full_name}' updated successfully.`, 'success');
      setShowEditModal(false);
      if (activeCustomerDetail && (activeCustomerDetail.profile.customer_id === editFormData.customer_id || activeCustomerDetail.profile.id === editFormData.customer_id)) {
        await handleOpenDetail(editFormData.customer_id);
      }
      await loadCustomers();
    } catch (err) {
      showToast(err?.message || 'Failed to update customer.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCustomer = async (customerId, customerName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to deactivate or remove customer "${customerName}"? This action will archive their record.`)) {
      return;
    }
    try {
      await api.deleteCustomer(customerId);
      showToast(`Customer "${customerName}" removed successfully.`, 'success');
      if (activeCustomerDetail && (activeCustomerDetail.profile.customer_id === customerId || activeCustomerDetail.profile.id === customerId)) {
        setActiveCustomerDetail(null);
      }
      await loadCustomers();
    } catch (err) {
      showToast(err?.message || 'Failed to delete customer.', 'error');
    }
  };

  // Filtered customer directory
  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk =
      riskFilter === 'ALL' ||
      c.churn_risk_tier?.toLowerCase() === riskFilter.toLowerCase();

    const matchesBalance =
      balanceFilter === 'ALL' ||
      (balanceFilter === 'DEBT' && Number(c.outstanding_balance) > 0) ||
      (balanceFilter === 'CLEAR' && Number(c.outstanding_balance) === 0);

    return matchesSearch && matchesRisk && matchesBalance;
  });

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

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
                <Users className="w-5 h-5 text-indigo-400" />
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Customer Directory & 360° Account Ledger
              </h1>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Inspect customer subscription histories, itemized invoices, collections ledger, and live AI churn risk scores.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Onboard Customer</span>
            </button>
            <button
              onClick={loadCustomers}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
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

      {/* Search & Filtering Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, company, email, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Risk Filter */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'High', 'Medium', 'Low'].map(tier => (
              <button
                key={tier}
                onClick={() => setRiskFilter(tier)}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  riskFilter === tier
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tier === 'ALL' ? 'All Risk' : `${tier}`}
              </button>
            ))}
          </div>

          {/* Balance Filter */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: 'ALL', label: 'All Balances' },
              { id: 'DEBT', label: 'Has Debt' },
              { id: 'CLEAR', label: 'Clear ($0)' }
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setBalanceFilter(b.id)}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  balanceFilter === b.id
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Customer / Company</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Subscriptions</th>
                <th className="py-3.5 px-4">Financials</th>
                <th className="py-3.5 px-4">AI Churn Risk</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mx-auto mb-2" />
                    <span>Loading customer profiles...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No customers found matching the search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => {
                  const isHigh = c.churn_risk_tier === 'High';
                  const isMed = c.churn_risk_tier === 'Medium';
                  const badgeColor = isHigh
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : isMed
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                  const barColor = isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500';

                  return (
                    <tr
                      key={c.customer_id}
                      onClick={() => handleOpenDetail(c.customer_id)}
                      className="hover:bg-slate-800/30 transition cursor-pointer"
                    >
                      {/* Name & Company */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{c.full_name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Building className="w-3 h-3 text-slate-500" />
                          <span>{c.company_name || 'Independent Client'}</span>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{c.email}</span>
                        </div>
                        {c.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Subscriptions */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {c.active_subscriptions_count} Active
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {c.total_subscriptions_count} lifetime total
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-slate-200">
                          MRR: <span className="text-white font-bold">${Number(c.current_mrr).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-[11px]">
                          Due: <span className={Number(c.outstanding_balance) > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                            ${Number(c.outstanding_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>

                      {/* AI Churn Risk */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                            {c.churn_risk_tier} ({c.churn_risk_score}/100)
                          </span>
                          <span className="font-mono text-[11px] text-slate-300">{c.churn_probability_pct}%</span>
                        </div>
                        <div className="w-20 bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
                          <div className={`h-1 rounded-full ${barColor}`} style={{ width: `${c.churn_risk_score}%` }}></div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(c.customer_id);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition inline-flex items-center gap-1"
                            title="Inspect 360° Profile"
                          >
                            <span>360° Profile</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(c, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition"
                            title="Edit Customer Account"
                          >
                            <Pencil className="w-3.5 h-3.5 text-indigo-300" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteCustomer(c.customer_id, c.full_name, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-950/60 transition"
                            title="Deactivate Customer Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Onboard Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Onboard New Customer</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp / Jane Doe"
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="customer@domain.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Company Name</label>
                  <input
                    type="text"
                    placeholder="Legal Business Entity"
                    value={formData.company_name}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Billing Address</label>
                <input
                  type="text"
                  placeholder="Street, City, Postal Code, Country"
                  value={formData.billing_address}
                  onChange={e => setFormData({ ...formData, billing_address: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Tax Identifier</label>
                  <input
                    type="text"
                    placeholder="GSTIN / VAT / EIN"
                    value={formData.tax_identifier}
                    onChange={e => setFormData({ ...formData, tax_identifier: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Default Password</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {savingCustomer ? 'Onboarding...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Customer */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Edit Customer Account</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Company Name</label>
                  <input
                    type="text"
                    placeholder="Legal Business Entity"
                    value={editFormData.company_name}
                    onChange={e => setEditFormData({ ...editFormData, company_name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={editFormData.phone}
                    onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Billing Address</label>
                <input
                  type="text"
                  placeholder="Street, City, Postal Code, Country"
                  value={editFormData.billing_address}
                  onChange={e => setEditFormData({ ...editFormData, billing_address: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Tax Identifier</label>
                  <input
                    type="text"
                    placeholder="GSTIN / VAT / EIN"
                    value={editFormData.tax_identifier}
                    onChange={e => setEditFormData({ ...editFormData, tax_identifier: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Credit Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.credit_balance}
                    onChange={e => setEditFormData({ ...editFormData, credit_balance: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Reset Password (leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="New password if updating..."
                  value={editFormData.password}
                  onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer: Customer 360° Profile */}
      {activeCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">
                    {activeCustomerDetail.profile.full_name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    activeCustomerDetail.profile.churn_risk_tier === 'High'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : activeCustomerDetail.profile.churn_risk_tier === 'Medium'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {activeCustomerDetail.profile.churn_risk_tier} Risk ({activeCustomerDetail.profile.churn_risk_score}/100)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {activeCustomerDetail.profile.company_name || 'Individual Account'} • {activeCustomerDetail.profile.email} • ID #{activeCustomerDetail.profile.customer_id}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenEdit({
                    customer_id: activeCustomerDetail.profile.customer_id,
                    full_name: activeCustomerDetail.profile.full_name,
                    email: activeCustomerDetail.profile.email,
                    company_name: activeCustomerDetail.profile.company_name,
                    billing_address: activeCustomerDetail.profile.billing_address,
                    phone: activeCustomerDetail.profile.phone,
                    tax_identifier: activeCustomerDetail.profile.tax_identifier,
                    credit_balance: activeCustomerDetail.profile.credit_balance
                  })}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-indigo-300 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition"
                  title="Edit Customer Profile"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => setActiveCustomerDetail(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Sub-Header Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900 text-xs">
              {[
                { id: 'overview', label: '360° Overview', icon: Activity },
                { id: 'subscriptions', label: `Subscriptions (${activeCustomerDetail.subscriptions.length})`, icon: RefreshCw },
                { id: 'invoices', label: `Invoices (${activeCustomerDetail.invoices.length})`, icon: Receipt },
                { id: 'payments', label: `Payments (${activeCustomerDetail.payments.length})`, icon: CreditCard }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-medium transition ${
                      isActive
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Metrics 4-Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">Monthly Run-Rate</span>
                      <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                        ${Number(activeCustomerDetail.profile.current_mrr).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">Total Settled</span>
                      <div className="text-base font-bold font-mono text-white mt-0.5">
                        ${Number(activeCustomerDetail.profile.total_spend).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">Outstanding Due</span>
                      <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                        ${Number(activeCustomerDetail.profile.outstanding_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">Overdue Bills</span>
                      <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
                        {activeCustomerDetail.profile.overdue_invoices_count}
                      </div>
                    </div>
                  </div>

                  {/* AI Risk Card */}
                  {activeCustomerDetail.risk_analysis && (
                    <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-indigo-400" />
                          AI Churn Diagnostic & Recommendations
                        </span>
                        <span className="text-[10px] font-mono text-indigo-300">
                          Churn Probability: {activeCustomerDetail.risk_analysis.churn_probability_pct}%
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200">
                        {activeCustomerDetail.risk_analysis.recommended_action}
                      </p>
                    </div>
                  )}

                  {/* Contact Info Box */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300">Billing Address & Registry</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                      <div>Address: <span className="text-slate-200">{activeCustomerDetail.profile.billing_address || 'None configured'}</span></div>
                      <div>Tax Identifier: <span className="text-slate-200">{activeCustomerDetail.profile.tax_identifier || 'None'}</span></div>
                      <div>Credit Balance: <span className="text-slate-200 font-mono">${Number(activeCustomerDetail.profile.credit_balance).toFixed(2)}</span></div>
                      <div>Member Since: <span className="text-slate-200">{activeCustomerDetail.profile.created_at?.slice(0, 10)}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Subscriptions */}
              {activeTab === 'subscriptions' && (
                <div className="space-y-3">
                  {activeCustomerDetail.subscriptions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No subscription contracts found for this customer.
                    </div>
                  ) : (
                    activeCustomerDetail.subscriptions.map(s => (
                      <div key={s.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-white">{s.subscription_number} • {s.plan_name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Next Billing: <span className="font-mono text-slate-300">{s.next_billing_date}</span> ({s.billing_interval})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-200">${s.total_amount.toFixed(2)}</div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            s.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Invoices */}
              {activeTab === 'invoices' && (
                <div className="space-y-3">
                  {activeCustomerDetail.invoices.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No billing invoices recorded.
                    </div>
                  ) : (
                    activeCustomerDetail.invoices.map(inv => (
                      <div key={inv.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-white">{inv.invoice_number}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Issue: {inv.issue_date} • Due: {inv.due_date}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-200">${inv.total_amount.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Balance Due: ${inv.balance_due.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Payments */}
              {activeTab === 'payments' && (
                <div className="space-y-3">
                  {activeCustomerDetail.payments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No payments on file.
                    </div>
                  ) : (
                    activeCustomerDetail.payments.map(p => (
                      <div key={p.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-white">{p.payment_number}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Against: {p.invoice_number} • Date: {p.payment_date}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-400">${p.amount.toFixed(2)}</div>
                          <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                            {p.payment_method}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button
                onClick={() => setActiveCustomerDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

