import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';

const login = catchAsync(async (req: Request, res: Response) => {
  // TODO: Implement admin login logic
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Admin logged in successfully',
  });
});

export default {
  login,
};
