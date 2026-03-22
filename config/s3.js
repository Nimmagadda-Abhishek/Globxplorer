const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'fallback-key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'fallback-secret',
  },
});

module.exports = s3Client;
