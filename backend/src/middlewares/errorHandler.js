const errorHandler = (err, req, res, next) => {
  console.error('[Error Details]:', err);

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: messages
    });
  }

  // Doublon MongoDB (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(409).json({
      success: false,
      message: `La valeur '${value}' existe déjà pour le champ '${field}'.`
    });
  }

  // CastError (ID invalide)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Ressource non trouvée avec l'identifiant ${err.value}`
    });
  }

  // Multer Error
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `Erreur d'upload: ${err.message}`
    });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur'
  });
};

module.exports = errorHandler;
