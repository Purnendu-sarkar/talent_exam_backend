import { Router } from 'express';
import adminAuthController from './adminAuth.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AdminAuthValidation } from './adminAuth.validation';
import { adminLoginLimiter } from '../../middlewares/rateLimit.middleware';

const router = Router();

router.post(
  '/send-otp',
  adminLoginLimiter,
  validateRequest(AdminAuthValidation.sendOtpValidationSchema),
  adminAuthController.sendOtp
);

router.post(
  '/verify-otp',
  adminLoginLimiter,
  validateRequest(AdminAuthValidation.verifyOtpValidationSchema),
  adminAuthController.verifyOtp
);

export default router;
