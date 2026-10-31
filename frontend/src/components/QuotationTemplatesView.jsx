import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  Check, 
  X, 
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';

export default function QuotationTemplatesView() {
  const [templates, setTemplates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    plan_id: '',
    validity_days: 30,
    lines: [],
  });

  const [currentLine, setCurrentLine] = useState({
    product_id: '',
    variant_id: '',
    quantity: 1,
    discount_percent: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, pRes, prRes] = await Promise.all([
        api.getQuotationTemplates(),
        api.getPlans(true),
        api.getProducts(true),
      ]);
      setTemplates(tRes?.data || []);
      setPlans(pRes?.data || []);
      setProducts(prRes?.data || []);
      if (pRes?.data?.length > 0 && !newTemplate.plan_id) {
        setNewTemplate((prev) => ({ ...prev, plan_id: pRes.data[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load templates or catalog data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLineToDraft = () => {
    if (!currentLine.product_id) {
      alert('Please select a product');
      return;
    }
    const prod = products.find((p) => p.id === parseInt(currentLine.product_id, 10));
    const variant = prod?.variants?.find((v) => v.id === parseInt(currentLine.variant_id, 10));

    setNewTemplate({
      ...newTemplate,
      lines: [
        ...newTemplate.lines,
        {
          product_id: parseInt(currentLine.product_id, 10),
          variant_id: currentLine.variant_id ? parseInt(currentLine.variant_id, 10) : null,
          quantity: parseInt(currentLine.quantity, 10) || 1,
          discount_percent: parseFloat(currentLine.discount_percent) || 0,
          product_name: prod?.name,
          variant_name: variant?.variant_name,
        },
      ],
    });

    setCurrentLine({ product_id: '', variant_id: '', quantity: 1, discount_percent: 0 });
  };

  const handleRemoveDraftLine = (index) => {
    const updated = [...newTemplate.lines];
    updated.splice(index, 1);
    setNewTemplate({ ...newTemplate, lines: updated });
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (newTemplate.lines.length === 0) {
      alert('Please add at least one product line to the template.');
      return;
    }
    try {
      await api.createQuotationTemplate({
        name: newTemplate.name,
        description: newTemplate.description,
        plan_id: parseInt(newTemplate.plan_id, 10),
        validity_days: parseInt(newTemplate.validity_days, 10) || 30,
        lines: newTemplate.lines.map((l) => ({
          product_id: l.product_id,
          variant_id: l.variant_id,
          quantity: l.quantity,
          discount_percent: l.discount_percent,
        })),
      });
      setShowModal(false);
      setNewTemplate({ name: '', description: '', plan_id: plans[0]?.id || '', validity_days: 30, lines: [] });
      fetchData();
    } catch (err) {
      alert(`Error creating template: ${err.message}`);
    }
  };

  const handleDeleteTemplate = async (id, name) => {
    if (!window.confirm(`Delete quotation template "${name}"?`)) return;
    try {
      await api.deleteQuotationTemplate(id);
      fetchData();
    } catch (err) {
      alert(`Error deleting template: ${err.message}`);
    }
  };

  // Selected product in the line builder to show variants
  const selectedProductForLine = products.find((p) => p.id === parseInt(currentLine.product_id, 10));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
            Quotation Templates (Sales Blueprints)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Standardized offer blueprints pre-bundled with plans, product lines, and predefined validity windows.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading quotation templates...</div>
      ) : templates.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
          No templates found. Click "Create Template" to build a standard offer.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{tmpl.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        Plan: {tmpl.plan?.name || `Plan #${tmpl.plan_id}`}
                      </span>
                      <span className="text-xs text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Valid {tmpl.validity_days} days
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {tmpl.description && <p className="text-xs text-slate-400 mt-2">{tmpl.description}</p>}

                {/* Predefined Line Items */}
                <div className="mt-4 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Bundled Products ({tmpl.lines?.length || 0})
                  </span>
                  <div className="space-y-1.5">
                    {tmpl.lines?.map((line) => (
                      <div
                        key={line.id}
                        className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-medium text-slate-200">
                            {line.quantity}x {line.product?.name || `Product #${line.product_id}`}
                          </p>
                          {line.variant && (
                            <span className="text-[11px] text-indigo-300 font-mono block">
                              Variant: {line.variant.variant_name}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-emerald-400">${parseFloat(line.unit_price).toFixed(2)}/ea</p>
                          {parseFloat(line.discount_percent) > 0 && (
                            <span className="text-[10px] text-amber-400">-{parseFloat(line.discount_percent)}% disc</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                Build Quotation Template
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Odoo ERP Proposal"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Summary of bundle for sales reps"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Attached Plan</label>
                  <select
                    required
                    value={newTemplate.plan_id}
                    onChange={(e) => setNewTemplate({ ...newTemplate, plan_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${parseFloat(p.base_cost).toFixed(2)}/{p.billing_interval})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newTemplate.validity_days}
                    onChange={(e) => setNewTemplate({ ...newTemplate, validity_days: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                <span className="block text-xs font-semibold text-slate-300">Add Product Line to Template</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Product</label>
                    <select
                      value={currentLine.product_id}
                      onChange={(e) => setCurrentLine({ ...currentLine, product_id: e.target.value, variant_id: '' })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${parseFloat(p.sales_price).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Variant (Optional)</label>
                    <select
                      value={currentLine.variant_id}
                      onChange={(e) => setCurrentLine({ ...currentLine, variant_id: e.target.value })}
                      disabled={!selectedProductForLine || selectedProductForLine.variants?.length === 0}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white disabled:opacity-40"
                    >
                      <option value="">Base / Standard</option>
                      {selectedProductForLine?.variants?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.variant_name} (+${parseFloat(v.price_surcharge).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={currentLine.quantity}
                      onChange={(e) => setCurrentLine({ ...currentLine, quantity: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={currentLine.discount_percent}
                      onChange={(e) => setCurrentLine({ ...currentLine, discount_percent: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddLineToDraft}
                      className="w-full bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 py-1.5 rounded text-xs font-medium transition"
                    >
                      + Add Line
                    </button>
                  </div>
                </div>

                {/* Staged lines table */}
                {newTemplate.lines.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">Staged Lines:</span>
                    {newTemplate.lines.map((line, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-slate-200">
                          {line.quantity}x {line.product_name} {line.variant_name ? `(${line.variant_name})` : ''} - {line.discount_percent}% off
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftLine(idx)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
