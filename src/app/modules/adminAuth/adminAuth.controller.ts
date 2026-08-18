import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AdminAuthService } from './adminAuth.service';
import httpStatus from 'http-status';

const sendOtp = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await AdminAuthService.sendOtp(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'OTP sent successfully to admin email',
  });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await AdminAuthService.verifyOtp(email, otp);

  // Strictly returning only token and message
  res.status(httpStatus.OK).json({
    message: 'Login successful',
    token: result.token,
  });
});

export default {
  sendOtp,
  verifyOtp,
};
