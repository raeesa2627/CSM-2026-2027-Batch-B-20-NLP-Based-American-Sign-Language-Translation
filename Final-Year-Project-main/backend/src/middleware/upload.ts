import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image type '${file.mimetype}'. Allowed: JPEG, PNG, WebP.`));
    }
  },
});

export const audioUpload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'audio/wav', 
      'audio/wave', 
      'audio/x-wav', 
      'audio/webm', 
      'audio/ogg', 
      'audio/mpeg', 
      'audio/mp4', 
      'application/octet-stream'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.wav')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type '${file.mimetype}'. Allowed: WAV, WebM, OGG.`));
    }
  },
});

