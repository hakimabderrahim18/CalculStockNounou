const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middlewares/errorHandler');

const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const historyRoutes = require('./routes/historyRoutes');
const lossAnalysisRoutes = require('./routes/lossAnalysisRoutes');
const observationRoutes = require('./routes/observationRoutes');

const app = express();

// Middlewares généraux
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Route de santé
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'CalculStock Backend API opérationnelle', port: process.env.PORT || 5001 });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'CalculStock Backend API opérationnelle' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API Stock Manager opérationnelle' });
});

// Déclaration des routes de l'API
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/loss-analysis', lossAnalysisRoutes);
app.use('/api/observations', observationRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// Gestionnaire d'erreurs global
app.use(errorHandler);

module.exports = app;
