import crypto from 'crypto';

// Generate a unique ID
export const generateUniqueId = (length = 16) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

// Generate a verification URL for certificate
export const generateVerificationUrl = (studentId, courseId) => {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:6600';
  const verificationCode = generateUniqueId(8); // Short code for verification
  return `${baseUrl}/api/v1/certificates/verify?verificationCode=${verificationCode}`;
};