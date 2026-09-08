import React, { useState, useEffect } from 'react';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  exportCategoriesExcel
} from '../../api/client';
import { Layers, Plus, Edit2, Trash2, Download, ChevronRight, FolderPlus } from 'lucide-react';
import Modal from '../common/Modal';

export default function CategoryManager({ onShowToast }) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Modals state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const res = await getCategories();
      setCategories(res.data.data);
      if (res.data.data.length > 0 && !selectedCategory) {
        setSelectedCategory(res.data.data[0]);
      } else if (selectedCategory) {
        const found = res.data.data.find((c) => c._id === selectedCategory._id);
        setSelectedCategory(found || res.data.data[0] || null);
      }
    } catch (err) {
      onShowToast('error', 'Erreur lors du chargement des catégories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Catégorie handlers
  const handleOpenCatModal = (cat = null) => {
    setEditingCat(cat);
    setCatName(cat ? cat.name : '');
    setCatDesc(cat ? cat.description || '' : '');
    setCatModalOpen(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await updateCategory(editingCat._id, { name: catName, description: catDesc });
        onShowToast('success', 'Catégorie modifiée avec succès.');
      } else {
        await createCategory({ name: catName, description: catDesc });
        onShowToast('success', 'Catégorie créée avec succès.');
      }
      setCatModalOpen(false);
      loadCategories();
    } catch (err) {
      onShowToast('error', err.response?.data?.message || 'Erreur enregistrement catégorie.');
    }
  };

  const handleDeleteCat = async (cat) => {
    if (!window.confirm(`Supprimer la catégorie '${cat.name}' et ses sous-catégories ?`)) return;
    try {
      await deleteCategory(cat._id);
      onShowToast('success', 'Catégorie supprimée.');
      loadCategories();
    } catch (err) {
      onShowToast('error', err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  // Sous-catégorie handlers
  const handleOpenSubModal = (sub = null) => {
    setEditingSub(sub);
    setSubName(sub ? sub.name : '');
    setSubDesc(sub ? sub.description || '' : '');
    setSubModalOpen(true);
  };

  const handleSaveSub = async (e) => {
    e.preventDefault();
    if (!selectedCategory) return;
    try {
      if (editingSub) {
        await updateSubCategory(editingSub._id, { name: subName, description: subDesc });
        onShowToast('success', 'Sous-catégorie modifiée.');
      } else {
        await createSubCategory({
          name: subName,
          categoryId: selectedCategory._id,
          description: subDesc
        });
        onShowToast('success', 'Sous-catégorie ajoutée.');
      }
      setSubModalOpen(false);
      loadCategories();
    } catch (err) {
      onShowToast('error', err.response?.data?.message || 'Erreur enregistrement sous-catégorie.');
    }
  };

  const handleDeleteSub = async (sub) => {
    if (!window.confirm(`Supprimer la sous-catégorie '${sub.name}' ?`)) return;
    try {
      await deleteSubCategory(sub._id);
      onShowToast('success', 'Sous-catégorie supprimée.');
      loadCategories();
    } catch (err) {
      onShowToast('error', err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Arborescence Catégories & Sous-catégories</h2>
          <p className="text-xs text-slate-500">
            Structure hiérarchique parente-enfant pour le classement des produits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCategoriesExcel()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exporter Excel
          </button>
          <button
            onClick={() => handleOpenCatModal(null)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Catégorie
          </button>
        </div>
      </div>

      {/* Main layout : 2 columns (Categories list / Subcategories list) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Colonne gauche : Catégories parentes */}
        <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Catégories ({categories.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {categories.map((cat) => {
              const isSelected = selectedCategory?._id === cat._id;
              const subCount = cat.subCategories?.length || 0;
              return (
                <div
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-50/70 border-l-4 border-blue-600 text-blue-900'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-semibold text-sm">{cat.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {subCount} sous-catégorie(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenCatModal(cat)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCat(cat)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })}

            {categories.length === 0 && !isLoading && (
              <div className="p-8 text-center text-xs text-slate-500">
                Aucune catégorie. Cliquez sur "Nouvelle Catégorie" pour commencer.
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : Sous-catégories de la catégorie sélectionnée */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Sous-catégories de :{' '}
                <span className="text-blue-600 font-semibold">{selectedCategory?.name || 'Aucune sélection'}</span>
              </span>
            </div>
            {selectedCategory && (
              <button
                onClick={() => handleOpenSubModal(null)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Ajouter une sous-catégorie
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {selectedCategory?.subCategories && selectedCategory.subCategories.length > 0 ? (
              selectedCategory.subCategories.map((sub) => (
                <div
                  key={sub._id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{sub.name}</div>
                    {sub.description && (
                      <div className="text-xs text-slate-500">{sub.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenSubModal(sub)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSub(sub)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-xs text-slate-500">
                {selectedCategory
                  ? 'Aucune sous-catégorie pour le moment. Cliquez sur "Ajouter une sous-catégorie".'
                  : 'Sélectionnez une catégorie pour afficher ses sous-catégories.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Catégorie */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCat ? 'Modifier la catégorie' : 'Nouvelle Catégorie'}
      >
        <form onSubmit={handleSaveCat} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: Chaussures, Vêtements..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description (optionnel)</label>
            <textarea
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              rows="2"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setCatModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Sous-Catégorie */}
      <Modal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        title={
          editingSub
            ? 'Modifier la sous-catégorie'
            : `Nouvelle Sous-catégorie pour "${selectedCategory?.name}"`
        }
      >
        <form onSubmit={handleSaveSub} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              required
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Ex: Sport, Ville, Détente..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description (optionnel)</label>
            <textarea
              value={subDesc}
              onChange={(e) => setSubDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              rows="2"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setSubModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
