const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

let storage;
if (false) { 
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'naaya',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'webp', 'heic', 'heif'],
      transformation: [
        { width: 1080, height: 1080, crop: 'limit', quality: 'auto' }
      ]
    }
  });
} else {
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(uploadsPath, { recursive: true });
  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  storage = multerStorage;
}

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
