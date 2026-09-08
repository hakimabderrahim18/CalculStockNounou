import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Eye,
  History,
  X,
  Layers,
  FolderTree,
  RotateCcw,
  ArrowUpDown,
  Check
} from 'lucide-react';
import {
  compareStockExcel,
  getAuditHistory,
  getAuditById,
  exportAuditExcel,
  applyAudit,
  deleteAudit
} from '../api/client';

export default function LossAnalysisPage({ onShowToast }) {
  // Navigation interne : 'active' (détail/analyse courante) ou 'history' (liste des analyses passées)
  const [viewMode, setViewMode] = useState('active');

  // États pour les analyses
  const [currentAudit, setCurrentAudit] = useState(null);
  const [auditList, setAuditList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal d'upload
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  // Filtres de la table active
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, LOSS, SURPLUS, EXACT, NOT_FOUND_IN_APP
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // Famille / Catégorie
  const [subCategoryFilter, setSubCategoryFilter] = useState('ALL'); // Sous-Famille
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal de régularisation
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [targetLocation, setTargetLocation] = useState('STOCK');
  const [applying, setApplying] = useState(false);

  // Charger l'historique et la dernière analyse au montage
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getAuditHistory();
      const list = res.data?.data || [];
      setAuditList(list);

      // S'il existe des analyses et aucune sélectionnée, charger la plus récente
      if (list.length > 0 && !currentAudit) {
        loadAuditDetails(list[0]._id);
      }
    } catch (err) {
      console.error('Erreur chargement historique audits', err);
      onShowToast?.('error', 'Impossible de charger l\'historique des inventaires');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAuditDetails = async (id) => {
    setLoading(true);
    try {
      const res = await getAuditById(id);
      setCurrentAudit(res.data?.data || null);
      setViewMode('active');
      setCurrentPage(1);
    } catch (err) {
      console.error('Erreur chargement détail audit', err);
      onShowToast?.('error', 'Impossible d\'ouvrir ce rapport d\'inventaire');
    } finally {
      setLoading(false);
    }
  };

  // Soumission d'un nouveau fichier pour comparaison
  const handleCompareSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      onShowToast?.('warning', 'Veuillez choisir un fichier Excel ou CSV');
      return;
    }

    setUploading(true);
    try {
      const defaultTitle = uploadTitle.trim() || `Inventaire du ${new Date().toLocaleDateString('fr-FR')}`;
      const res = await compareStockExcel(uploadFile, defaultTitle, 'Admin');
      
      onShowToast?.('success', 'Comparaison effectuée avec succès !');
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle('');

      const newAudit = res.data?.data;
      setCurrentAudit(newAudit);
      setViewMode('active');
      loadHistory();
    } catch (err) {
      console.error('Erreur comparaison stock', err);
      const msg = err.response?.data?.message || err.message || 'Erreur lors de la comparaison';
      onShowToast?.('error', msg);
    } finally {
      setUploading(false);
    }
  };

  // Export Excel du rapport en cours
  const handleExport = async (audit = currentAudit) => {
    if (!audit) return;
    try {
      onShowToast?.('info', 'Préparation du fichier Excel...');
      await exportAuditExcel(audit._id, audit.title);
      onShowToast?.('success', 'Rapport téléchargé !');
    } catch (err) {
      console.error('Erreur export audit', err);
      onShowToast?.('error', 'Échec de l\'exportation Excel');
    }
  };

  // Suppression d'un audit
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'analyse "${title}" ?`)) {
      return;
    }

    try {
      await deleteAudit(id);
      onShowToast?.('success', 'Analyse supprimée');
      if (currentAudit?._id === id) {
        setCurrentAudit(null);
      }
      loadHistory();
    } catch (err) {
      console.error('Erreur suppression audit', err);
      onShowToast?.('error', 'Impossible de supprimer cette analyse');
    }
  };

  // Régularisation des stocks
  const handleApplyAudit = async () => {
    if (!currentAudit) return;
    setApplying(true);
    try {
      const res = await applyAudit(currentAudit._id, targetLocation, 'Admin');
      onShowToast?.('success', res.data?.message || 'Stocks mis à jour avec succès !');
      setIsApplyModalOpen(false);
      loadAuditDetails(currentAudit._id);
      loadHistory();
    } catch (err) {
      console.error('Erreur régularisation audit', err);
      const msg = err.response?.data?.message || 'Erreur lors de la régularisation des stocks';
      onShowToast?.('error', msg);
    } finally {
      setApplying(false);
    }
  };

  // Filtrage des articles comparés
  const items = currentAudit?.items || [];

  // Extraire la liste unique des Familles (Catégories) disponibles dans l'analyse
  const availableCategories = useMemo(() => {
    const cats = new Set();
    items.forEach((item) => {
      const c = item.categoryName?.trim();
      if (c) cats.add(c);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [items]);

  // Extraire la liste unique des Sous-Familles disponibles (dépendant de la Famille si sélectionnée)
  const availableSubCategories = useMemo(() => {
    const subCats = new Set();
    items.forEach((item) => {
      if (categoryFilter !== 'ALL' && (item.categoryName?.trim() || 'Général') !== categoryFilter) {
        return;
      }
      const sc = item.subCategoryName?.trim();
      if (sc) subCats.add(sc);
    });
    return Array.from(subCats).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [items, categoryFilter]);

  // Changement de Famille / Catégorie
  const handleCategoryChange = (cat) => {
    setCategoryFilter(cat);
    setSubCategoryFilter('ALL');
    setCurrentPage(1);
  };

  // Changement de Sous-Famille
  const handleSubCategoryChange = (subCat) => {
    setSubCategoryFilter(subCat);
    setCurrentPage(1);
  };

  // Réinitialiser tous les filtres
  const resetAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setSubCategoryFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered =
    searchTerm.trim() !== '' ||
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    subCategoryFilter !== 'ALL';

  const filteredItems = items.filter((item) => {
    // Filtre statut
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    // Filtre Famille (Catégorie)
    if (categoryFilter !== 'ALL' && (item.categoryName?.trim() || 'Général') !== categoryFilter) {
      return false;
    }
    // Filtre Sous-Famille
    if (subCategoryFilter !== 'ALL' && (item.subCategoryName?.trim() || '') !== subCategoryFilter) {
      return false;
    }
    // Recherche textuelle
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchSku = item.sku?.toLowerCase().includes(term);
      const matchName = item.name?.toLowerCase().includes(term);
      const matchBrand = item.brand?.toLowerCase().includes(term);
      const matchCat = item.categoryName?.toLowerCase().includes(term);
      const matchSubCat = item.subCategoryName?.toLowerCase().includes(term);
      return matchSku || matchName || matchBrand || matchCat || matchSubCat;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const summary = currentAudit?.summary || {
    totalCompared: 0,
    lossCount: 0,
    surplusCount: 0,
    exactCount: 0,
    notFoundInAppCount: 0,
    totalLossUnits: 0,
    totalSurplusUnits: 0,
    netDifferenceUnits: 0,
    totalLossValue: 0,
    totalSurplusValue: 0,
    netDifferenceValue: 0
  };

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Scale className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Analyse de Pertes & Rapprochement d'Inventaire
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Comparez un fichier Excel de comptage réel avec le stock total du logiciel (Entrepôt + Magasin).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton Nouvel Inventaire */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Nouvel inventaire / Comparer</span>
          </button>

          {/* Onglets Rapport / Historique */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-rose-600" />
              <span>Rapport actif</span>
            </button>
            <button
              onClick={() => {
                setViewMode('history');
                loadHistory();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>Historique ({auditList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================== VUE RAPPORT ACTIF ===================== */}
      {viewMode === 'active' && (
        <>
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Chargement des données d'inventaire...</p>
            </div>
          ) : !currentAudit ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Aucune analyse d'inventaire</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Téléversez un fichier Excel d'inventaire physique pour calculer automatiquement les pertes, le surplus et les décalages par rapport au stock total du logiciel.
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Lancer la première analyse</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Informations Générales & Actions sur le Rapport */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{currentAudit.title}</h3>
                    {currentAudit.status === 'APPLIED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        <Check className="w-3 h-3" /> Régularisé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                        Non régularisé
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Fichier : <span className="font-medium text-slate-700">{currentAudit.fileName}</span> • Réalisé le{' '}
                    {new Date(currentAudit.createdAt).toLocaleString('fr-FR')} par{' '}
                    <span className="font-medium text-slate-700">{currentAudit.performedBy}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Export Excel */}
                  <button
                    onClick={() => handleExport(currentAudit)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    title="Télécharger le rapport Excel"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter Excel</span>
                  </button>

                  {/* Bouton Régulariser */}
                  {currentAudit.status !== 'APPLIED' && (
                    <button
                      onClick={() => setIsApplyModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      title="Ajuster les stocks dans le logiciel pour correspondre à l'inventaire"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Régulariser les stocks</span>
                    </button>
                  )}

                  {/* Supprimer l'analyse */}
                  <button
                    onClick={() => handleDelete(currentAudit._id, currentAudit.title)}
                    className="flex items-center gap-1.5 px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    title="Supprimer cette analyse"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cartes KPI (Pertes / Surplus / Conformes / Écart Net) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {/* Pertes (Manquants) */}
                <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] sm:text-xs font-bold text-rose-800 uppercase tracking-wider truncate">
                      Pertes (Manquants)
                    </span>
                    <span className="p-1 sm:p-1.5 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                      <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-rose-700">
                      {summary.totalLossUnits} <span className="text-xs font-semibold text-rose-600">unités</span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-rose-600 mt-0.5 truncate">
                      {summary.lossCount} article(s) concerné(s)
                    </div>
                  </div>
                </div>

                {/* Surplus (Excédents) */}
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider truncate">
                      Surplus (Excédents)
                    </span>
                    <span className="p-1 sm:p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700">
                      +{summary.totalSurplusUnits} <span className="text-xs font-semibold text-emerald-600">unités</span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-emerald-600 mt-0.5 truncate">
                      {summary.surplusCount} article(s) concerné(s)
                    </div>
                  </div>
                </div>

                {/* Écart Net Global */}
                <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] sm:text-xs font-bold text-indigo-800 uppercase tracking-wider truncate">
                      Écart Net Global
                    </span>
                    <span className="p-1 sm:p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                      <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                  </div>
                  <div>
                    <div className={`text-xl sm:text-2xl font-black ${summary.netDifferenceUnits < 0 ? 'text-rose-700' : summary.netDifferenceUnits > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {summary.netDifferenceUnits > 0 ? `+${summary.netDifferenceUnits}` : summary.netDifferenceUnits}{' '}
                      <span className="text-xs font-semibold text-indigo-600">unités</span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-indigo-600 mt-0.5 truncate">
                      {summary.totalCompared} articles analysés
                    </div>
                  </div>
                </div>

                {/* Conformes & Non Référencés */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                      Conformité
                    </span>
                    <span className="p-1 sm:p-1.5 bg-slate-200 text-slate-700 rounded-lg shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <span className="text-slate-600">Conforme :</span>
                      <span className="font-bold text-slate-800 bg-slate-200/80 px-1.5 py-0.2 rounded">
                        {summary.exactCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <span className="text-amber-700">Non référencé :</span>
                      <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                        {summary.notFoundInAppCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table des Écarts & Décalages */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Barre de filtres et recherche */}
                <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col gap-3 bg-slate-50/50">
                  {/* Ligne 1 : Recherche + Statut */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Champ de recherche */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filtrer par nom, référence, marque, famille..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setCurrentPage(1);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtre de Statut */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1 flex-shrink-0">
                        <Filter className="w-3.5 h-3.5" /> Statut :
                      </span>
                      {[
                        { key: 'ALL', label: `Tous (${items.length})` },
                        { key: 'LOSS', label: `Pertes (${summary.lossCount})` },
                        { key: 'SURPLUS', label: `Surplus (${summary.surplusCount})` },
                        { key: 'EXACT', label: `Conformes (${summary.exactCount})` },
                        { key: 'NOT_FOUND_IN_APP', label: `Non référencés (${summary.notFoundInAppCount})` }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => {
                            setStatusFilter(tab.key);
                            setCurrentPage(1);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                            statusFilter === tab.key
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ligne 2 : Sélecteurs Hiérarchiques Famille (Catégorie) & Sous-Famille */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Sélecteur Famille / Catégorie */}
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Famille :</span>
                        <select
                          value={categoryFilter}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[170px] truncate"
                        >
                          <option value="ALL">📁 Toutes les familles ({availableCategories.length})</option>
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sélecteur Sous-Famille */}
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <FolderTree className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-600 shrink-0">Sous-Famille :</span>
                        <select
                          value={subCategoryFilter}
                          onChange={(e) => handleSubCategoryChange(e.target.value)}
                          disabled={availableSubCategories.length === 0}
                          className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[170px] truncate disabled:opacity-50"
                        >
                          <option value="ALL">
                            📂 {categoryFilter === 'ALL' ? 'Toutes les sous-familles' : 'Toutes de cette famille'} ({availableSubCategories.length})
                          </option>
                          {availableSubCategories.map((subCat) => (
                            <option key={subCat} value={subCat}>
                              {subCat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Bouton Réinitialiser */}
                      {isFiltered && (
                        <button
                          onClick={resetAllFilters}
                          className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Réinitialiser filtres</span>
                        </button>
                      )}
                    </div>

                    {/* Badge Compteur des résultats filtrés */}
                    <div className="text-[11px] text-slate-500 font-medium">
                      Affichage : <span className="font-bold text-slate-800">{filteredItems.length}</span> / {items.length} article(s)
                    </div>
                  </div>
                </div>

                {/* ================= VUE MOBILE (< md) : Cartes comparatives claires ================= */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {paginatedItems.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Aucun produit ne correspond aux filtres actuels.
                    </div>
                  ) : (
                    paginatedItems.map((item, idx) => {
                      const isLoss = item.status === 'LOSS';
                      const isSurplus = item.status === 'SURPLUS';
                      const isExact = item.status === 'EXACT';

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 space-y-2.5 ${
                            isLoss ? 'bg-rose-50/20' : isSurplus ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          {/* Ligne 1 : SKU + Nom + Famille + Statut Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm truncate">
                                {item.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span className="font-mono font-semibold text-slate-700">{item.sku}</span>
                                {item.brand && <span>• {item.brand}</span>}
                              </div>
                              {(item.categoryName || item.subCategoryName) && (
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  {item.categoryName && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                      📁 {item.categoryName}
                                    </span>
                                  )}
                                  {item.subCategoryName && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                                      📂 {item.subCategoryName}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Badge Statut */}
                            <div className="flex-shrink-0">
                              {isLoss && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                  Perte
                                </span>
                              )}
                              {isSurplus && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  Surplus
                                </span>
                              )}
                              {isExact && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  Conforme
                                </span>
                              )}
                              {item.status === 'NOT_FOUND_IN_APP' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  Non référencé
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Ligne 2 : Comparatif Logiciel vs Réel vs Écart */}
                          <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Logiciel</div>
                              <div className="text-base font-black text-slate-800 mt-0.5">
                                {item.appTotalStock}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                (M:{item.appStoreStock} / E:{item.appWarehouseStock})
                              </div>
                            </div>

                            <div className="border-x border-slate-200">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Fichier Réel</div>
                              <div className="text-base font-black text-rose-950 mt-0.5">
                                {item.physicalStock}
                              </div>
                              <div className="text-[9px] text-slate-400">Compté</div>
                            </div>

                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Écart</div>
                              <div className="mt-0.5">
                                {isLoss && (
                                  <span className="text-sm font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md inline-block">
                                    {item.difference}
                                  </span>
                                )}
                                {isSurplus && (
                                  <span className="text-sm font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md inline-block">
                                    +{item.difference}
                                  </span>
                                )}
                                {isExact && (
                                  <span className="text-sm font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md inline-block">
                                    0
                                  </span>
                                )}
                                {item.status === 'NOT_FOUND_IN_APP' && (
                                  <span className="text-sm font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md inline-block">
                                    +{item.difference}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ================= VUE DESKTOP (>= md) : Tableau complet ================= */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Réf / SKU</th>
                        <th className="py-3 px-4">Désignation</th>
                        <th className="py-3 px-3">Famille & Sous-Famille</th>
                        <th className="py-3 px-3 text-right">Stock Entrepôt</th>
                        <th className="py-3 px-3 text-right">Stock Magasin</th>
                        <th className="py-3 px-3 text-right bg-slate-100 text-slate-900 font-black">
                          Total Logiciel
                        </th>
                        <th className="py-3 px-3 text-right bg-rose-50/50 text-rose-950 font-black">
                          Stock Compté (Fichier)
                        </th>
                        <th className="py-3 px-3 text-right font-black">Décalage (Écart)</th>
                        <th className="py-3 px-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedItems.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-8 text-center text-slate-400">
                            Aucun produit ne correspond aux filtres actuels.
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map((item, idx) => {
                          const isLoss = item.status === 'LOSS';
                          const isSurplus = item.status === 'SURPLUS';
                          const isExact = item.status === 'EXACT';

                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isLoss
                                  ? 'bg-rose-50/30'
                                  : isSurplus
                                  ? 'bg-emerald-50/30'
                                  : ''
                              }`}
                            >
                              <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                                {item.sku}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-900">
                                <div>{item.name}</div>
                                {item.brand && (
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    Marque : {item.brand}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="space-y-1">
                                  {item.categoryName ? (
                                    <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                      📁 {item.categoryName}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">-</span>
                                  )}
                                  {item.subCategoryName && (
                                    <div>
                                      <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                                        📂 {item.subCategoryName}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-600">
                                {item.appWarehouseStock}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-600">
                                {item.appStoreStock}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold bg-slate-100/60 text-slate-900">
                                {item.appTotalStock}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold bg-rose-50/40 text-slate-900">
                                {item.physicalStock}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                                {isLoss && (
                                  <span className="text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md">
                                    {item.difference}
                                  </span>
                                )}
                                {isSurplus && (
                                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                    +{item.difference}
                                  </span>
                                )}
                                {isExact && (
                                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    0
                                  </span>
                                )}
                                {item.status === 'NOT_FOUND_IN_APP' && (
                                  <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                                    +{item.difference}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                {isLoss && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                    Perte
                                  </span>
                                )}
                                {isSurplus && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    Surplus
                                  </span>
                                )}
                                {isExact && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    Conforme
                                  </span>
                                )}
                                {item.status === 'NOT_FOUND_IN_APP' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                    Non référencé
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à{' '}
                      {Math.min(currentPage * itemsPerPage, filteredItems.length)} sur{' '}
                      {filteredItems.length} article(s)
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                      >
                        Précédent
                      </button>
                      <span className="px-2 font-medium">
                        Page {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===================== VUE HISTORIQUE DES ANALYSES ===================== */}
      {viewMode === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Historique des Comparaisons & Inventaires
              </h3>
              <p className="text-xs text-slate-500">
                Consultez l'historique complet des écarts de stock passés et téléchargez les rapports Excel.
              </p>
            </div>
            <button
              onClick={loadHistory}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Titre de l'inventaire</th>
                  <th className="py-3 px-4">Fichier source</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                  <th className="py-3 px-3 text-right">Articles</th>
                  <th className="py-3 px-3 text-right text-rose-700">Pertes</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Surplus</th>
                  <th className="py-3 px-3 text-right font-bold">Écart Net</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditList.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400">
                      Aucun inventaire enregistré pour le moment.
                    </td>
                  </tr>
                ) : (
                  auditList.map((a) => {
                    const s = a.summary || {};
                    return (
                      <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-800">
                          {new Date(a.createdAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {a.title}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {a.fileName || '-'}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {a.status === 'APPLIED' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Régularisé
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Non régularisé
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          {s.totalCompared || 0}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                          {s.totalLossUnits || 0}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          +{s.totalSurplusUnits || 0}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${(s.netDifferenceUnits || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {(s.netDifferenceUnits || 0) > 0 ? '+' : ''}{s.netDifferenceUnits || 0}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => loadAuditDetails(a._id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title="Ouvrir le rapport d'écart"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExport(a)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Télécharger Excel"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(a._id, a.title)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
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
      )}

      {/* ===================== MODAL D'UPLOAD NOUVELLE ANALYSE ===================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Comparer le stock physique
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Téléversez votre fichier Excel (.xlsx, .xls) ou CSV issu de votre comptage physique.
              Le système va automatiquement identifier les références, sommer le stock de l'application
              (Entrepôt + Magasin) et révéler l'ensemble des écarts (pertes et surplus).
            </p>

            <form onSubmit={handleCompareSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titre de l'inventaire
                </label>
                <input
                  type="text"
                  placeholder={`Ex: Inventaire Général du ${new Date().toLocaleDateString('fr-FR')}`}
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fichier de stock physique (.xlsx, .xls, .csv) *
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer border border-slate-200 p-1.5 rounded-xl"
                  required
                />
                {uploadFile && (
                  <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                    ✓ Fichier sélectionné : {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} Ko)
                  </p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                💡 <strong>Colonnes automatiquement reconnues :</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  <li>Désignation ou Nom du produit</li>
                  <li>Réf produit ou SKU</li>
                  <li>Stock (Unité) ou Quantité réelle</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Scale className="w-3.5 h-3.5" />
                      <span>Calculer les Écarts</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE RÉGULARISATION DE STOCK ===================== */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-2 text-blue-600">
              <span className="p-2 bg-blue-50 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Régulariser les stocks
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cette action va modifier les quantités des produits dans le logiciel pour que le stock total
              corresponde exactement au comptage de votre inventaire. Un mouvement d'historique sera créé pour chaque article modifié.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Appliquer les décalages sur quel emplacement ?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetLocation('STOCK')}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    targetLocation === 'STOCK'
                      ? 'border-blue-600 bg-blue-50 text-blue-950 ring-1 ring-blue-600'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  📦 Stock Entrepôt
                  <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                    (Recommandé pour régularisation globale)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetLocation('STORE')}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    targetLocation === 'STORE'
                      ? 'border-blue-600 bg-blue-50 text-blue-950 ring-1 ring-blue-600'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  🏪 Stock Magasin
                  <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                    (Si l'inventaire concernait le magasin)
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleApplyAudit}
                disabled={applying}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {applying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Régularisation en cours...</span>
                  </>
                ) : (
                  <span>Confirmer la mise à jour</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
