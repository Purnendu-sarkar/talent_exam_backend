import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { AuthService } from './auth.service';
import httpStatus from 'http-status';

const sendOtp = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await AuthService.sendOtp(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'OTP sent successfully to email',
  });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await AuthService.verifyOtp(email, otp);

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
