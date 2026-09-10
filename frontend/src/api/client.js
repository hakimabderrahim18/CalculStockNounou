import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000
});

// Helper pour déclencher le téléchargement d'un fichier Blob reçu du backend
export const triggerFileDownload = (blobData, defaultFilename = 'export.xlsx') => {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ==================== PRODUITS ====================
export const getProducts = (params = {}) => api.get('/products', { params });
export const getProductById = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// PATCH mise à jour quantité (Stock / Magasin)
export const updateQuantity = (id, payload) =>
  api.patch(`/products/${id}/quantity`, payload);

// POST action de réparation (sortie ou retour pièce stock magasin uniquement)
export const repairMovement = (id, payload) =>
  api.post(`/products/${id}/repair`, payload);

// POST réinitialiser tous les stocks à 0
export const resetAllStocks = () =>
  api.post('/products/reset-all-stocks');

// POST vider uniquement le stock entrepôt à 0
export const resetWarehouseStocks = () =>
  api.post('/products/reset-warehouse-stocks');

// Export Excel des produits
export const exportProductsExcel = async (params = {}) => {
  const response = await api.get('/products/export', {
    params,
    responseType: 'blob'
  });
  const dateStr = new Date().toISOString().split('T')[0];
  triggerFileDownload(response.data, `produits_filtres_${dateStr}.xlsx`);
};

// Téléchargement du modèle Excel type
export const downloadProductTemplate = async () => {
  const response = await api.get('/products/import/template', {
    responseType: 'blob'
  });
  triggerFileDownload(response.data, 'modele_import_produits.xlsx');
};

// Import de produits Excel avec FormData
export const importProductsExcel = (
  file,
  autoCreateCategories = true,
  setStockToZero = false,
  preserveExistingStocks = false
) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(
    `/products/import?autoCreateCategories=${autoCreateCategories}&setStockToZero=${setStockToZero}&preserveExistingStocks=${preserveExistingStocks}`,
    formData,
    {
      timeout: 180000 // 3 minutes de délai pour gros volumes
    }
  );
};

// ==================== CATÉGORIES & SOUS-CATÉGORIES ====================
export const getCategories = () => api.get('/categories');
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

export const getSubCategories = (categoryId = '') =>
  api.get('/subcategories', { params: categoryId ? { categoryId } : {} });
export const createSubCategory = (data) => api.post('/subcategories', data);
export const updateSubCategory = (id, data) => api.put(`/subcategories/${id}`, data);
export const deleteSubCategory = (id) => api.delete(`/subcategories/${id}`);

export const exportCategoriesExcel = async () => {
  const response = await api.get('/categories/export', { responseType: 'blob' });
  triggerFileDownload(response.data, 'categories_souscategories.xlsx');
};

// ==================== HISTORIQUE ====================
export const getHistory = (params = {}) => api.get('/history', { params });

export const exportHistoryExcel = async (params = {}) => {
  const response = await api.get('/history/export', {
    params,
    responseType: 'blob'
  });
  const dateStr = new Date().toISOString().split('T')[0];
  triggerFileDownload(response.data, `historique_stock_${dateStr}.xlsx`);
};

// ==================== ANALYSE DE PERTES & ÉCARTS ====================
export const compareStockExcel = (file, title = '', performedBy = 'Admin') => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (performedBy) formData.append('performedBy', performedBy);

  return api.post('/loss-analysis/compare', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getAuditHistory = () => api.get('/loss-analysis');
export const getAuditById = (id) => api.get(`/loss-analysis/${id}`);

export const exportAuditExcel = async (id, title = 'inventaire') => {
  const response = await api.get(`/loss-analysis/${id}/export`, {
    responseType: 'blob'
  });
  const safeTitle = (title || 'inventaire').replace(/[^a-zA-Z0-9_\-]/g, '_');
  triggerFileDownload(response.data, `Analyse_Pertes_${safeTitle}.xlsx`);
};

export const applyAudit = (id, targetLocation = 'STOCK', performedBy = 'Admin') =>
  api.post(`/loss-analysis/${id}/apply`, { targetLocation, performedBy });

export const deleteAudit = (id) => api.delete(`/loss-analysis/${id}`);

// ==================== JOURNAL D'OBSERVATIONS (MAGASINIER) ====================
export const getObservations = (params = {}) => api.get('/observations', { params });
export const getObservationStats = () => api.get('/observations/stats');
export const getObservationById = (id) => api.get(`/observations/${id}`);
export const createObservation = (data) => api.post('/observations', data);
export const updateObservation = (id, data) => api.put(`/observations/${id}`, data);
export const deleteObservation = (id) => api.delete(`/observations/${id}`);

export default api;
