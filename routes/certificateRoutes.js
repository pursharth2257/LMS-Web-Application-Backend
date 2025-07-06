import express from 'express';
import {
  generateCertificate,
  getCertificate,
  verifyCertificate,
  revokeCertificate,
  getStudentCertificates,
} from '../controllers/certificateController.js';
import { protect, authorize, checkVerified } from '../middleware/auth.js';

const router = express.Router();

// Routes for certificate management
router.route('/')
  .post(
    protect,
    checkVerified,
    authorize(['admin', 'instructor']),
    generateCertificate
  );

router.route('/:id')
  .get(protect, checkVerified, getCertificate);

router.route('/verify')
  .get(verifyCertificate); // Public route for verification

router.route('/:certificateId/revoke')
  .put(
    protect,
    checkVerified,
    authorize(['admin', 'instructor']),
    revokeCertificate
  );

router.route('/student/:studentId')
  .get(protect, checkVerified, getStudentCertificates);

export default router;