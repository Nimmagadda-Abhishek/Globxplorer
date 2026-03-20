const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('../config/s3');

/**
 * Delete a file from AWS S3 by its key.
 * @param {string} key - S3 object key
 */
const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });
    const result = await s3Client.send(command);
    return result;
  } catch (error) {
    console.error('S3 deletion error:', error);
    throw error;
  }
};

module.exports = { deleteFromS3 };
