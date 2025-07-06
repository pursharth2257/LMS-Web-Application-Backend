import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Generate a short receipt ID (max 40 characters)
const generateReceipt = (courseId, userId) => {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const shortCourseId = courseId.slice(-6); // Last 6 characters of courseId
  const shortUserId = userId.slice(-6); // Last 6 characters of userId
  const receipt = `rcpt_${shortCourseId}_${shortUserId}_${timestamp}`;
  console.log('Generated receipt:', receipt, 'Length:', receipt.length);
  return receipt;
};

// Create a Razorpay order
export const createOrder = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    console.log('Create order request:', { courseId, userId: req.user?.id });

    // Validate input
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid courseId format' });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check if student exists
    if (!req.user?.id || !mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(401).json({ success: false, message: 'Invalid or missing user ID' });
    }

    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
    });
    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }

    // Use discountPrice if available, otherwise use regular price
    const amount = course.price - course.discountPrice;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid course price' });
    }

    const currency = course.currency || 'INR';

    // Create Razorpay order
    const receipt = generateReceipt(courseId, req.user.id);
    if (receipt.length > 40) {
      console.error('Receipt too long:', receipt);
      return res.status(400).json({ success: false, message: 'Generated receipt exceeds 40 characters' });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt,
    };

    console.log('Creating Razorpay order with options:', options);

    const order = await razorpay.orders.create(options);

    // Create payment record
    const payment = await Payment.create({
      student: req.user.id,
      course: courseId,
      amount: amount,
      currency,
      paymentMethod: 'razorpay',
      transactionId: order.id,
      status: 'pending',
    });

    console.log('Order and payment created:', { orderId: order.id, paymentId: payment._id });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    if (error.statusCode === 400 && error.error?.description) {
      return res.status(400).json({ success: false, message: error.error.description });
    }
    next(error);
  }
};

// Verify Razorpay payment
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;

    console.log('Verify payment request:', { razorpay_order_id, paymentId });

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
      return res.status(400).json({ success: false, message: 'Missing required payment details' });
    }

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid paymentId' });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Update payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    payment.status = 'completed';
    payment.transactionId = razorpay_payment_id;
    await payment.save();

    console.log('Payment verified:', { paymentId, transactionId: razorpay_payment_id });

    res.status(200).json({ success: true, data: { paymentId: payment._id } });
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    next(error);
  }
};

// Get All Payment History (Admin)
export const getPaymentHistory = async (req, res, next) => {
  try {
    // Check if user is an admin with manage_payments permission
    if (!req.user || req.user.role !== 'admin' || !req.user.permissions.includes('manage_payments')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin with manage_payments permission required'
      });
    }

    const payments = await Payment.find({})
      .populate({
        path: 'student',
        select: 'firstName lastName email',
        model: 'User' // Referencing the parent User model
      })
      .populate('course', 'title')
      .sort({ paymentDate: -1 }) // Sort by payment date, most recent first
      .select('student course amount currency paymentMethod transactionId status paymentDate invoiceNumber notes');

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    next(error);
  }
};

// Get Student's Own Payment History
export const getStudentPaymentHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ student: req.user.id })
      .populate({
        path: 'student',
        select: 'firstName lastName email',
        model: 'User'
      })
      .populate('course', 'title')
      .sort({ paymentDate: -1 })
      .select('student course amount currency paymentMethod transactionId status paymentDate invoiceNumber notes');

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching student payment history:', error);
    next(error);
  }
};