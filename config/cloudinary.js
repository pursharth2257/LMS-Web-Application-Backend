// config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Create storage engines for different types of files
const courseThumbnailStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lms/course-thumbnails',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 450, crop: 'fill' }]
  }
});

const promotionalVideoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lms/promotional-videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
    format: 'mp4'
  }
});

const contentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lms/course-content',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'mp4', 'mov', 'avi', 'mkv', 'mp3', 'doc', 'docx', 'ppt', 'pptx'],
    format: async (req, file) => {
      return file.originalname.split('.').pop();
    }
  }
});

// New storage engine for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lms/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill' }] // Resize avatars to 200x200
  }
});

// Utility functions
const uploadFile = async (filePath, options = {}) => {
  return await cloudinary.uploader.upload(filePath, options);
};

const deleteFile = async (publicId, options = {}) => {
  return await cloudinary.uploader.destroy(publicId, options);
};

export {
  cloudinary,
  courseThumbnailStorage,
  promotionalVideoStorage,
  contentStorage,
  avatarStorage, // Export the new avatar storage
  uploadFile,
  deleteFile
};