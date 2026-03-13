const cloudinary = require('../config/cloudinary');

/**
 * Delete a file from Cloudinary by its public_id.
 * @param {string} publicId - Cloudinary public_id
 * @param {string} [resourceType] - 'image' | 'raw' (for PDFs/docs)
 */
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = { deleteFromCloudinary };
