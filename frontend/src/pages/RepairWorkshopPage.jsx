import React, { useState, useEffect } from 'react';
import {
  getProducts,
  getCategories,
  repairMovement,
  getHistory
} from '../api/client';
import {
  Wrench,
  Search,
  MinusCircle,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Store,
  RotateCcw
} from 'lucide-react';
import Modal from '../components/common/Modal';

export default function RepairWorkshopPage({ onShowToast }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  // Pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });

  // Modal d'action réparateur
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [actionType, setActionType] = useState('CONSUME'); // 'CONSUME' ou 'RETURN'
  const [quantity, setQuantity] = useState(1);
  const [repairRef, setRepairRef] = useState('');
  const [clientOrDevice, setClientOrDevice] = useState('');
  const [repairerName, setRepairerName] = useState('Réparateur');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Historique récent des réparations
  const [recentRepairs, setRecentRepairs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Charger catégories
  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data.data))
      .catch((err) => console.error(err));
  }, []);

  // Charger produits (pièces)
  const loadPieces = async () => {
    try {
      setIsLoading(true);
      const res = await getProducts({
        search,
        category,
        page: pagination.page,
        limit: pagination.limit
      });
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      onShowToast('error', 'Erreur chargement des pièces.');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger l'historique récent atelier
  const loadRecentRepairs = async () => {
    try {
      setLoadingHistory(true);
      const res = await getHistory({
        search: '[RÉPARATION]',
        quantityType: 'STORE',
        limit: 8
      });
      setRecentRepairs(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPieces();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category, pagination.page]);

  useEffect(() => {
    loadRecentRepairs();
  }, []);

  // Ouvrir modal
  const handleOpenAction = (product, type) => {
    setSelectedProduct(product);
    setActionType(type);
    setQuantity(1);
    setRepairRef('');
    setClientOrDevice('');
    setReason(type === 'CONSUME' ? 'Remplacement pièce défectueuse' : 'Pièce non utilisée / Retour stock');
    setFormError('');
    setModalOpen(true);
  };

  // Soumettre action réparateur
  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (actionType === 'CONSUME' && selectedProduct.storeQuantity < quantity) {
      setFormError(`Stock magasin insuffisant (${selectedProduct.storeQuantity} dispo).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      await repairMovement(selectedProduct._id, {
        actionType,
        quantity: Number(quantity),
        repairRef: repairRef.trim(),
        clientOrDevice: clientOrDevice.trim(),
        repairerName: repairerName.trim() || 'Réparateur',
        reason: reason.trim()
      });

      onShowToast(
        'success',
        actionType === 'CONSUME'
          ? `✓ Pièce déduite du stock magasin pour ${clientOrDevice || 'réparation'}`
          : `✓ Pièce réintégrée au stock magasin avec succès`
      );

      setModalOpen(false);
      loadPieces();
      loadRecentRepairs();
    } catch (err) {
      setFormError(err.response?.data?.message || "Erreur lors de l'enregistrement de l'intervention.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête Espace Réparateurs */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/30">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Espace Atelier & Réparateurs</h2>
              <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                Stock Magasin uniquement
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Interface simplifiée pour prélever ou réintégrer des pièces détachées lors des réparations clients.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs bg-white/10 px-3.5 py-2 rounded-xl border border-white/10">
          <Store className="w-4 h-4 text-emerald-400" />
          <span>Emplacement : <strong className="text-white">Stock Magasin</strong></span>
        </div>
      </div>

      {/* Barre de Recherche Rapide */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une pièce (écran, batterie, connecteur, réf, marque...)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="">Toutes les familles / catégories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {(search || category) && (
          <button
            onClick={() => {
              setSearch('');
              setCategory('');
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            title="Effacer filtres"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Liste des Pièces Disponibles */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Catalogue Pièces Détachées ({pagination.total})
          </span>
          <span className="text-xs text-slate-500">
            Prélèvement instantané sur le stock magasin
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
            <p>Recherche des pièces...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Aucune pièce trouvée</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Veuillez ajouter ou importer des pièces depuis l'onglet « Produits & Stocks ».
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {products.map((p) => {
              const inStock = p.storeQuantity > 0;
              const isLow = p.storeQuantity > 0 && p.storeQuantity <= 2;

              return (
                <div
                  key={p._id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                >
                  {/* Info Produit */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{p.name}</span>
                      {p.brand && (
                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          {p.brand}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="font-mono text-slate-600">SKU: {p.sku}</span>
                      <span>•</span>
                      <span>{p.categoryId?.name || 'Général'} {p.subCategoryId?.name ? `> ${p.subCategoryId.name}` : ''}</span>
                      {p.price > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-700">{p.price} €</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stock Magasin & Actions Réparateur */}
                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t border-slate-100 sm:border-0">
                    {/* Badge Stock Magasin */}
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Stock Magasin</div>
                      <div
                        className={`inline-flex items-center gap-1 font-bold text-sm px-2.5 py-0.5 rounded-lg border ${
                          inStock
                            ? isLow
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span>{p.storeQuantity} pièce(s)</span>
                      </div>
                    </div>

                    {/* Boutons Actions Rapides */}
                    <div className="flex items-center gap-2 sm:pl-2 sm:border-l sm:border-slate-200">
                      <button
                        onClick={() => handleOpenAction(p, 'CONSUME')}
                        disabled={!inStock}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:cursor-not-allowed"
                        title="Sortir une pièce pour réparation"
                      >
                        <MinusCircle className="w-3.5 h-3.5" />
                        <span>Sortie</span>
                      </button>

                      <button
                        onClick={() => handleOpenAction(p, 'RETURN')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                        title="Restituer une pièce non utilisée"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Retour</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination simple */}
        {pagination.pages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Page {pagination.page} sur {pagination.pages} ({pagination.total} pièces)</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 border rounded bg-white disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="px-2.5 py-1 border rounded bg-white disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historique Récent des Réparations */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Dernières sorties atelier / interventions
            </span>
          </div>
          <button
            onClick={loadRecentRepairs}
            className="text-xs text-blue-600 hover:underline cursor-pointer"
          >
            Actualiser
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-6 text-center text-xs text-slate-400">Chargement...</div>
        ) : recentRepairs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Aucun mouvement de réparation récent.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {recentRepairs.map((log) => {
              const isConsume = log.difference < 0;
              return (
                <div key={log._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`p-1.5 rounded-lg ${
                        isConsume ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isConsume ? <MinusCircle className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
                    </span>
                    <div>
                      <span className="font-semibold text-slate-900">{log.productName}</span>
                      <span className="text-slate-400 ml-1">({log.productSku})</span>
                      <div className="text-slate-500 text-[11px] mt-0.5">{log.reason}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-bold text-xs ${
                        isConsume ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {log.difference > 0 ? `+${log.difference}` : log.difference} pièce(s)
                    </span>
                    <div className="text-[11px] text-slate-400">
                      Par {log.changedBy} • {new Date(log.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Action Réparateur */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          actionType === 'CONSUME'
            ? 'Sortie de pièce pour Réparation'
            : 'Restitution / Retour pièce au Magasin'
        }
      >
        <form onSubmit={handleSubmitAction} className="space-y-4">
          {/* Récap Produit */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-slate-900">{selectedProduct?.name}</div>
              <div className="text-xs text-slate-500 font-mono">SKU: {selectedProduct?.sku}</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Stock Magasin actuel</span>
              <span className="text-base font-bold text-slate-900">
                {selectedProduct?.storeQuantity} pièce(s)
              </span>
            </div>
          </div>

          {/* Quantité avec sélecteurs rapides */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantité <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 px-3 py-2 text-base font-bold border border-slate-300 rounded-xl text-center"
              />
              <div className="flex gap-1">
                {[1, 2, 3, 5].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition ${
                      quantity === q
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Réf Ticket Réparation & Modèle Appareil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                N° Ticket / Réf Réparation
              </label>
              <input
                type="text"
                value={repairRef}
                onChange={(e) => setRepairRef(e.target.value)}
                placeholder="Ex: TICKET-1042"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modèle Appareil / Client
              </label>
              <input
                type="text"
                value={clientOrDevice}
                onChange={(e) => setClientOrDevice(e.target.value)}
                placeholder="Ex: iPhone 12 / M. Dupont"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Nom du Réparateur */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nom du Réparateur / Intervenant
            </label>
            <input
              type="text"
              required
              value={repairerName}
              onChange={(e) => setRepairerName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Motif / Intervention */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Détail / Motif de l'intervention
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Remplacement écran tactile"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-xs transition ${
                actionType === 'CONSUME'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting
                ? 'Validation...'
                : actionType === 'CONSUME'
                ? `Confirmer la sortie (-${quantity})`
                : `Confirmer le retour (+${quantity})`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
