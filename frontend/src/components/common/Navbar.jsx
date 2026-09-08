import React from 'react';
import { Boxes, History, Layers, Package, Wrench, Shield, Store, UserCheck, Scale, ClipboardList } from 'lucide-react';

export default function Navbar({ currentTab, onSelectTab, userRole = 'admin', onSelectRole }) {
  const navItems = [
    { id: 'products', label: 'Stocks & Produits', shortLabel: 'Stocks', icon: Boxes },
    { id: 'observations', label: "Journal Observations", shortLabel: 'Journal', icon: ClipboardList, badge: 'Magasin' },
    { id: 'loss-analysis', label: 'Diagnostic & Inventaire', shortLabel: 'Diagnostic', icon: Scale, badge: 'Audit' },
    { id: 'repair', label: 'Espace Réparateurs', shortLabel: 'Atelier', icon: Wrench, badge: 'Atelier' },
    { id: 'history', label: 'Historique', shortLabel: 'Historique', icon: History },
    { id: 'categories', label: 'Catégories', shortLabel: 'Catégories', icon: Layers }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Ligne 1 : Logo & Rôle */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Titre */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-xs">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                CalculStock <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded-full border border-blue-200">Nounou</span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">Entrepôt & Magasin</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (caché sur mobile) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs xl:text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                        isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sélecteur de Profil / Rôle */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <select
                value={userRole}
                onChange={(e) => {
                  const newRole = e.target.value;
                  onSelectRole(newRole);
                  if (newRole === 'reparateur') {
                    onSelectTab('repair');
                  }
                }}
                className="bg-white text-slate-800 font-semibold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[11px] sm:text-xs cursor-pointer shadow-2xs"
              >
                <option value="admin">🛡️ Admin</option>
                <option value="magasinier">🏪 Magasinier</option>
                <option value="reparateur">🔧 Réparateur</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ligne 2 (Mobile & Tablette < lg) : Barre d'onglets tactile à défilement horizontal fluide */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none -mx-3 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.shortLabel}</span>
                {item.badge && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
