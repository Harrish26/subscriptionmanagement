import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  Package, 
  Plus, 
  Trash2, 
  Layers, 
  Tag, 
  DollarSign, 
  AlertCircle, 
  Check, 
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ProductCatalogView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [variantModalProduct, setVariantModalProduct] = useState(null);

  // Form states
  const [newProduct, setNewProduct] = useState({
    name: '',
    product_type: 'software',
    sales_price: '',
    cost_price: '0.00',
    notes: '',
  });

  const [newVariant, setNewVariant] = useState({
    variant_name: '',
    sku: '',
    brand_attribute: '',
    price_surcharge: '0.00',
  });

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProducts(false);
      setProducts(res?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.createProduct({
        ...newProduct,
        sales_price: parseFloat(newProduct.sales_price) || 0,
        cost_price: parseFloat(newProduct.cost_price) || 0,
      });
      setShowAddModal(false);
      setNewProduct({ name: '', product_type: 'software', sales_price: '', cost_price: '0.00', notes: '' });
      fetchProducts();
    } catch (err) {
      alert(`Error creating product: ${err.message}`);
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!variantModalProduct) return;
    try {
      await api.addVariant(variantModalProduct.id, {
        variant_name: newVariant.variant_name,
        sku: newVariant.sku || undefined,
        attributes: newVariant.brand_attribute ? { brand: newVariant.brand_attribute } : {},
        price_surcharge: parseFloat(newVariant.price_surcharge) || 0,
        is_active: true,
      });
      setVariantModalProduct(null);
      setNewVariant({ variant_name: '', sku: '', brand_attribute: '', price_surcharge: '0.00' });
      fetchProducts();
    } catch (err) {
      alert(`Error adding variant: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      await api.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert(`Error deleting product: ${err.message}`);
    }
  };

  const handleDeleteVariant = async (variantId, variantName) => {
    if (!window.confirm(`Delete variant "${variantName}"?`)) return;
    try {
      await api.deleteVariant(variantId);
      fetchProducts();
    } catch (err) {
      alert(`Error deleting variant: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-400" />
            Product Catalog & Multi-Attribute Variants
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage business software, recurring add-ons, and dynamic price surcharges (e.g. Odoo brand +$560.00).
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading product catalog...</div>
      ) : products.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
          No products found. Click "Add Product" to create your first item.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{product.name}</h3>
                      <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {product.product_type}
                      </span>
                    </div>
                    {product.notes && <p className="text-xs text-slate-400 mt-0.5">{product.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Base Sales Price</span>
                    <p className="text-lg font-bold text-emerald-400">${parseFloat(product.sales_price).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteProduct(product.id, product.name)}
                    className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800 transition"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Variants Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Configured Multi-Attribute Variants ({product.variants?.length || 0})
                  </span>
                  <button
                    onClick={() => setVariantModalProduct(product)}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add Variant
                  </button>
                </div>

                {product.variants && product.variants.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {product.variants.map((v) => {
                      const surcharge = parseFloat(v.price_surcharge);
                      const effectivePrice = parseFloat(product.sales_price) + surcharge;
                      return (
                        <div
                          key={v.id}
                          className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/90 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">{v.variant_name}</p>
                            {v.sku && <span className="text-[10px] text-slate-400 font-mono">SKU: {v.sku}</span>}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-amber-300 font-medium">
                                {surcharge >= 0 ? `+${surcharge.toFixed(2)}` : `${surcharge.toFixed(2)}`}
                              </span>
                              <span className="text-[11px] text-slate-400">• Effective: ${effectivePrice.toFixed(2)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteVariant(v.id, v.variant_name)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800"
                            title="Remove Variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/40">
                    No variants added. Base price applies to standard edition.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                Add New Product
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brightloop CRM Suite"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                  <select
                    value={newProduct.product_type}
                    onChange={(e) => setNewProduct({ ...newProduct, product_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="software">Software</option>
                    <option value="service">Service</option>
                    <option value="addon">Add-on</option>
                    <option value="hardware">Hardware</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sales Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="1200.00"
                    value={newProduct.sales_price}
                    onChange={(e) => setNewProduct({ ...newProduct, sales_price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cost Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProduct.cost_price}
                  onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Internal Notes</label>
                <textarea
                  rows="2"
                  placeholder="Notes about availability or licensing"
                  value={newProduct.notes}
                  onChange={(e) => setNewProduct({ ...newProduct, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Variant Modal */}
      {variantModalProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  Add Multi-Attribute Variant
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">For {variantModalProduct.name}</p>
              </div>
              <button onClick={() => setVariantModalProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVariant} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Variant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brand: Odoo Engine or Tier: Enterprise"
                  value={newVariant.variant_name}
                  onChange={(e) => setNewVariant({ ...newVariant, variant_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">SKU (Optional)</label>
                  <input
                    type="text"
                    placeholder="ODOO-MOD-01"
                    value={newVariant.sku}
                    onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Brand / Key Attribute</label>
                  <input
                    type="text"
                    placeholder="e.g. Odoo"
                    value={newVariant.brand_attribute}
                    onChange={(e) => setNewVariant({ ...newVariant, brand_attribute: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Price Surcharge ($)
                  <span className="text-slate-500 ml-1 font-normal">(adds to base ${parseFloat(variantModalProduct.sales_price).toFixed(2)})</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="560.00"
                  value={newVariant.price_surcharge}
                  onChange={(e) => setNewVariant({ ...newVariant, price_surcharge: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300">
                Calculated Effective Price:{' '}
                <strong className="text-white">
                  ${(parseFloat(variantModalProduct.sales_price) + (parseFloat(newVariant.price_surcharge) || 0)).toFixed(2)}
                </strong>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setVariantModalProduct(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
                >
                  Save Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
