import React from 'react';
import { Warehouse, Store, Edit3, Trash2, History, ChevronLeft, ChevronRight, PackageOpen, Lock, Tag } from 'lucide-react';

export default function ProductTable({
  products,
  isLoading,
  pagination,
  userRole = 'admin',
  onPageChange,
  onOpenQuantityModal,
  onEditProduct,
  onDeleteProduct,
  onViewProductHistory
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm font-medium text-slate-600">Chargement des produits...</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <PackageOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700">Aucun produit trouvé</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Aucun produit ne correspond à vos filtres actuels ou la base de données est vide. Ajoutez un produit ou importez un fichier Excel.
        </p>
      </div>
    );
  }

  const isWarehouseLocked = userRole === 'magasinier' || userRole === 'reparateur';

  return (
    <div className="space-y-4">
      {/* ================= VUE MOBILE (Cartes tactiles fluides < md) ================= */}
      <div className="block md:hidden space-y-3">
        {products.map((p) => (
          <div
            key={p._id}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3"
          >
            {/* Haut de carte : Image + Nom + SKU + Marque + Catégorie */}
            <div className="flex items-start gap-3">
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                    {p.name}
                  </h4>
                  {p.brand && (
                    <span className="text-[9px] uppercase font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 flex-shrink-0">
                      {p.brand}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs mt-0.5">
                  <span className="font-mono text-slate-500 font-medium text-[11px] truncate">
                    {p.sku}
                  </span>
                  {p.price > 0 && (
                    <span className="font-semibold text-emerald-700 text-[11px]">
                      {p.price} €
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                    {p.categoryId?.name || 'Général'}
                  </span>
                  {p.subCategoryId?.name && p.subCategoryId.name !== 'Général' && (
                    <span className="text-slate-400">/ {p.subCategoryId.name}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Milieu de carte : Pavés tactiles des Stocks (grands boutons faciles au pouce) */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              {/* Stock Magasin */}
              <button
                type="button"
                onClick={() => onOpenQuantityModal(p, 'STORE')}
                className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 border border-emerald-200/90 text-left transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800">
                  <span className="flex items-center gap-1">
                    <Store className="w-3 h-3" /> Magasin
                  </span>
                  <Edit3 className="w-2.5 h-2.5 opacity-60" />
                </div>
                <div className="text-lg font-black text-emerald-950 mt-1">
                  {p.storeQuantity}
                </div>
              </button>

              {/* Stock Entrepôt */}
              {isWarehouseLocked ? (
                <div
                  title="Entrepôt verrouillé pour ce profil"
                  className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-left opacity-80 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Warehouse className="w-3 h-3" /> Entrepôt
                    </span>
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                  <div className="text-lg font-black text-slate-600 mt-1">
                    {p.stockQuantity}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenQuantityModal(p, 'STOCK')}
                  className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200/90 text-left transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                    <span className="flex items-center gap-1">
                      <Warehouse className="w-3 h-3" /> Entrepôt
                    </span>
                    <Edit3 className="w-2.5 h-2.5 opacity-60" />
                  </div>
                  <div className="text-lg font-black text-amber-950 mt-1">
                    {p.stockQuantity}
                  </div>
                </button>
              )}

              {/* Stock Total */}
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-left flex flex-col justify-between">
                <div className="text-[10px] font-bold text-blue-800">
                  Total
                </div>
                <div className="text-lg font-black text-blue-950 mt-1">
                  {p.totalQuantity}
                </div>
              </div>
            </div>

            {/* Bas de carte : Actions rapides */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : ''}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onViewProductHistory(p)}
                  className="p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Historique"
                >
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[11px]">Historique</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEditProduct(p)}
                  className="p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg cursor-pointer"
                  title="Modifier"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteProduct(p)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-lg cursor-pointer"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= VUE DESKTOP (Tableau complet >= md) ================= */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 text-xs uppercase font-semibold tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Produit & SKU</th>
                <th className="py-3.5 px-4">Catégorie / Sous-catégorie</th>
                <th className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <Warehouse className="w-3.5 h-3.5" /> Stock Entrepôt
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Store className="w-3.5 h-3.5" /> Stock Magasin
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center bg-blue-50/60 text-blue-900 border-x border-blue-100">
                  Stock Total
                </th>
                <th className="py-3.5 px-4 text-center">Créé le</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/60 transition-colors group">
                  {/* Nom & SKU */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs flex-shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 leading-snug">{p.name}</span>
                          {p.brand && (
                            <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                              {p.brand}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          <span className="font-mono text-slate-500 font-medium">{p.sku}</span>
                          {p.price > 0 && (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px]">
                              {p.price} €
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Catégorie & Sous-catégorie */}
                  <td className="py-3.5 px-4">
                    <span className="inline-block font-medium text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded-md">
                      {p.categoryId?.name || 'Sans catégorie'}
                    </span>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <span className="text-slate-300">↳</span>
                      {p.subCategoryId?.name || '-'}
                    </div>
                  </td>

                  {/* Stock Entrepôt */}
                  <td className="py-3.5 px-4 text-center">
                    {isWarehouseLocked ? (
                      <span
                        title="Stock Entrepôt réservé : les magasiniers ne peuvent pas modifier le stock entrepôt."
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed opacity-80"
                      >
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>{p.stockQuantity}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onOpenQuantityModal(p, 'STOCK')}
                        title="Cliquer pour modifier la quantité en entrepôt"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80 transition cursor-pointer group-hover:shadow-xs active:scale-95"
                      >
                        <span>{p.stockQuantity}</span>
                        <Edit3 className="w-3 h-3 text-amber-600 opacity-60 group-hover:opacity-100" />
                      </button>
                    )}
                  </td>

                  {/* Stock Magasin */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onOpenQuantityModal(p, 'STORE')}
                      title="Cliquer pour modifier la quantité en magasin"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/80 transition cursor-pointer group-hover:shadow-xs active:scale-95"
                    >
                      <span>{p.storeQuantity}</span>
                      <Edit3 className="w-3 h-3 text-emerald-600 opacity-60 group-hover:opacity-100" />
                    </button>
                  </td>

                  {/* Stock Total */}
                  <td className="py-3.5 px-4 text-center bg-blue-50/40 border-x border-blue-100">
                    <span className="inline-block font-extrabold text-blue-900 text-sm">
                      {p.totalQuantity}
                    </span>
                  </td>

                  {/* Date de création */}
                  <td className="py-3.5 px-4 text-center text-xs text-slate-500 font-medium">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '-'}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewProductHistory(p)}
                        title="Historique des mouvements"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditProduct(p)}
                        title="Modifier les informations"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(p)}
                        title="Supprimer ce produit"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= PAGINATION (Adaptée mobile & desktop) ================= */}
      {pagination && pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-2xs">
          <div className="text-center sm:text-left text-[11px] sm:text-xs text-slate-500">
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
            <span className="font-bold text-slate-900">{pagination.total}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer active:scale-95"
            >
              Précédent
            </button>
            <span className="px-3 py-1 font-bold text-slate-800">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer active:scale-95"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
