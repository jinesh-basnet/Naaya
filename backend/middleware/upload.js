const multer = require('multer');
const path = require('path');
const fs = require('fs');

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024, 
    files: 10 
  }
});

const uploadMultiple = (fieldName) => {
  return (req, res, next) => {
    console.log('Starting file upload for field:', fieldName);
    upload.array(fieldName, 10)(req, res, (err) => {
      if (err) {
        console.log('File upload error:', err);
        return res.status(400).json({
          message: 'File upload error',
          error: err.message
        });
      }
      next();
    });
  };
};

const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: 'File upload error',
          error: err.message
        });
      }
      next();
    });
  };
};

module.exports = {
  upload,
  uploadMultiple,
  uploadSingle
};
