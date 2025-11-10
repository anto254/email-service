const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const createUploadDirs = () => {
  const uploadDirs = [
    'uploads/documents',
    'uploads/attachments',
    'uploads/images',
    'uploads/temp'
  ];
  
  uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

// Initialize upload directories
createUploadDirs();

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    documents: /\.(pdf|doc|docx|txt|rtf)$/i,
    images: /\.(jpg|jpeg|png|gif|bmp|webp)$/i,
    attachments: /\.(pdf|doc|docx|txt|rtf|jpg|jpeg|png|gif|bmp|webp|zip|rar|xlsx|xls|csv)$/i,
    all: /\.(pdf|doc|docx|txt|rtf|jpg|jpeg|png|gif|bmp|webp|zip|rar|xlsx|xls|csv|mp4|mov|avi)$/i
  };

  const uploadType = req.uploadType || 'attachments';
  const regex = allowedTypes[uploadType] || allowedTypes.attachments;

  if (regex.test(file.originalname.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${uploadType}. Please upload a valid file.`), false);
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.uploadType || 'attachments';
    const dest = path.join(__dirname, '..', 'uploads', uploadType);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '-');
    const fileName = `${Date.now()}-${uniqueId}-${sanitizedName}${extension}`;
    cb(null, fileName);
  }
});

// Memory storage for temporary processing
const memoryStorage = multer.memoryStorage();

// File size limits (in bytes)
const fileSizeLimits = {
  documents: 10 * 1024 * 1024, // 10MB
  images: 5 * 1024 * 1024,     // 5MB
  attachments: 15 * 1024 * 1024, // 15MB
  all: 20 * 1024 * 1024        // 20MB
};

// Create multer instances
const createUploadMiddleware = (uploadType = 'attachments', maxFiles = 5) => {
  const limits = {
    fileSize: fileSizeLimits[uploadType] || fileSizeLimits.attachments,
    files: maxFiles
  };

  return multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      req.uploadType = uploadType;
      fileFilter(req, file, cb);
    },
    limits,
    onError: (err, next) => {
      console.error('Upload error:', err);
      next(err);
    }
  });
};

// Memory upload for processing without saving
const memoryUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: fileSizeLimits.all,
    files: 10
  }
});

// Specific upload configurations
const uploadConfigs = {
  // Single file uploads
  singleDocument: createUploadMiddleware('documents', 1).single('document'),
  singleImage: createUploadMiddleware('images', 1).single('image'),
  singleAttachment: createUploadMiddleware('attachments', 1).single('attachment'),

  // Multiple file uploads
  multipleDocuments: createUploadMiddleware('documents', 5).array('documents', 5),
  multipleImages: createUploadMiddleware('images', 10).array('images', 10),
  multipleAttachments: createUploadMiddleware('attachments', 10).array('attachments', 10),

  // Mixed field uploads
  leadAttachments: createUploadMiddleware('attachments', 10).fields([
    { name: 'documents', maxCount: 5 },
    { name: 'images', maxCount: 5 }
  ]),

  // Memory uploads
  memoryDocument: memoryUpload.single('document'),
  memoryMultiple: memoryUpload.array('files', 10),

  // Custom field uploads
  bookingFiles: createUploadMiddleware('attachments', 8).fields([
    { name: 'voucher', maxCount: 1 },
    { name: 'confirmation', maxCount: 1 },
    { name: 'itinerary', maxCount: 1 },
    { name: 'attachments', maxCount: 5 }
  ])
};

// Upload error handler middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${Math.round((fileSizeLimits[req.uploadType || 'attachments']) / (1024 * 1024))}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts';
        break;
    }
    
    return res.status(400).json({
      success: false,
      message,
      statusCode: 400
    });
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      statusCode: 400
    });
  }
  
  next(error);
};

// File cleanup utility
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
  return false;
};

// File validation utility
const validateFile = (file, allowedTypes = 'attachments') => {
  const typeRegex = {
    documents: /\.(pdf|doc|docx|txt|rtf)$/i,
    images: /\.(jpg|jpeg|png|gif|bmp|webp)$/i,
    attachments: /\.(pdf|doc|docx|txt|rtf|jpg|jpeg|png|gif|bmp|webp|zip|rar|xlsx|xls|csv)$/i
  };
  
  const regex = typeRegex[allowedTypes] || typeRegex.attachments;
  const isValidType = regex.test(file.originalname);
  const isValidSize = file.size <= (fileSizeLimits[allowedTypes] || fileSizeLimits.attachments);
  
  return {
    valid: isValidType && isValidSize,
    type: isValidType,
    size: isValidSize,
    maxSize: fileSizeLimits[allowedTypes] || fileSizeLimits.attachments
  };
};

// Get file info utility
const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    extension: path.extname(file.originalname),
    uploadedAt: new Date()
  };
};

module.exports = {
  uploadConfigs,
  handleUploadError,
  cleanupFile,
  validateFile,
  getFileInfo,
  fileSizeLimits,
  createUploadMiddleware
};