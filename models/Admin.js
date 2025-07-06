import mongoose from 'mongoose';
import User from './User.js';

const adminSchema = new mongoose.Schema({
  permissions: {
    type: [String],
    enum: ['manage_users', 'manage_courses', 'manage_content', 'manage_payments', 'view_analytics', 'manage_settings'],
    default: ['manage_users', 'manage_courses', 'manage_content', 'manage_payments', 'view_analytics', 'manage_settings']
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  }
});

export default User.discriminator('admin', adminSchema);