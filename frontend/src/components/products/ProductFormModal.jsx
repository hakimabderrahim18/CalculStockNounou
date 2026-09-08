import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { AlertCircle } from 'lucide-react';

export default function ProductFormModal({
  isOpen,
  onClose,
  productToEdit,
  categories,
  onSave
}) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    subCategoryId: '',
    image: '',
    stockQuantity: 0,
    storeQuantity: 0
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(productToEdit);

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name || '',
        sku: productToEdit.sku || '',
        brand: productToEdit.brand || '',
        price: productToEdit.price || 0,
        categoryId: productToEdit.categoryId?._id || productToEdit.categoryId || '',
        subCategoryId: productToEdit.subCategoryId?._id || productToEdit.subCategoryId || '',
        image: productToEdit.image || '',
        stockQuantity: productToEdit.stockQuantity || 0,
        storeQuantity: productToEdit.storeQuantity || 0
      });
      setError('');
    } else {
      setFormData({
        name: '',
        sku: '',
        brand: '',
        price: 0,
        categoryId: categories.length > 0 ? categories[0]._id : '',
        subCategoryId: '',
        image: '',
        stockQuantity: 0,
        storeQuantity: 0
      });
      setError('');
    }
  }, [productToEdit, isOpen, categories]);

  // Récupérer les sous-catégories de la catégorie sélectionnée
  const selectedCategoryObj = categories.find((c) => c._id === formData.categoryId);
  const availableSubCategories = selectedCategoryObj?.subCategories || [];

  // Mettre à jour la sous-catégorie par défaut si elle n'est plus valide
  const handleCategoryChange = (e) => {
    const newCatId = e.target.value;
    const catObj = categories.find((c) => c._id === newCatId);
    const firstSubId = catObj?.subCategories?.[0]?._id || '';
    setFormData((prev) => ({
      ...prev,
      categoryId: newCatId,
      subCategoryId: firstSubId
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      setError('Le nom et la référence/SKU sont obligatoires.');
      return;
    }
    if (!formData.categoryId || !formData.subCategoryId) {
      setError('Veuillez sélectionner une catégorie et une sous-catégorie.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSave({
        ...formData,
        sku: formData.sku.trim().toUpperCase(),
        name: formData.name.trim(),
        stockQuantity: Number(formData.stockQuantity) || 0,
        storeQuantity: Number(formData.storeQuantity) || 0
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde du produit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Modifier la fiche produit' : 'Créer un nouveau produit'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nom du produit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nom du produit <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: Chaussures de running Air"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Référence / SKU <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: CH-RUN-001"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catégorie <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.categoryId}
              onChange={handleCategoryChange}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sous-catégorie dynamique */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sous-catégorie <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.subCategoryId}
              onChange={(e) => setFormData({ ...formData, subCategoryId: e.target.value })}
              disabled={!formData.categoryId || availableSubCategories.length === 0}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {availableSubCategories.length === 0
                  ? 'Aucune sous-catégorie disponible'
                  : 'Sélectionner une sous-catégorie'}
              </option>
              {availableSubCategories.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantités initiales (uniquement lors de la création pour éviter les incohérences d'historique) */}
        {!isEditing ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Quantités initiales de stock
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Stock Entrepôt initial
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Stock Magasin initial
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.storeQuantity}
                  onChange={(e) => setFormData({ ...formData, storeQuantity: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Note : Les modifications ultérieures de quantité devront obligatoirement être validées avec un motif.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
            Pour modifier les stocks entrepôt ou magasin d'un produit existant, utilisez directement les boutons d'ajustement de stock dans le tableau afin d'enregistrer le motif dans l'historique.
          </div>
        )}

        {/* Marque & Prix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Marque (optionnel)
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: Nike, Apple, Samsung..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prix (TTC / Vente)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* URL Image (optionnel) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            URL de l'image (optionnel)
          </label>
          <input
            type="url"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="https://images.unsplash.com/photo-..."
          />
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm shadow-blue-600/30 transition cursor-pointer"
          >
            {isSubmitting ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer le produit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
