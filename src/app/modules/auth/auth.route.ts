import { Router } from 'express';
import authController from './auth.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AuthValidation } from './auth.validation';
import { otpRequestLimiter, otpVerifyLimiter } from '../../middlewares/rateLimit.middleware';

const router = Router();

router.post(
  '/send-otp',
  otpRequestLimiter,
  validateRequest(AuthValidation.sendOtpValidationSchema),
  authController.sendOtp
);

router.post(
  '/verify-otp',
  otpVerifyLimiter,
  validateRequest(AuthValidation.verifyOtpValidationSchema),
  authController.verifyOtp
);

export default router;
