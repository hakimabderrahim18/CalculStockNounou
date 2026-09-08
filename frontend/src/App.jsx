import React, { useState } from 'react';
import Navbar from './components/common/Navbar';
import Toast from './components/common/Toast';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import HistoryPage from './pages/HistoryPage';
import RepairWorkshopPage from './pages/RepairWorkshopPage';
import LossAnalysisPage from './pages/LossAnalysisPage';
import ObservationJournalPage from './pages/ObservationJournalPage';

export default function App() {
  const [currentTab, setCurrentTab] = useState('products');
  const [userRole, setUserRole] = useState('admin'); // 'admin' | 'magasinier' | 'reparateur'
  const [toast, setToast] = useState(null);
  const [historyTargetProductId, setHistoryTargetProductId] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const handleNavigateToHistory = (productId) => {
    setHistoryTargetProductId(productId);
    setCurrentTab('history');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Barre de navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        userRole={userRole}
        onSelectRole={setUserRole}
      />

      {/* Bannière indicative de rôle si non-admin */}
      {userRole === 'magasinier' && (
        <div className="bg-amber-50 border-b border-amber-200 py-1.5 px-4 text-center text-xs text-amber-900 font-medium">
          Profil <strong>Magasinier</strong> actif : vous pouvez gérer le stock magasin. Le stock entrepôt est verrouillé en lecture seule.
        </div>
      )}
      {userRole === 'reparateur' && (
        <div className="bg-blue-50 border-b border-blue-200 py-1.5 px-4 text-center text-xs text-blue-900 font-medium">
          Profil <strong>Réparateur</strong> actif : sorties et retours de pièces sur le stock magasin pour vos réparations.
        </div>
      )}

      {/* Contenu principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentTab === 'products' && (
          <ProductsPage
            onShowToast={showToast}
            onNavigateToHistory={handleNavigateToHistory}
            userRole={userRole}
          />
        )}

        {currentTab === 'observations' && (
          <ObservationJournalPage
            onShowToast={showToast}
            userRole={userRole}
          />
        )}

        {currentTab === 'loss-analysis' && (
          <LossAnalysisPage onShowToast={showToast} />
        )}

        {currentTab === 'repair' && (
          <RepairWorkshopPage onShowToast={showToast} />
        )}

        {currentTab === 'history' && (
          <HistoryPage
            onShowToast={showToast}
            selectedProductId={historyTargetProductId}
            onClearProductFilter={() => setHistoryTargetProductId(null)}
          />
        )}

        {currentTab === 'categories' && (
          <CategoriesPage onShowToast={showToast} />
        )}
      </main>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>CalculStock Nounou &copy; {new Date().getFullYear()} - Stack MERN (MongoDB, Express, React, Node.js)</p>
      </footer>
    </div>
  );
}
