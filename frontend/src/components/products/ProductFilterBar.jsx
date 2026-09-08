import React, { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, Download, Upload, FileSpreadsheet, Plus, Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';

export default function ProductFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  categories,
  onNewProduct,
  onOpenImport,
  onExportExcel,
  onDownloadTemplate,
  isExporting
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Debounce sur la recherche textuelle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onFilterChange({ search: searchTerm, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Synchroniser si le parent réinitialise
  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  // Récupérer les sous-catégories de la catégorie actuellement sélectionnée
  const safeCategories = Array.isArray(categories) ? categories : [];
  const selectedCategoryObj = safeCategories.find((c) => c._id === filters.category);
  const availableSubCategories = selectedCategoryObj?.subCategories || [];

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    onFilterChange({
      category: categoryId,
      subCategory: '', // Réinitialise la sous-catégorie si on change de catégorie
      page: 1
    });
  };

  const handleSubCategoryChange = (e) => {
    onFilterChange({ subCategory: e.target.value, page: 1 });
  };

  const handleStartDateChange = (date) => {
    onFilterChange({
      startDate: date ? date.toISOString().split('T')[0] : '',
      page: 1
    });
  };

  const handleEndDateChange = (date) => {
    onFilterChange({
      endDate: date ? date.toISOString().split('T')[0] : '',
      page: 1
    });
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.category || filters.subCategory || filters.startDate || filters.endDate
  );

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const hasCategoryOrDateFilter = Boolean(filters.category || filters.subCategory || filters.startDate || filters.endDate);

  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs mb-4 sm:mb-6 space-y-3 sm:space-y-4">
      {/* Ligne 1 : Boutons d'action principaux */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div className="w-full sm:w-auto">
          <button
            onClick={onNewProduct}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Produit</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
          <button
            onClick={onDownloadTemplate}
            title="Télécharger un modèle Excel pour guider votre import"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            <span>Modèle</span>
          </button>
          <button
            onClick={onOpenImport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Importer</span>
          </button>
          <button
            onClick={onExportExcel}
            disabled={isExporting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{isExporting ? 'Export...' : 'Exporter'}</span>
          </button>
        </div>
      </div>

      {/* Ligne 2 : Recherche & Bascule Filtres Avancés */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher nom, SKU, marque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white transition"
          />
        </div>

        {/* Bouton pour afficher/masquer filtres avancés sur mobile */}
        <button
          type="button"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={`sm:hidden flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-xs font-semibold transition cursor-pointer ${
            hasCategoryOrDateFilter || showMobileFilters
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filtres</span>
          {hasCategoryOrDateFilter && (
            <span className="w-2 h-2 rounded-full bg-blue-600" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            title="Réinitialiser tous les filtres"
            className="sm:hidden p-2.5 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Ligne 3 : Filtres détaillés (Catégories + Dates) : Toujours visible sur desktop, repliable sur mobile */}
      <div className={`${showMobileFilters ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 sm:pt-0`}>
        {/* Sélection Catégorie */}
        <div>
          <select
            value={filters.category || ''}
            onChange={handleCategoryChange}
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="">Toutes les catégories</option>
            {safeCategories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sélection Sous-catégorie dynamique */}
        <div>
          <select
            value={filters.subCategory || ''}
            onChange={handleSubCategoryChange}
            disabled={!filters.category || availableSubCategories.length === 0}
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <option value="">
              {!filters.category
                ? 'Sous-catégorie'
                : availableSubCategories.length === 0
                ? 'Aucune sous-catégorie'
                : 'Toutes sous-catégories'}
            </option>
            {availableSubCategories.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Plage de dates : Début */}
        <div>
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : null}
            onChange={handleStartDateChange}
            placeholderText="Du (création)"
            dateFormat="dd/MM/yyyy"
            isClearable
            maxDate={filters.endDate ? new Date(filters.endDate) : null}
          />
        </div>

        {/* Plage de dates : Fin + Reset */}
        <div className="flex gap-2">
          <div className="flex-1">
            <DatePicker
              selected={filters.endDate ? new Date(filters.endDate) : null}
              onChange={handleEndDateChange}
              placeholderText="Au (création)"
              dateFormat="dd/MM/yyyy"
              isClearable
              minDate={filters.startDate ? new Date(filters.startDate) : null}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              title="Réinitialiser tous les filtres"
              className="hidden sm:flex items-center justify-center p-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
