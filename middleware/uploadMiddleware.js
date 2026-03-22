const multer = require('multer');
const multerS3 = require('multer-s3');
const s3Client = require('../config/s3');

const storage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_S3_BUCKET_NAME || 'fallback-bucket-name',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const studentId = req.params.studentId || req.body.studentId || 'misc';
    const timestamp = Date.now();
    const cleanName = file.originalname.replace(/\s+/g, '_');
    const folder = `crm/documents/${studentId}`;
    const fullPath = `${folder}/${timestamp}-${cleanName}`;
    cb(null, fullPath);
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