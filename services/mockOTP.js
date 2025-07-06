const otpStore = new Map(); // { phone: { otp, expires } }

export const sendMockOTP = (phone) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(phone, { otp, expires });
  
  console.log(`[MOCK SMS] OTP for ${phone}: ${otp}`); // Log to console
  return otp;
};

export const verifyMockOTP = (phone, otp) => {
  const record = otpStore.get(phone);
  if (!record || record.otp !== otp || record.expires < Date.now()) {
    return false;
  }
  otpStore.delete(phone);
  return true;
};