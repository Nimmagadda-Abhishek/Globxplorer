const cloudinary = require('../config/cloudinary');

/**
 * Delete a file from Cloudinary by its public_id.
 * Tries both 'image' and 'raw' types since PDFs/Images are 'image' and Docs are 'raw'.
 * @param {string} publicId - Cloudinary public_id
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    // Try deleting as an image first (handles JPG, PNG, WebP, PDF)
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result === 'ok') return result;

    // If not found as an image, try as raw (handles DOC, XLS, TXT)
    return await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw error;
  }
};

module.exports = { deleteFromCloudinary };
