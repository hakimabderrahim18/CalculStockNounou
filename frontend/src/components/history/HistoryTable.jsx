import React from 'react';
import { Warehouse, Store, ArrowUpRight, ArrowDownRight, Minus, ChevronLeft, ChevronRight, History } from 'lucide-react';

export default function HistoryTable({ logs, isLoading, pagination, onPageChange }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm font-medium text-slate-600">Chargement de l'historique...</p>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700">Aucun mouvement enregistré</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Aucun événement d'historique ne correspond à vos critères de recherche ou aucun mouvement de stock n'a encore été réalisé.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-slate-600 text-xs uppercase font-semibold tracking-wider border-b border-slate-200">
              <th className="py-3.5 px-4">Date & Heure</th>
              <th className="py-3.5 px-4">Produit</th>
              <th className="py-3.5 px-4">Emplacement</th>
              <th className="py-3.5 px-4 text-center">Ancien</th>
              <th className="py-3.5 px-4 text-center">Nouveau</th>
              <th className="py-3.5 px-4 text-center">Variation</th>
              <th className="py-3.5 px-4">Motif</th>
              <th className="py-3.5 px-4 text-right">Opérateur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => {
              const isStock = log.quantityType === 'STOCK';
              const diff = log.difference;
              const isPositive = diff > 0;
              const isNegative = diff < 0;

              return (
                <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Date */}
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                    {log.date ? new Date(log.date).toLocaleString('fr-FR') : '-'}
                  </td>

                  {/* Produit */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 text-sm">
                      {log.productName || log.productId?.name || 'Produit archivé'}
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      {log.productSku || log.productId?.sku || ''}
                    </div>
                  </td>

                  {/* Emplacement */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        isStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isStock ? <Warehouse className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                      {isStock ? 'Entrepôt' : 'Magasin'}
                    </span>
                  </td>

                  {/* Ancien */}
                  <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                    {log.oldValue}
                  </td>

                  {/* Nouveau */}
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                    {log.newValue}
                  </td>

                  {/* Variation (+/-) */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-800'
                          : isNegative
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isPositive && <ArrowUpRight className="w-3.5 h-3.5" />}
                      {isNegative && <ArrowDownRight className="w-3.5 h-3.5" />}
                      {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5" />}
                      {isPositive ? `+${diff}` : diff}
                    </span>
                  </td>

                  {/* Motif */}
                  <td className="py-3.5 px-4">
                    <span className="text-xs font-medium text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {log.reason}
                    </span>
                  </td>

                  {/* Opérateur */}
                  <td className="py-3.5 px-4 text-right text-xs text-slate-500 font-medium">
                    {log.changedBy || 'Admin'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
          <div>
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
            <span className="font-bold text-slate-900">{pagination.total}</span> mouvements
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-800">
              Page {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
