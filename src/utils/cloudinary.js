import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a memory buffer stream directly to Cloudinary
 * @param {Buffer} fileBuffer - The multer file buffer
 * @param {string} folder - Target Cloudinary folder
 * @param {object} customOptions - Extra Cloudinary transformation/upload options
 * @returns {Promise<object|null>}
 */
export const uploadBufferToCloudinary = (
  fileBuffer,
  folder = "nirvana_republic/products",
  customOptions = {}
) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) return resolve(null);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        ...customOptions,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete an asset from Cloudinary using its public ID
 * @param {string} publicId - The public ID of the resource
 * @param {string} resourceType - "image" | "raw" | "video"
 * @returns {Promise<object>}
 */
export const deleteFromCloudinary = async (
  publicId,
  resourceType = "image"
) => {
  try {
    if (!publicId) return null;
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error("Cloudinary asset deletion error:", error);
    return null;
  }
};

export default cloudinary;