import express from 'express';
import { createOrder, verifyPayment, getPaymentHistory, getStudentPaymentHistory } from '../controllers/paymentController.js';
import { protect, authorize} from '../middleware/auth.js';

const router = express.Router();

// Route to create a Razorpay order
router.post('/create-order', protect, createOrder);

// Route to verify Razorpay payment
router.post('/verify', protect, verifyPayment);


// Get all payment history (admin-only, requires manage_payments permission)
router.get('/history', protect, authorize(['admin'], ['manage_payments']), getPaymentHistory);

// Get student's own payment history
router.get('/my-payments', protect, authorize(['student']), getStudentPaymentHistory);

export default router;