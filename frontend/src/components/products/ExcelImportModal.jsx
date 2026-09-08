import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, XCircle } from 'lucide-react';
import { downloadProductTemplate, importProductsExcel } from '../../api/client';

export default function ExcelImportModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [autoCreate, setAutoCreate] = useState(true);
  const [setStockToZero, setSetStockToZero] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setReport(null);
    setErrorMsg('');
    setProgress(0);
    setIsUploading(false);
    setSetStockToZero(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setErrorMsg('');
      } else {
        setErrorMsg('Veuillez sélectionner un fichier au format Excel (.xlsx ou .xls).');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Veuillez sélectionner un fichier Excel.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg('');
      setProgress(40);

      const response = await importProductsExcel(file, autoCreate, setStockToZero);
      setProgress(100);
      setReport(response.data.data);

      if (response.data.data.successCount > 0) {
        onImportSuccess();
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Erreur lors de l'importation du fichier Excel."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importer des produits depuis Excel (.xlsx)"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Rapport d'importation terminé */}
        {report ? (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="text-2xl font-bold text-emerald-800">{report.successCount}</div>
                  <div className="text-xs font-medium text-emerald-700">Produit(s) importé(s)</div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                report.errorCount > 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                {report.errorCount > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-slate-400 flex-shrink-0" />
                )}
                <div>
                  <div className={`text-2xl font-bold ${
                    report.errorCount > 0 ? 'text-rose-800' : 'text-slate-700'
                  }`}>
                    {report.errorCount}
                  </div>
                  <div className={`text-xs font-medium ${
                    report.errorCount > 0 ? 'text-rose-700' : 'text-slate-500'
                  }`}>
                    Ligne(s) en erreur
                  </div>
                </div>
              </div>
            </div>

            {/* Détail des erreurs si existantes */}
            {report.errors && report.errors.length > 0 && (
              <div className="border border-rose-200 rounded-xl overflow-hidden">
                <div className="bg-rose-100/60 px-4 py-2 text-xs font-bold text-rose-900">
                  Détail des erreurs rencontrées ({report.errors.length}) :
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-rose-100 text-xs">
                  {report.errors.map((err, idx) => (
                    <div key={idx} className="p-2.5 bg-rose-50/40 flex items-start gap-2">
                      <span className="font-mono font-bold text-rose-700 whitespace-nowrap bg-rose-200/60 px-1.5 py-0.5 rounded text-[11px]">
                        Ligne {err.row}
                      </span>
                      <span className="font-mono text-slate-600">[{err.sku}]</span>
                      <span className="text-slate-800">{err.messages?.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={resetState}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Importer un autre fichier
              </button>
              <button
                onClick={handleClose}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          /* Formulaire de sélection et upload */
          <>
            {/* Guide & Téléchargement du modèle */}
            <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900">
              <div>
                <span className="font-semibold block">Vous n'avez pas le bon format ?</span>
                <span>Téléchargez notre modèle Excel officiel pré-formaté.</span>
              </div>
              <button
                type="button"
                onClick={downloadProductTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-100/60 text-blue-700 font-semibold border border-blue-300 rounded-lg shadow-xs transition cursor-pointer flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Modèle .xlsx
              </button>
            </div>

            {/* Zone de Drag & Drop */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                {file ? (
                  <>
                    <FileSpreadsheet className="w-12 h-12 text-emerald-600 animate-bounce" />
                    <span className="font-semibold text-sm text-slate-800">{file.name}</span>
                    <span className="text-xs text-slate-500 font-mono">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <span className="text-xs text-blue-600 underline">Cliquer pour remplacer</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">
                      Glissez-déposez votre fichier Excel ici
                    </p>
                    <p className="text-xs text-slate-500">ou cliquez pour parcourir vos fichiers (.xlsx, .xls)</p>
                  </>
                )}
              </div>
            </div>

            {/* Options d'import */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="autoCreate"
                  checked={autoCreate}
                  onChange={(e) => setAutoCreate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="autoCreate" className="cursor-pointer">
                  Créer automatiquement les catégories et sous-catégories si elles n'existent pas encore
                </label>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="setStockToZero"
                  checked={setStockToZero}
                  onChange={(e) => setSetStockToZero(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="setStockToZero" className="cursor-pointer font-medium text-amber-900">
                  Initialiser tous les stocks à <strong>0 pièce</strong> (ignorer les quantités du fichier Excel)
                </label>
              </div>
            </div>

            {/* Barre de progression pendant upload */}
            {isUploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-blue-800">
                  <span>Traitement des lignes et validation en cours...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Message d'erreur */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-blue-600/30 transition cursor-pointer"
              >
                {isUploading ? 'Traitement...' : 'Lancer l\'importation'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
