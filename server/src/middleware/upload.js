const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

const MAX_IMAGES = 3;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }
  if (
    buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const riffLength = buffer.readUInt32LE(4) + 8;
    if (riffLength >= 12 && riffLength <= buffer.length) return 'image/webp';
  }
  return null;
}

function validateImageContent(files = []) {
  for (const file of files) {
    const actualMime = detectImageMime(file.buffer);
    const declaredMime = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
    if (!actualMime || actualMime !== declaredMime) {
      return ApiError.badRequest('Image content does not match an allowed JPG, PNG, or WEBP file');
    }
  }
  return null;
}

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
    const contentError = validateImageContent(req.file ? [req.file] : []);
    if (contentError) return next(contentError);
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
    const contentError = validateImageContent(req.files || []);
    if (contentError) return next(contentError);
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
      {
        folder: 'auction-platform/auctions',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
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
  detectImageMime,
  validateImageContent,
};
