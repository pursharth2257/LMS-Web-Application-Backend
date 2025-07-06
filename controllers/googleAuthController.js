import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import dotenv from "dotenv";
import { generateToken } from './authController.js';

dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required' });
    }

    // Verify the Google ID token with debugging
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log('Google Payload:', payload); // Debug payload

    const { sub: googleId, email, given_name: firstName, family_name: lastName = '', picture: avatar } = payload;
    const defaultRole = 'student';

    // Validate required fields
    if (!googleId || !email || !firstName) {
      return res.status(400).json({ success: false, message: 'Invalid token payload' });
    }

    // Check if user exists with this googleId
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if email already exists
      const existingUser = await User.findOne({ email }).select('+provider +role');
      
      if (existingUser) {
        if (existingUser.provider === 'local') {
          existingUser.googleId = googleId;
          existingUser.provider = 'google';
          existingUser.isVerified = true;
          if (avatar) existingUser.avatar = avatar;
          user = await existingUser.save();
        } else {
          return res.status(400).json({
            success: false,
            message: 'Email already linked to another Google account',
          });
        }
      } else {
        // Create new user with default lastName if missing
        user = await User.create({
          googleId,
          email,
          firstName,
          lastName: lastName || 'Unknown', // Default to 'Unknown' if family_name is missing
          avatar: avatar || 'https://res.cloudinary.com/dcgilmdbm/image/upload/v1747893719/default_avatar_xpw8jv.jpg',
          provider: 'google',
          isVerified: true,
          password: 'google-auth-no-password',
          role: defaultRole,
        });
      }
    } else if (!user.role) {
      // Ensure role is set for existing users without a role
      user.role = defaultRole;
      await user.save();
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
      message: 'Google authentication successful',
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
    console.error('Google authentication error:', {
      message: error.message,
      stack: error.stack,
      code: error.code, // For MongoDB errors
    });
    next(error);
  }
};