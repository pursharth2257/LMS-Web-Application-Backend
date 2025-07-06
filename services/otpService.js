import { sendEmail } from "../services/emailService.js";

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  
  export const sendOTPEmail = async (email, otp) => {
    const message = `Your OTP for email verification is: ${otp}. It will expire in 10 minutes.`;
    
    await sendEmail({
      email,
      subject: 'Email Verification OTP',
      message,
      html: `<p>Your OTP for email verification is: <strong>${otp}</strong>. It will expire in 10 minutes.</p>`
    });
  };