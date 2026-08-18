import { z } from 'zod';

export const sendOtpValidationSchema = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required' }).email('Invalid email address'),
  }),
});

export const verifyOtpValidationSchema = z.object({
  body: z.object({
    email: z.string({ message: 'Email is required' }).email('Invalid email address'),
    otp: z
      .string({ message: 'OTP is required' })
      .length(6, 'OTP must be exactly 6 characters'),
  }),
});

export const AdminAuthValidation = {
  sendOtpValidationSchema,
  verifyOtpValidationSchema,
};
