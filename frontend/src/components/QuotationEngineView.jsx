import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Briefcase, 
  Plus, 
  Send, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle,
  Eye,
  X,
  User,
  Calendar,
  CreditCard
} from 'lucide-react';

export default function QuotationEngineView() {
  const [quotations, setQuotations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [inspectQuote, setInspectQuote] = useState(null);

  const [fromTemplateReq, setFromTemplateReq] = useState({
    customer_id: '',
    template_id: '',
    payment_terms: 'Net 30',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [qRes, tRes, uRes] = await Promise.all([
        api.getQuotations(),
        api.getQuotationTemplates(),
        api.getUsers('customer'),
      ]);
      setQuotations(qRes?.data || []);
      setTemplates(tRes?.data || []);
      
      const custList = (uRes?.data || [])
        .filter((u) => u.customer_profile)
        .map((u) => ({
          id: u.customer_profile.id,
          name: u.customer_profile.company_name || u.full_name,
          email: u.email,
        }));
      setCustomers(custList);

      if (custList.length > 0 && !fromTemplateReq.customer_id) {
        setFromTemplateReq((prev) => ({ ...prev, customer_id: custList[0].id }));
      }
      if (tRes?.data?.length > 0 && !fromTemplateReq.template_id) {
        setFromTemplateReq((prev) => ({ ...prev, template_id: tRes.data[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateQuote = async (e) => {
    e.preventDefault();
    if (!fromTemplateReq.customer_id || !fromTemplateReq.template_id) {
      alert('Please select both a customer and a quotation template.');
      return;
    }
    try {
      await api.createQuotationFromTemplate({
        customer_id: parseInt(fromTemplateReq.customer_id, 10),
        template_id: parseInt(fromTemplateReq.template_id, 10),
        payment_terms: fromTemplateReq.payment_terms,
        notes: fromTemplateReq.notes || undefined,
      });
      setShowGenerateModal(false);
      fetchData();
    } catch (err) {
      alert(`Error generating quote: ${err.message}`);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.updateQuotationStatus(id, status);
      fetchData();
      if (inspectQuote && inspectQuote.id === id) {
        setInspectQuote({ ...inspectQuote, status });
      }
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'sent':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'confirmed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'rejected':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'expired':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-400" />
            Quotation Engine & Customer Proposals
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Turn templates into customer offers, calculate live line-item discounts, and manage proposal lifecycles.
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          disabled={templates.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Generate Offer from Template
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading quotations...</div>
      ) : quotations.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
          No quotations generated yet. Click "Generate Offer from Template" to construct a customer proposal.
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-900/80 border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Quote Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Terms</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {quotations.map((q) => (
                <tr key={q.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-semibold text-indigo-300">
                    {q.quote_number}
                  </td>
                  <td className="py-3 px-4 font-medium text-white">
                    {q.customer?.company_name || `Customer #${q.customer_id}`}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-300">{q.plan?.name || `Plan #${q.plan_id}`}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {q.valid_until}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {q.payment_terms}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                    ${parseFloat(q.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(q.status)}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => setInspectQuote(q)}
                      className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition"
                      title="Inspect Details"
                    >
                      <Eye className="w-4 h-4 inline" />
                    </button>
                    {q.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(q.id, 'sent')}
                        className="text-sky-400 hover:text-sky-300 text-xs px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 rounded border border-sky-500/30 transition"
                      >
                        Send
                      </button>
                    )}
                    {q.status === 'sent' && (
                      <button
                        onClick={() => handleStatusChange(q.id, 'confirmed')}
                        className="text-emerald-400 hover:text-emerald-300 text-xs px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/30 transition"
                      >
                        Confirm
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate From Template Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                Generate Customer Quotation
              </h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateQuote} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Customer</label>
                <select
                  required
                  value={fromTemplateReq.customer_id}
                  onChange={(e) => setFromTemplateReq({ ...fromTemplateReq, customer_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Quotation Template</label>
                <select
                  required
                  value={fromTemplateReq.template_id}
                  onChange={(e) => setFromTemplateReq({ ...fromTemplateReq, template_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Valid {t.validity_days}d)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Terms</label>
                <select
                  value={fromTemplateReq.payment_terms}
                  onChange={(e) => setFromTemplateReq({ ...fromTemplateReq, payment_terms: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Immediate">Immediate Payment</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Instructions</label>
                <textarea
                  rows="2"
                  placeholder="Special instructions for customer"
                  value={fromTemplateReq.notes}
                  onChange={(e) => setFromTemplateReq({ ...fromTemplateReq, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300">
                Validity expiration date and itemized lines will be automatically cloned and computed using exact Decimal arithmetic.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
                >
                  Generate Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Quotation Modal */}
      {inspectQuote && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Formal Quotation Offer</span>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {inspectQuote.quote_number}
                  <span className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(inspectQuote.status)}`}>
                    {inspectQuote.status}
                  </span>
                </h3>
              </div>
              <button onClick={() => setInspectQuote(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-3.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-400 block">Customer</span>
                <p className="font-semibold text-white mt-0.5">{inspectQuote.customer?.company_name || `Customer #${inspectQuote.customer_id}`}</p>
              </div>
              <div>
                <span className="text-slate-400 block">Subscription Plan</span>
                <p className="font-semibold text-indigo-300 mt-0.5">{inspectQuote.plan?.name || `Plan #${inspectQuote.plan_id}`}</p>
              </div>
              <div>
                <span className="text-slate-400 block">Valid Until</span>
                <p className="font-mono font-semibold text-amber-300 mt-0.5">{inspectQuote.valid_until}</p>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Terms</span>
                <p className="font-semibold text-slate-200 mt-0.5">{inspectQuote.payment_terms}</p>
              </div>
              <div>
                <span className="text-slate-400 block">Created At</span>
                <p className="font-mono text-slate-300 mt-0.5">{new Date(inspectQuote.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Line Items</span>
              <table className="w-full text-left text-xs bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Product & Variant</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Disc %</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {inspectQuote.lines?.map((line) => (
                    <tr key={line.id}>
                      <td className="p-2.5 text-slate-200">
                        <span className="font-medium">{line.product?.name || `Product #${line.product_id}`}</span>
                        {line.variant && (
                          <span className="block text-[11px] text-indigo-400 font-mono">
                            {line.variant.variant_name}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono">{line.quantity}</td>
                      <td className="p-2.5 text-right font-mono">${parseFloat(line.unit_price).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-amber-400">{parseFloat(line.discount_percent)}%</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-400">${parseFloat(line.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5 text-xs text-right">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">${parseFloat(inspectQuote.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Discounts:</span>
                <span className="font-mono text-amber-400">-${parseFloat(inspectQuote.discount_total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-400">${parseFloat(inspectQuote.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {inspectQuote.notes && (
              <p className="text-xs text-slate-400 italic">Notes: {inspectQuote.notes}</p>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <div className="space-x-2">
                {inspectQuote.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange(inspectQuote.id, 'sent')}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition"
                  >
                    Mark as Sent
                  </button>
                )}
                {inspectQuote.status === 'sent' && (
                  <button
                    onClick={() => handleStatusChange(inspectQuote.id, 'confirmed')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition"
                  >
                    Confirm Proposal
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setInspectQuote(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
