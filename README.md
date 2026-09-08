# CalculStock Nounou 📦

Application web complète pour la gestion de produits avec **suivi de stock sur deux emplacements** (Stock Entrepôt + Stock Magasin), historique d'audit exhaustif avec motifs obligatoires, gestion hiérarchique Catégories/Sous-catégories et import/export Excel (.xlsx).

---

## 🚀 Technologies utilisées (Stack MERN)

- **MongoDB** : Base de données NoSQL (schémas Mongoose, indexation texte et compound, transactions de mise à jour).
- **Express.js & Node.js** : API REST sécurisée, Multer (upload en mémoire), ExcelJS (génération et parsing de fichiers Excel), express-validator.
- **React (Vite)** : Interface utilisateur fluide, Tailwind CSS, Lucide Icons, React-DatePicker, Axios.

---

## 📋 Fonctionnalités clés

1. **Double gestion de stock (Entrepôt & Magasin)** :
   - Stock Entrepôt et Stock Magasin modifiables indépendamment.
   - **Quantité Totale calculée automatiquement** (`Stock + Magasin`) et verrouillée en base via hook Mongoose `pre('save')`.
   - Empêchement strict des valeurs négatives.

2. **Validation obligatoire des mouvements de stock** :
   - Boîte de dialogue interactive pour chaque ajustement.
   - Saisie d'un **motif obligatoire** (suggestions en un clic : réapprovisionnement, vente, transfert interne, inventaire...).
   - Aperçu en direct de la variation (`+` ou `-`) et du nouveau stock total résultant.

3. **Historique des mouvements (`HistoryLog`)** :
   - Traçabilité horodatée de chaque variation avec : produit, type (entrepôt ou magasin), ancienne/nouvelle valeur, différence, motif et opérateur.
   - Page dédiée avec filtres (recherche, type d'emplacement, plage de dates) et export Excel dédié.
   - Bouton d'accès direct à l'historique par produit depuis la liste principale.

4. **Catégories & Sous-catégories** :
   - Relation hiérarchique parent-enfant (`Category` -> `SubCategory`).
   - Sélection dynamique en cascade lors de la création/édition de produit.
   - Filtrage combiné par catégorie et sous-catégorie.
   - Gestionnaire CRUD dédié avec protection contre la suppression de catégories utilisées.

5. **Filtres et recherche multi-critères** :
   - Recherche en temps réel insensible à la casse sur nom et SKU (avec debounce 350ms).
   - Filtre par catégorie et sous-catégorie.
   - Filtre par plage de dates (`react-datepicker`).

6. **Import & Export Excel (.xlsx)** :
   - **Export** : Respecte les filtres appliqués ou exporte tout (colonnes stylisées, en-têtes contrastés, largeurs adaptées).
   - **Modèle Excel** : Téléchargement d'un fichier type avec exemples.
   - **Import avec Multer & ExcelJS** :
     - Drag & drop de fichier `.xlsx`.
     - Validation ligne par ligne (champs obligatoires, SKU unique, quantités positives).
     - Option de création automatique des catégories/sous-catégories manquantes.
     - Rapport d'import détaillé (nombre de succès, lignes en erreur avec détail exact).
     - Création automatique d'entrées d'historique avec le motif `"Import Excel"`.

---

## 🛠️ Structure du Projet

```text
CalculStockNounou/
├── backend/
│   ├── src/
│   │   ├── config/db.js              # Connexion MongoDB
│   │   ├── controllers/              # productController, categoryController, historyController
│   │   ├── middlewares/              # upload (Multer), validators, errorHandler
│   │   ├── models/                   # Product, Category, SubCategory, HistoryLog
│   │   ├── routes/                   # productRoutes, categoryRoutes, subCategoryRoutes, historyRoutes
│   │   ├── services/excelService.js  # Génération & lecture Excel (ExcelJS)
│   │   ├── app.js                    # Express app & middlewares
│   │   └── server.js                 # Point d'entrée HTTP
│   ├── .env
│   ├── seed.js                       # Données de test initiales
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js             # Client Axios & téléchargements blob
│   │   ├── components/
│   │   │   ├── common/               # Navbar, Modal, Toast
│   │   │   ├── products/             # ProductTable, ProductFilterBar, QuantityModal, ProductFormModal, ExcelImportModal
│   │   │   ├── categories/           # CategoryManager
│   │   │   └── history/              # HistoryTable, HistoryFilterBar
│   │   ├── pages/                    # ProductsPage, CategoriesPage, HistoryPage
│   │   ├── App.jsx                   # Navigation principale
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── package.json                      # Scripts racine
└── README.md
```

---

## ⚙️ Installation & Démarrage

### Prérequis
- **Node.js** (v18+)
- **MongoDB** en cours d'exécution localement (`mongodb://localhost:27017`) ou cluster MongoDB Atlas.

### 1. Installation des dépendances
À la racine du projet :
```bash
npm run install:all
```
*(Ou manuellement : `cd backend && npm install`, puis `cd ../frontend && npm install`)*

### 2. Variables d'environnement
Le fichier `backend/.env` est déjà préconfiguré :
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/calcul_stock_nounou
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. (Optionnel) Charger des données de test
Pour tester immédiatement l'interface avec des données prêtes à l'emploi :
```bash
npm run seed
```
*(Crée 3 catégories, 5 sous-catégories, 5 produits et leurs historiques initiaux).*

### 4. Démarrage des serveurs

Ouvrez deux terminaux :

- **Terminal 1 - Backend (port 5000)** :
  ```bash
  npm run backend
  ```

- **Terminal 2 - Frontend (port 5173)** :
  ```bash
  npm run frontend
  ```

L'application est ensuite accessible sur : **http://localhost:5173** (avec proxy automatique vers l'API backend `/api`).
