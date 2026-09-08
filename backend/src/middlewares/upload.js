const multer = require('multer');
const path = require('path');

// Stockage en mémoire pour traitement direct avec SheetJS et ExcelJS
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const filetypes = /xlsx|xls|csv|tsv|txt/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype =
    file.mimetype.includes('spreadsheet') ||
    file.mimetype.includes('excel') ||
    file.mimetype.includes('csv') ||
    file.mimetype === 'application/octet-stream' ||
    file.mimetype === 'text/plain' ||
    extname;

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers de tableur (.xlsx, .xls, .csv) sont autorisés'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // Limite 25MB
  fileFilter
});

module.exports = upload;
