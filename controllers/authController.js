import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Instructor from '../models/Instructor.js';
import Admin from '../models/Admin.js';
import { generateOTP, sendOTPEmail } from '../services/otpService.js';
import { sendEmail } from '../services/emailService.js';
import { cloudinary, deleteFile } from '../config/cloudinary.js';
import { sendMockOTP, verifyMockOTP } from '../services/mockOTP.js';

// Helper function to generate token
export const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Register a new user (student by default)
export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone, role = 'student', provider = 'local' } = req.body;

    // Validate phone format if provided
    if (phone && !/^\+?[\d\s-]{7,15}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    // Create user based on role
    let user;
    const userData = { firstName, lastName, email, phone, role, provider };

    // Only set password for local provider
    if (provider === 'local') {
      userData.password = password;
    }

    switch (role) {
      case 'student':
        user = await Student.create(userData);
        break;
      case 'instructor':
        user = await Instructor.create({ ...userData, approved: false });
        break;
      case 'admin':
        if (req.user?.role !== 'admin' || !req.user?.isSuperAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to create admin accounts'
          });
        }
        user = await Admin.create(userData);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
    }

    // Handle OTP based on provider and phone presence
    if (provider === 'local') {
      if (phone) {
        // Send phone OTP and skip email OTP
        const phoneOtp = sendMockOTP(phone); // Logged to console
        user.phoneOTP = phoneOtp;
        user.phoneOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        user.isVerified = true; // Automatically verify email since phone OTP is used
        await user.save();
      } else {
        // Generate OTP for email verification if no phone is provided
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Send verification email
        await sendOTPEmail(email, otp);
      }
    } else if (provider === 'google') {
      user.isVerified = true; // Google users are auto-verified
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: provider === 'google' || phone ?
        'User registered successfully. Please verify your phone if provided.' :
        'User registered successfully. Please verify your email.',
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        provider: user.provider
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify email with OTP
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpires');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if OTP matches and isn't expired
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // For students, notify admin for approval
    if (user.role === 'student') {
      // You would typically send a notification to admin here
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Verify phone with OTP
export const verifyPhone = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone }).select('+phoneOTP +phoneOTPExpires');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if OTP matches and isn't expired
    if (!verifyMockOTP(phone, otp) || (user.phoneOTP !== otp || user.phoneOTPExpires < Date.now())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark phone as verified
    user.isPhoneVerified = true;
    user.phoneOTP = undefined;
    user.phoneOTPExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Phone verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Login user with email and password
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified for local users
    if (!user.isVerified && user.provider === 'local') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user with phone and OTP
export const loginPhone = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone }).select('+phoneOTP +phoneOTPExpires');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if phone is verified
    if (!user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your phone first'
      });
    }

    // Check if OTP matches (for additional security, though optional after verification)
    if (user.provider === 'local' && (!verifyMockOTP(phone, otp) || user.phoneOTP !== otp)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Logged in successfully with phone',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Logout user
export const logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Forgot password - send reset email
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_RESET_SECRET,
      { expiresIn: '15m' }
    );

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Send reset email
    const resetUrl = `https://lms-app-delta-eight.vercel.app/reset-password?token=${resetToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html: `You are receiving this email because you requested a password reset. Please click the following link to reset your password: <a href="${resetUrl}">${resetUrl}</a>`
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);

    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Update user details
export const updateDetails = async (req, res, next) => {
  try {
    // Check if we have either body fields or a file
    if (!req.file && (!req.body || Object.keys(req.body).length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }

    const fieldsToUpdate = {};

    // Handle regular fields
    if (req.body) {
      if (req.body.firstName) fieldsToUpdate.firstName = req.body.firstName;
      if (req.body.lastName) fieldsToUpdate.lastName = req.body.lastName;
      if (req.body.phone) fieldsToUpdate.phone = req.body.phone;
    }

    // Handle avatar upload
    if (req.file) {
      // Validate file type
      const allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedFormats.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file format. Only JPG, PNG, and WebP are allowed.'
        });
      }

      // Delete old avatar if it exists
      const currentUser = await User.findById(req.user.id);
      if (currentUser.avatar && currentUser.avatar !== 'https://res.cloudinary.com/dcgilmdbm/image/upload/v1747893719/default_avatar_xpw8jv.jpg') {
        const publicId = currentUser.avatar.split('/').pop().split('.')[0];
        await deleteFile(`lms/avatars/${publicId}`);
      }

      fieldsToUpdate.avatar = req.file.path;
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update Details Error:', error);
    next(error);
  }
};

// Update password
export const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};