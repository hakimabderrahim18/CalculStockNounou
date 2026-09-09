import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Warehouse, Store, ArrowRight, AlertTriangle } from 'lucide-react';

export default function QuantityModal({ isOpen, onClose, product, quantityType, userRole = 'admin', onSave }) {
  const [newQuantity, setNewQuantity] = useState('');
  const [deductFromWarehouse, setDeductFromWarehouse] = useState(true);
  const [changedBy, setChangedBy] = useState(userRole === 'magasinier' ? 'Magasinier' : userRole === 'reparateur' ? 'Réparateur' : 'Admin');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStock = quantityType === 'STOCK';
  const currentQuantity = product ? (isStock ? product.stockQuantity : product.storeQuantity) : 0;
  const currentOtherQuantity = product ? (isStock ? product.storeQuantity : product.stockQuantity) : 0;

  useEffect(() => {
    if (product) {
      setNewQuantity(currentQuantity.toString());
      setError('');
      setDeductFromWarehouse(true);
      setChangedBy(userRole === 'magasinier' ? 'Magasinier' : userRole === 'reparateur' ? 'Réparateur' : 'Admin');
    }
  }, [product, quantityType, userRole]);

  if (!product) return null;

  const numericNewQuantity = Number(newQuantity);
  const isValidNumber = !isNaN(numericNewQuantity) && numericNewQuantity >= 0;
  const difference = isValidNumber ? numericNewQuantity - currentQuantity : 0;

  // Calcul du stock prévisionnel selon déduction entrepôt
  const willDeductWarehouse = !isStock && deductFromWarehouse && difference > 0;
  const isWarehouseInsufficient = willDeductWarehouse && (product.stockQuantity || 0) < difference;
  const predictedWarehouse = willDeductWarehouse
    ? Math.max(0, (product.stockQuantity || 0) - difference)
    : (product.stockQuantity || 0);
  const predictedStore = !isStock ? (isValidNumber ? numericNewQuantity : product.storeQuantity) : product.storeQuantity;
  const predictedTotal = willDeductWarehouse
    ? (product.totalQuantity || 0)
    : (isStock ? (isValidNumber ? numericNewQuantity : 0) + product.storeQuantity : predictedWarehouse + predictedStore);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isStock && (userRole === 'magasinier' || userRole === 'reparateur')) {
      setError("Les magasiniers et réparateurs ne peuvent pas modifier le stock entrepôt.");
      return;
    }
    if (!isValidNumber) {
      setError('La quantité doit être un nombre entier supérieur ou égal à 0.');
      return;
    }

    if (isWarehouseInsufficient) {
      setError(`Stock entrepôt insuffisant : seulement ${product.stockQuantity || 0} pièce(s) disponible(s) en entrepôt pour un transfert de ${difference} pièce(s).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSave({
        productId: product._id,
        quantityType,
        newQuantity: Math.floor(numericNewQuantity),
        reason: isStock
          ? 'Ajustement direct entrepôt'
          : willDeductWarehouse
          ? `Transfert Entrepôt -> Magasin (+${difference} pcs)`
          : 'Ajustement direct magasin',
        changedBy: changedBy.trim() || (isStock ? 'Admin' : 'Magasinier'),
        role: userRole,
        deductFromWarehouse
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour de la quantité.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Modifier ${isStock ? 'Stock Entrepôt' : 'Stock Magasin'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Résumé Produit */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">{product.name}</h4>
            <p className="text-xs text-slate-500 font-mono">SKU: {product.sku}</p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                isStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isStock ? <Warehouse className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
              {isStock ? 'Entrepôt' : 'Magasin'}
            </span>
          </div>
        </div>

        {/* Aperçu Dynamique : Ancien -> Nouveau & Différence */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <span className="block text-xs text-slate-500 font-medium">Actuel</span>
              <span className="text-xl font-bold text-slate-700">{currentQuantity}</span>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-500 mx-2 flex-shrink-0" />
            <div className="flex-1">
              <span className="block text-xs text-blue-600 font-medium">Nouveau</span>
              <span className="text-xl font-bold text-blue-700">
                {isValidNumber ? numericNewQuantity : '-'}
              </span>
            </div>
            <div className="flex-1 border-l border-blue-200 pl-3">
              <span className="block text-xs text-slate-500 font-medium">Variation</span>
              <span
                className={`text-lg font-bold ${
                  difference > 0
                    ? 'text-emerald-600'
                    : difference < 0
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }`}
              >
                {difference > 0 ? `+${difference}` : difference}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-200/60 flex flex-col gap-1.5 text-xs text-slate-600">
            {willDeductWarehouse && (
              <div className="flex items-center justify-between text-amber-900 bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-200">
                <span className="flex items-center gap-1 font-medium">
                  <Warehouse className="w-3.5 h-3.5 text-amber-700" />
                  Stock Entrepôt après transfert :
                </span>
                <span className="font-bold text-amber-950">
                  {product.stockQuantity || 0} ➔ {predictedWarehouse} (-{difference})
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Nouveau stock total prévisionnel :</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                {predictedTotal} unités
              </span>
            </div>
          </div>
        </div>

        {/* Option transfert depuis l'entrepôt */}
        {!isStock && difference > 0 && (
          <div className={`p-3.5 rounded-xl border transition ${
            isWarehouseInsufficient && deductFromWarehouse
              ? 'bg-rose-50/80 border-rose-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={deductFromWarehouse}
                onChange={(e) => setDeductFromWarehouse(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-amber-700" />
                  Déduire du stock entrepôt (Transfert)
                </span>
                <p className="text-slate-600 mt-1">
                  Prélève automatiquement <strong>{difference} pièce(s)</strong> de l'entrepôt pour alimenter le magasin.
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px] font-medium text-slate-700">
                  <span>Disponible en entrepôt : <strong className={isWarehouseInsufficient ? 'text-rose-600 font-bold' : 'text-slate-900'}>{product.stockQuantity || 0}</strong></span>
                  <span>↳ Restant en entrepôt : <strong className={predictedWarehouse < 0 ? 'text-rose-600' : 'text-amber-900'}>{predictedWarehouse}</strong></span>
                </div>
              </div>
            </label>

            {isWarehouseInsufficient && deductFromWarehouse && (
              <div className="mt-2.5 pt-2 border-t border-rose-200 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Stock entrepôt insuffisant ({product.stockQuantity || 0} en stock). Approvisionnez d'abord l'entrepôt ou décochez pour un ajout direct.</span>
              </div>
            )}
          </div>
        )}

        {/* Champ Saisie Nouvelle Quantité */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Nouvelle Quantité <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="0"
              step="1"
              required
              autoFocus
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="w-full px-4 py-3.5 text-2xl font-black text-slate-900 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition text-center"
              placeholder="0"
            />
          </div>

          {/* Steppers tactiles rapides pour mobile */}
          <div className="grid grid-cols-5 gap-1.5 mt-2.5">
            <button
              type="button"
              onClick={() => setNewQuantity('0')}
              className="py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              = 0
            </button>
            <button
              type="button"
              onClick={() => setNewQuantity(String(Math.max(0, (Number(newQuantity) || 0) - 5)))}
              className="py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              - 5
            </button>
            <button
              type="button"
              onClick={() => setNewQuantity(String(Math.max(0, (Number(newQuantity) || 0) - 1)))}
              className="py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              - 1
            </button>
            <button
              type="button"
              onClick={() => setNewQuantity(String((Number(newQuantity) || 0) + 1))}
              className="py-2 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 text-xs font-bold rounded-lg transition cursor-pointer border border-blue-200"
            >
              + 1
            </button>
            <button
              type="button"
              onClick={() => setNewQuantity(String((Number(newQuantity) || 0) + 5))}
              className="py-2 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 text-xs font-bold rounded-lg transition cursor-pointer border border-blue-200"
            >
              + 5
            </button>
          </div>
        </div>

        {/* Opérateur (changedBy) */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Opérateur
          </label>
          <input
            type="text"
            value={changedBy}
            onChange={(e) => setChangedBy(e.target.value)}
            className="w-full px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            placeholder="Admin"
          />
        </div>

        {/* Affichage d'erreur */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer text-center"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isValidNumber || (willDeductWarehouse && isWarehouseInsufficient)}
            className="flex-1 sm:flex-none px-6 py-3 sm:py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-blue-600/30 transition cursor-pointer text-center"
          >
            {isSubmitting ? 'Validation...' : 'Valider'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
