import React, { useState, useEffect } from 'react';
import { getHistory, exportHistoryExcel } from '../api/client';
import HistoryFilterBar from '../components/history/HistoryFilterBar';
import HistoryTable from '../components/history/HistoryTable';
import { RotateCcw } from 'lucide-react';

export default function HistoryPage({ onShowToast, selectedProductId, onClearProductFilter }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    quantityType: '',
    productId: selectedProductId || '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 25
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    pages: 1
  });

  useEffect(() => {
    if (selectedProductId) {
      setFilters((prev) => ({ ...prev, productId: selectedProductId, page: 1 }));
    }
  }, [selectedProductId]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const res = await getHistory(filters);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      onShowToast('error', "Impossible de charger l'historique.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    if (onClearProductFilter) onClearProductFilter();
    setFilters({
      search: '',
      quantityType: '',
      productId: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 25
    });
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportHistoryExcel(filters);
      onShowToast('success', "Fichier d'historique Excel généré et téléchargé.");
    } catch (err) {
      onShowToast('error', "Erreur lors de l'export de l'historique.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bannière de filtrage ciblé si un produit est sélectionné */}
      {filters.productId && (
        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <span>
            Affichage de l'historique filtré sur le produit sélectionné.
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-300 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Afficher tout l'historique
          </button>
        </div>
      )}

      {/* Barre de filtres */}
      <HistoryFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
      />

      {/* Tableau d'historique */}
      <HistoryTable
        logs={logs}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
