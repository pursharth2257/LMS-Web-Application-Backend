// middleware/uploadMiddleware.js
import multer from 'multer';
import { 
  courseThumbnailStorage, 
  promotionalVideoStorage, 
  contentStorage,
  avatarStorage // Import the new avatar storage
} from '../config/cloudinary.js';

// Middleware for uploading course thumbnails
export const uploadThumbnail = multer({ 
  storage: courseThumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('thumbnail');

// Middleware for uploading promotional videos
export const uploadPromoVideo = multer({ 
  storage: promotionalVideoStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
}).single('promoVideo');

// Middleware for uploading course content
export const uploadContent = multer({ 
  storage: contentStorage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
}).single('content');

// Middleware for uploading user avatars
export const uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
}).single('avatar');
