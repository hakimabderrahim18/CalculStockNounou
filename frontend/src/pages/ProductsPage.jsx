import React, { useState, useEffect } from 'react';
import {
  getProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  updateQuantity,
  exportProductsExcel,
  downloadProductTemplate,
  resetAllStocks,
  resetWarehouseStocks
} from '../api/client';
import ProductFilterBar from '../components/products/ProductFilterBar';
import ProductTable from '../components/products/ProductTable';
import QuantityModal from '../components/products/QuantityModal';
import ProductFormModal from '../components/products/ProductFormModal';
import ExcelImportModal from '../components/products/ExcelImportModal';
import { Warehouse, Store, Boxes, Layers, RotateCcw } from 'lucide-react';

export default function ProductsPage({ onShowToast, onNavigateToHistory, userRole = 'admin' }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filtres & Pagination
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subCategory: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  });

  // Modals state
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState(null);
  const [selectedQuantityType, setSelectedQuantityType] = useState('STOCK');

  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);

  const [importModalOpen, setImportModalOpen] = useState(false);

  // Charger les catégories pour les filtres et formulaires
  const loadCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Erreur chargement catégories', err);
      setCategories([]);
    }
  };

  // Charger les produits avec les filtres actuels
  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const res = await getProducts(filters);
      setProducts(Array.isArray(res.data?.data) ? res.data.data : []);
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setProducts([]);
      onShowToast?.('error', 'Impossible de charger la liste des produits.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filters]);

  // Handlers pour filtres
  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: '',
      subCategory: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20
    });
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // Handler ouverture modal quantité
  const handleOpenQuantityModal = (product, quantityType) => {
    setSelectedProductForQuantity(product);
    setSelectedQuantityType(quantityType);
    setQuantityModalOpen(true);
  };

  // Handler sauvegarde modification quantité
  const handleSaveQuantity = async ({ productId, quantityType, newQuantity, reason, changedBy }) => {
    await updateQuantity(productId, { quantityType, newQuantity, reason, changedBy });
    onShowToast('success', `Quantité mise à jour avec succès (Motif : ${reason})`);
    loadProducts();
  };

  // Handler création / modification produit
  const handleOpenCreateModal = () => {
    setProductToEdit(null);
    setProductFormOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setProductToEdit(product);
    setProductFormOpen(true);
  };

  const handleSaveProduct = async (productData) => {
    if (productToEdit) {
      await updateProduct(productToEdit._id, productData);
      onShowToast('success', 'Fiche produit mise à jour avec succès.');
    } else {
      await createProduct(productData);
      onShowToast('success', 'Nouveau produit créé avec succès.');
    }
    loadProducts();
  };

  // Handler suppression produit
  const handleDeleteProduct = async (product) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le produit '${product.name}' (${product.sku}) ?`)) {
      try {
        await deleteProduct(product._id);
        onShowToast('success', 'Produit supprimé avec succès.');
        loadProducts();
      } catch (err) {
        onShowToast('error', err.response?.data?.message || 'Erreur lors de la suppression.');
      }
    }
  };

  // Handler export Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportProductsExcel(filters);
      onShowToast('success', 'Fichier Excel généré et téléchargé.');
    } catch (err) {
      onShowToast('error', "Erreur lors de l'export Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handler réinitialisation de tous les stocks à 0
  const handleResetAllStocks = async () => {
    if (!window.confirm('Voulez-vous vraiment remettre à 0 pièces les stocks de TOUS les produits ?')) {
      return;
    }
    try {
      const res = await resetAllStocks();
      onShowToast('success', res.data.message || 'Tous les stocks ont été remis à 0.');
      loadProducts();
    } catch (err) {
      onShowToast('error', 'Erreur lors de la remise à zéro des stocks.');
    }
  };

  // Handler vider uniquement le stock entrepôt
  const handleResetWarehouseStocks = async () => {
    if (!window.confirm('Voulez-vous vraiment vider le stock entrepôt de TOUS les produits (remettre à 0 pièces) ? Le stock magasin sera conservé intact.')) {
      return;
    }
    try {
      const res = await resetWarehouseStocks();
      onShowToast('success', res.data.message || 'Stock entrepôt vidé avec succès.');
      loadProducts();
    } catch (err) {
      onShowToast('error', 'Erreur lors de la remise à zéro du stock entrepôt.');
    }
  };

  // Calcul des statistiques globales de la page courante
  const safeProducts = Array.isArray(products) ? products : [];
  const totalWarehouse = safeProducts.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
  const totalStore = safeProducts.reduce((acc, p) => acc + (p.storeQuantity || 0), 0);
  const grandTotal = totalWarehouse + totalStore;

  return (
    <div className="space-y-6">
      {/* Cartes KPI de Stock */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2 sm:p-3 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl shrink-0">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{pagination.total}</div>
            <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Références</div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2 sm:p-3 bg-amber-50 text-amber-600 rounded-lg sm:rounded-xl shrink-0">
            <Warehouse className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-amber-900 truncate">{totalWarehouse}</div>
            <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">En Entrepôt</div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl shrink-0">
            <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-emerald-900 truncate">{totalStore}</div>
            <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">En Magasin</div>
          </div>
        </div>

        <div className="bg-gradient-to-tr from-blue-700 to-indigo-800 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm shadow-blue-800/20 flex items-center gap-2.5 sm:gap-3.5">
          <div className="p-2 sm:p-3 bg-white/10 text-white rounded-lg sm:rounded-xl shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-bold truncate">{grandTotal}</div>
            <div className="text-[11px] sm:text-xs font-medium text-blue-100 truncate">Total Cumulé</div>
          </div>
        </div>
      </div>

      {/* Barre d'actions rapides Entrepôt pour Admin */}
      {userRole === 'admin' && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={handleResetWarehouseStocks}
            className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-semibold transition cursor-pointer shadow-2xs"
            title="Remet le stock entrepôt à 0 pièces pour tous les produits sans toucher au magasin"
          >
            <Warehouse className="w-3.5 h-3.5 text-amber-700" />
            <span>Vider stock entrepôt (mettre à 0)</span>
          </button>
        </div>
      )}

      {/* Barre de Recherche et Filtres */}
      <ProductFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        categories={categories}
        onNewProduct={handleOpenCreateModal}
        onOpenImport={() => setImportModalOpen(true)}
        onExportExcel={handleExportExcel}
        onDownloadTemplate={downloadProductTemplate}
        isExporting={isExporting}
      />

      {/* Tableau des Produits */}
      <ProductTable
        products={products}
        isLoading={isLoading}
        pagination={pagination}
        userRole={userRole}
        onPageChange={handlePageChange}
        onOpenQuantityModal={handleOpenQuantityModal}
        onEditProduct={handleOpenEditModal}
        onDeleteProduct={handleDeleteProduct}
        onViewProductHistory={(p) => onNavigateToHistory(p._id)}
      />

      {/* Modal Changement Quantité avec Motif */}
      <QuantityModal
        isOpen={quantityModalOpen}
        onClose={() => setQuantityModalOpen(false)}
        product={selectedProductForQuantity}
        quantityType={selectedQuantityType}
        userRole={userRole}
        onSave={handleSaveQuantity}
      />

      {/* Modal Création / Édition Produit */}
      <ProductFormModal
        isOpen={productFormOpen}
        onClose={() => setProductFormOpen(false)}
        productToEdit={productToEdit}
        categories={categories}
        onSave={handleSaveProduct}
      />

      {/* Modal Import Excel */}
      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={() => {
          onShowToast('success', 'Importation terminée avec succès !');
          loadProducts();
          loadCategories();
        }}
      />
    </div>
  );
}
