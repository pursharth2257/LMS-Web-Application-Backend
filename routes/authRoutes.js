import express from 'express';
import {
  register,
  verifyEmail,
  verifyPhone,
  login,
  loginPhone, 
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword,
} from '../controllers/authController.js';
import { googleAuth } from '../controllers/googleAuthController.js';
import { protect } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/verify-phone', verifyPhone);
router.post('/login', login);
router.post('/login-phone', loginPhone);
router.get('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password', resetPassword);

router.get('/me', protect, getMe);
router.put('/updatedetails', protect, uploadAvatar, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.post('/google', googleAuth);

export default router;