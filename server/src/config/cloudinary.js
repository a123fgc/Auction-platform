// server/src/config/cloudinary.js
const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

if (!env.CLOUDINARY.cloud_name) {
  console.error('[cloudinary] WARNING: CLOUDINARY_CLOUD_NAME is not set. Uploads will fail.');
} else {
  cloudinary.config({
    cloud_name: env.CLOUDINARY.cloud_name,
    api_key: env.CLOUDINARY.api_key,
    api_secret: env.CLOUDINARY.api_secret,
    secure: true,
  });
}

module.exports = cloudinary;