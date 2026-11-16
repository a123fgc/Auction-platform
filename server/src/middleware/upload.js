const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

const MAX_IMAGES = 3;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpe?g|png|webp)$/.test(file.mimetype)) {
      return cb(new Error('Only JPG, PNG or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

function uploadSingle(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Image exceeds 5MB limit'));
      }
      return next(ApiError.badRequest(err.message));
    }
    next();
  });
}

function uploadArray(req, res, next) {
  upload.array('images', MAX_IMAGES)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Each image must be ≤5MB'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(ApiError.badRequest(`Max ${MAX_IMAGES} images allowed`));
      }
      return next(ApiError.badRequest(err.message));
    }
    next();
  });
}

function uploadBufferToCloudinary(buffer) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return Promise.reject(
      ApiError.badRequest('Image upload not configured (Cloudinary missing)')
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'auction-platform/auctions', resource_type: 'image' },
      (error, result) => {
        if (error) {
          console.error('[cloudinary] real error:', error);
          return reject(ApiError.badRequest('Image upload failed'));
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

async function uploadFiles(files = []) {
  return Promise.all(files.map((f) => uploadBufferToCloudinary(f.buffer)));
}

module.exports = {
  uploadSingle,
  uploadArray,
  uploadFiles,
  MAX_IMAGES,
};