import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Check,
  RotateCcw,
  X,
  Package,
  User,
  Tag,
  AlertCircle,
  TrendingDown,
  Truck,
  MessageSquare
} from 'lucide-react';
import {
  getObservations,
  getObservationStats,
  createObservation,
  updateObservation,
  deleteObservation,
  getProducts
} from '../api/client';

const CATEGORIES = [
  { key: 'GENERAL', label: 'Remarque générale', icon: MessageSquare, color: 'text-slate-700 bg-slate-100' },
  { key: 'STOCK', label: 'Écart de stock', icon: TrendingDown, color: 'text-rose-700 bg-rose-50' },
  { key: 'CASSE', label: 'Casse / Détérioration', icon: AlertTriangle, color: 'text-amber-800 bg-amber-50' },
  { key: 'LIVRAISON', label: 'Livraison / Réception', icon: Truck, color: 'text-blue-700 bg-blue-50' },
  { key: 'ANOMALIE', label: 'Anomalie produit', icon: AlertCircle, color: 'text-purple-700 bg-purple-50' },
  { key: 'PRIX', label: 'Étiquetage / Prix', icon: Tag, color: 'text-emerald-700 bg-emerald-50' }
];

const PRIORITIES = [
  { key: 'BASSE', label: 'Basse', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'MOYENNE', label: 'Moyenne', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'HAUTE', label: 'Haute', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  { key: 'URGENTE', label: 'Urgente', badge: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' }
];

export default function ObservationJournalPage({ onShowToast, userRole = 'magasinier' }) {
  const [observations, setObservations] = useState([]);
  const [stats, setStats] = useState({ total: 0, urgent: 0, high: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(false);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modal d'ajout / modification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    priority: 'MOYENNE',
    status: 'NOUVEAU',
    author: userRole === 'admin' ? 'Admin' : 'Magasinier',
    authorRole: userRole,
    productSku: '',
    productName: '',
    resolutionNote: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Recherche de produit pour liaison rapide
  const [productList, setProductList] = useState([]);
  const [searchProductQuery, setSearchProductQuery] = useState('');

  useEffect(() => {
    loadData();
    loadProducts();
  }, [statusFilter, categoryFilter, priorityFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resObs, resStats] = await Promise.all([
        getObservations({
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
          search: searchTerm
        }),
        getObservationStats()
      ]);

      setObservations(resObs.data?.data || []);
      if (resStats.data?.data) {
        setStats(resStats.data.data);
      }
    } catch (err) {
      console.error('Erreur chargement observations', err);
      onShowToast?.('error', 'Impossible de charger le journal des observations');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await getProducts({ limit: 100 });
      setProductList(res.data?.data?.products || []);
    } catch (err) {
      // Ignorer silencieusement si la base est vide
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      category: 'GENERAL',
      priority: 'MOYENNE',
      status: 'NOUVEAU',
      author: userRole === 'admin' ? 'Admin' : 'Magasinier',
      authorRole: userRole,
      productSku: '',
      productName: '',
      resolutionNote: ''
    });
    setSearchProductQuery('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (obs) => {
    setEditingId(obs._id);
    setFormData({
      title: obs.title,
      content: obs.content,
      category: obs.category,
      priority: obs.priority,
      status: obs.status,
      author: obs.author,
      authorRole: obs.authorRole,
      productSku: obs.productSku || '',
      productName: obs.productName || '',
      resolutionNote: obs.resolutionNote || ''
    });
    setSearchProductQuery(obs.productName || obs.productSku || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      onShowToast?.('warning', 'Veuillez remplir le titre et le contenu de la remarque');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateObservation(editingId, formData);
        onShowToast?.('success', 'Observation mise à jour');
      } else {
        await createObservation(formData);
        onShowToast?.('success', 'Nouvelle observation ajoutée au journal');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Erreur sauvegarde observation', err);
      const msg = err.response?.data?.message || 'Erreur lors de l\'enregistrement';
      onShowToast?.('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Suppression d'une observation
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Supprimer définitivement l'observation "${title}" ?`)) {
      return;
    }
    try {
      await deleteObservation(id);
      onShowToast?.('success', 'Observation supprimée');
      loadData();
    } catch (err) {
      console.error('Erreur suppression observation', err);
      onShowToast?.('error', 'Impossible de supprimer cette observation');
    }
  };

  // Bascule rapide résolu / non résolu
  const handleQuickToggleResolved = async (obs) => {
    const isNowResolved = obs.status !== 'RESOLU';
    const newStatus = isNowResolved ? 'RESOLU' : 'EN_COURS';
    try {
      await updateObservation(obs._id, {
        status: newStatus,
        resolvedBy: isNowResolved ? (userRole === 'admin' ? 'Admin' : 'Magasinier') : ''
      });
      onShowToast?.('success', isNowResolved ? 'Observation marquée comme traitée !' : 'Observation réouverte');
      loadData();
    } catch (err) {
      console.error('Erreur changement statut', err);
      onShowToast?.('error', 'Erreur lors de la mise à jour du statut');
    }
  };

  const filteredObservations = observations.filter((obs) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      obs.title?.toLowerCase().includes(term) ||
      obs.content?.toLowerCase().includes(term) ||
      obs.productName?.toLowerCase().includes(term) ||
      obs.productSku?.toLowerCase().includes(term) ||
      obs.author?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* En-tête principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Journal d'Observations
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Cahier de transmission et suivi des remarques, constats de casse, anomalies et réceptions par le magasinier.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Observation</span>
        </button>
      </div>

      {/* Cartes KPI Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">
            <span>Total Remarques</span>
            <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800">{stats.total}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Observations enregistrées</p>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-rose-800 uppercase tracking-wider mb-1 truncate">
            <span>Urgentes</span>
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700">{stats.urgent + stats.high}</div>
          <p className="text-[10px] sm:text-[11px] text-rose-600 mt-0.5 truncate">Action rapide requise</p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 truncate">
            <span>En attente</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700">{stats.open + stats.inProgress}</div>
          <p className="text-[10px] sm:text-[11px] text-amber-600 mt-0.5 truncate">À traiter</p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1 truncate">
            <span>Résolues</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">{stats.resolved}</div>
          <p className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 truncate">Problèmes réglés</p>
        </div>
      </div>

      {/* Barre de Filtres & Recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Recherche */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une remarque, un produit, un auteur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </form>

        {/* Filtres par bouton & dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtre Statut */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {[
              { key: 'ALL', label: 'Tous' },
              { key: 'NOUVEAU', label: 'Nouveau' },
              { key: 'EN_COURS', label: 'En cours' },
              { key: 'RESOLU', label: 'Résolu' }
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setStatusFilter(st.key)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === st.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Filtre Catégorie */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">📁 Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Filtre Priorité */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">⚡ Toutes priorités</option>
            {PRIORITIES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des Observations */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Clock className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Chargement des observations...</p>
        </div>
      ) : filteredObservations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Aucune observation enregistrée</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Le magasinier peut noter ici les casses, les retards de livraison, les anomalies de stock ou toute remarque importante.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une première observation</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredObservations.map((obs) => {
            const catObj = CATEGORIES.find((c) => c.key === obs.category) || CATEGORIES[0];
            const prioObj = PRIORITIES.find((p) => p.key === obs.priority) || PRIORITIES[1];
            const isResolved = obs.status === 'RESOLU';

            return (
              <div
                key={obs._id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                  isResolved
                    ? 'border-emerald-200/80 bg-emerald-50/10'
                    : obs.priority === 'URGENTE'
                    ? 'border-rose-300 bg-rose-50/10'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Ligne En-tête : Badges Catégorie, Priorité, Statut */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Catégorie */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${catObj.color}`}>
                        {catObj.label}
                      </span>

                      {/* Priorité */}
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg border ${prioObj.badge}`}>
                        {prioObj.label}
                      </span>
                    </div>

                    {/* Statut Badge & Bouton Toggle */}
                    <button
                      onClick={() => handleQuickToggleResolved(obs)}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : obs.status === 'EN_COURS'
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title={isResolved ? 'Cliquer pour rouvrir' : 'Cliquer pour marquer comme résolu'}
                    >
                      {isResolved ? (
                        <>
                          <Check className="w-3 h-3" /> Traité / Résolu
                        </>
                      ) : obs.status === 'EN_COURS' ? (
                        <>
                          <Clock className="w-3 h-3" /> En cours
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" /> Nouveau
                        </>
                      )}
                    </button>
                  </div>

                  {/* Titre de l'observation */}
                  <h3 className={`text-sm font-bold text-slate-900 mb-1.5 ${isResolved ? 'line-through text-slate-500' : ''}`}>
                    {obs.title}
                  </h3>

                  {/* Contenu détaillé */}
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-3">
                    {obs.content}
                  </p>

                  {/* Produit lié (si applicable) */}
                  {(obs.productName || obs.productSku) && (
                    <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                      <Package className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold">{obs.productName || 'Produit'}</span>
                      {obs.productSku && (
                        <span className="font-mono text-[10px] text-slate-500">({obs.productSku})</span>
                      )}
                    </div>
                  )}

                  {/* Note de résolution (si résolu) */}
                  {isResolved && obs.resolutionNote && (
                    <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                      <div className="font-bold text-[11px] mb-0.5">Solution apportée :</div>
                      <div>{obs.resolutionNote}</div>
                    </div>
                  )}
                </div>

                {/* Bas de la carte : Auteur, Date et Boutons d'action */}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>
                      Par <strong className="text-slate-700 font-semibold">{obs.author || 'Magasinier'}</strong> •{' '}
                      {new Date(obs.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Modifier */}
                    <button
                      onClick={() => handleOpenEditModal(obs)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Supprimer */}
                    <button
                      onClick={() => handleDelete(obs._id, obs.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== MODAL D'AJOUT / MODIFICATION ===================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <ClipboardList className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? 'Modifier l\'observation' : 'Nouvelle observation magasin'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titre du constat / observation *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 3 écrans arrivés cassés du fournisseur"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Catégorie & Priorité */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Degré d'urgence / Priorité
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Statut & Auteur */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Statut du traitement
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="NOUVEAU">Nouveau</option>
                    <option value="EN_COURS">En cours de traitement</option>
                    <option value="RESOLU">Traité / Résolu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auteur de la note
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Magasinier"
                  />
                </div>
              </div>

              {/* Produit lié (Optionnel) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lier à un produit (Optionnel)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Réf / SKU produit"
                    value={formData.productSku}
                    onChange={(e) => setFormData({ ...formData, productSku: e.target.value })}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Nom ou désignation du produit"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Contenu / Remarque détaillée */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description détaillée de l'observation *
                </label>
                <textarea
                  rows="4"
                  placeholder="Expliquez ici les détails : quantité abîmée, référence du bon de livraison, anomalies constatées en rayon..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                ></textarea>
              </div>

              {/* Note de résolution si statut RESOLU */}
              {formData.status === 'RESOLU' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <label className="block text-xs font-bold text-emerald-900">
                    Solution / Action corrective apportée
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Ex: Avoir demandé au fournisseur, produit retourné, stock régularisé..."
                    value={formData.resolutionNote}
                    onChange={(e) => setFormData({ ...formData, resolutionNote: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  ></textarea>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Enregistrer la remarque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
