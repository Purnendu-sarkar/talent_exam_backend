import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';

const sendOtp = catchAsync(async (req: Request, res: Response) => {
  // TODO: Implement send OTP logic
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'OTP sent successfully',
  });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  // TODO: Implement verify OTP logic
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'OTP verified successfully',
  });
});

export default {
  sendOtp,
  verifyOtp,
};
