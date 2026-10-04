import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Search, Grid, List, Trash2, AlertTriangle, X, Package, CheckCircle, ArrowUpCircle } from 'lucide-react';

export default function Stock() {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // New states for Restock and Delete
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockVariantId, setRestockVariantId] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: '', category: '', sellingPrice: '', costPrice: '', description: '', image: '',
    variants: [{ color: '', size: '', stockQuantity: '' }]
  });

  const products = useLiveQuery(async () => {
    const allProducts = await db.products.toArray();
    const allVariants = await db.variants.toArray();
    return allProducts.map(prod => {
      const prodVariants = allVariants.filter(v => v.productId === prod.id);
      const totalStock = prodVariants.reduce((sum, v) => sum + (parseInt(v.stockQuantity) || 0), 0);
      return { ...prod, variants: prodVariants, totalStock, isLowStock: totalStock <= 5 && totalStock > 0, isOutStock: totalStock === 0 };
    }).filter(p => !p.isDeleted);
  });

  const safeProducts = products || [];
  const categories = ['All', ...new Set(safeProducts.map(p => p.category).filter(Boolean))];
  const filteredProducts = safeProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleVariantChange = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };
  const addVariantRow = () => setFormData({ ...formData, variants: [...formData.variants, { color: '', size: '', stockQuantity: '' }] });

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.sellingPrice) return;
    const newProductId = await db.products.add({
      name: formData.name, category: formData.category, sellingPrice: parseFloat(formData.sellingPrice),
      costPrice: parseFloat(formData.costPrice) || 0, description: formData.description, image: formData.image,
      createdAt: new Date(), isDeleted: false
    });
    const variantsToSave = formData.variants.filter(v => v.color && v.size && v.stockQuantity).map(v => ({
      productId: newProductId, color: v.color, size: v.size, stockQuantity: parseInt(v.stockQuantity)
    }));
    if (variantsToSave.length > 0) await db.variants.bulkAdd(variantsToSave);
    setFormData({ name: '', category: '', sellingPrice: '', costPrice: '', description: '', image: '', variants: [{ color: '', size: '', stockQuantity: '' }] });
    setShowModal(false);
  };

  // --- RESTOCK LOGIC ---
  const handleRestock = async () => {
    if (!restockVariantId || !restockQty) return;
    const variant = await db.variants.get(restockVariantId);
    await db.variants.update(restockVariantId, { stockQuantity: variant.stockQuantity + parseInt(restockQty) });
    setRestockProduct(null); setRestockVariantId(null); setRestockQty('');
  };

  // --- DELETE LOGIC ---
  const confirmDelete = async () => {
    if (deleteId) {
      await db.products.update(deleteId, { isDeleted: true });
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory</h2>
        <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium">
          <Plus size={18} /> Add Product
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${selectedCategory === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}><Grid size={20} /></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}><List size={20} /></button>
        </div>
      </div>

      {!products ? <div className="text-center py-12 text-gray-400">Loading...</div> : filteredProducts.length === 0 ? <div className="text-center py-12 text-gray-400">No products found.</div> : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div><h3 className="font-bold text-gray-900 dark:text-gray-100">{product.name}</h3><p className="text-xs text-gray-500">{product.category}</p></div>
                <button onClick={() => setDeleteId(product.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div><p className="text-xs text-gray-500">Price</p><p className="font-semibold">KES {product.sellingPrice.toLocaleString()}</p></div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Stock</p>
                  <div className="flex items-center gap-1 justify-end">
                    <span className={`font-bold ${product.isOutStock ? 'text-red-500' : product.isLowStock ? 'text-orange-500' : 'text-green-600'}`}>{product.totalStock}</span>
                    {product.isLowStock && !product.isOutStock && <AlertTriangle size={16} className="text-orange-500" />}
                  </div>
                </div>
              </div>
              {/* RESTOCK BUTTON */}
              <button onClick={() => { setRestockProduct(product); setRestockVariantId(product.variants[0]?.id); setRestockQty(''); }}
                className="w-full mt-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-2">
                <ArrowUpCircle size={16} /> Restock
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ADD PRODUCT MODAL (Same as before) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">Add New Product</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Name *</label><input name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium mb-1">Category *</label><input name="category" required value={formData.category} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium mb-1">Selling Price *</label><input name="sellingPrice" type="number" required value={formData.sellingPrice} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium mb-1">Cost Price</label><input name="costPrice" type="number" value={formData.costPrice} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" /></div>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-3"><label className="block text-sm font-medium">Variants</label><button type="button" onClick={addVariantRow} className="text-sm text-primary-600 font-medium">+ Add Variant</button></div>
                <div className="space-y-3">
                  {formData.variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-3 gap-3">
                      <input placeholder="Color" value={v.color} onChange={(e) => handleVariantChange(i, 'color', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
                      <input placeholder="Size" value={v.size} onChange={(e) => handleVariantChange(i, 'size', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
                      <input type="number" placeholder="Qty" value={v.stockQuantity} onChange={(e) => handleVariantChange(i, 'stockQuantity', e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-gray-600 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-lg bg-primary-600 text-white font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {restockProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><ArrowUpCircle size={20} className="text-primary-600" /> Restock Item</h3>
              <button onClick={() => setRestockProduct(null)}><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Adding stock to: <span className="font-bold text-gray-900 dark:text-gray-100">{restockProduct.name}</span></p>
            
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Select Variant</label>
            <select value={restockVariantId || ''} onChange={(e) => setRestockVariantId(Number(e.target.value))} className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mb-4">
              {restockProduct.variants.map(v => (
                <option key={v.id} value={v.id}>{v.color} / {v.size} (Current: {v.stockQuantity})</option>
              ))}
            </select>

            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Quantity to Add</label>
            <input type="number" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} placeholder="e.g. 10" className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-lg font-bold mb-4" />
         <button 
  onClick={handleRestock} 
  disabled={!restockVariantId || !restockQty} 
  style={{
    backgroundColor: (!restockVariantId || !restockQty) ? '#f3f4f6' : '#2563eb',
    color: (!restockVariantId || !restockQty) ? '#9ca3af' : '#ffffff'
  }}
  className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-2 border-transparent hover:border-blue-700"
>
  <CheckCircle size={18} /> Confirm Restock
</button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-red-600 flex items-center gap-2"><AlertTriangle size={20} /> Confirm Delete</h3>
              <button onClick={() => setDeleteId(null)}><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to hide this product? It will be removed from the stock list, but past sales history will be kept.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Yes, Hide It</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}