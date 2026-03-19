const multer  = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    const isImage = file.mimetype.startsWith('image/');
    const timestamp = Date.now();
    const cleanName = file.originalname.split('.')[0].replace(/\s+/g, '_');
    
    if (isImage) {
      return {
        folder: `crm/documents/${req.params.studentId || 'misc'}`,
        public_id: `${timestamp}-${cleanName}`,
        resource_type: 'image',
      };
    } else if (isPdf) {
      // CRITICAL: PDFs must be 'image' type with 'pdf' format to be viewable in browser
      return {
        folder: `crm/documents/${req.params.studentId || 'misc'}`,
        public_id: `${timestamp}-${cleanName}`,
        resource_type: 'image',
        format: 'pdf',
      };
    } else {
      // For raw files (doc, docx, xls, etc), keep extension in public_id
      return {
        folder: `crm/documents/${req.params.studentId || 'misc'}`,
        public_id: `${timestamp}-${file.originalname.replace(/\s+/g, '_')}`,
        resource_type: 'raw',
      };
    }
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed: Images, PDF, Word, Excel, TXT'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = upload;