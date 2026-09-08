import React, { useState, useEffect } from 'react';
import { Search, Download, RotateCcw } from 'lucide-react';
import DatePicker from 'react-datepicker';

export default function HistoryFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  onExportExcel,
  isExporting
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onFilterChange({ search: searchTerm, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  const handleTypeChange = (e) => {
    onFilterChange({ quantityType: e.target.value, page: 1 });
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
    filters.search || filters.quantityType || filters.startDate || filters.endDate || filters.productId
  );

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Journal d'audit des stocks</h2>
          <p className="text-xs text-slate-500">Traçabilité complète des entrées, sorties et ajustements</p>
        </div>
        <button
          onClick={onExportExcel}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Export en cours...' : 'Exporter l\'historique Excel'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Recherche */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher produit, motif, opérateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white"
          />
        </div>

        {/* Type d'emplacement */}
        <div>
          <select
            value={filters.quantityType || ''}
            onChange={handleTypeChange}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="">Tous les emplacements</option>
            <option value="STOCK">Stock Entrepôt uniquement</option>
            <option value="STORE">Stock Magasin uniquement</option>
          </select>
        </div>

        {/* Date Début */}
        <div>
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : null}
            onChange={handleStartDateChange}
            placeholderText="Date début"
            dateFormat="dd/MM/yyyy"
            isClearable
            maxDate={filters.endDate ? new Date(filters.endDate) : null}
          />
        </div>

        {/* Date Fin + Reset */}
        <div className="flex gap-2">
          <div className="flex-1">
            <DatePicker
              selected={filters.endDate ? new Date(filters.endDate) : null}
              onChange={handleEndDateChange}
              placeholderText="Date fin"
              dateFormat="dd/MM/yyyy"
              isClearable
              minDate={filters.startDate ? new Date(filters.startDate) : null}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              title="Réinitialiser les filtres"
              className="p-2.5 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
