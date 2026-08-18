import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../../shared/prisma';
import config from '../../../config';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { OtpPurpose } from '@prisma/client';
import { sendEmail } from '../email/email.service';
import { normalizeEmail } from '../../utils/email.utils';

export const sendOtp = async (email: string, purpose: OtpPurpose) => {
  const normalizedEmail = normalizeEmail(email);

  // 1. Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // 2. Hash OTP
  const otpHash = await bcrypt.hash(otp, 12);
  
  // 3. Expiration time
  const expiresAt = new Date(Date.now() + config.otp.expiration_minutes * 60 * 1000);

  // 4. Invalidate previous OTPs for this email AND purpose atomically
  await prisma.otp.updateMany({
    where: { email: normalizedEmail, purpose, isUsed: false },
    data: { isUsed: true },
  });

  // 5. Store OTP
  await prisma.otp.create({
    data: {
      email: normalizedEmail,
      otpHash,
      purpose,
      expiresAt,
    },
  });

  // 6. Send Email via Abstracted Service
  const subject = `Your Talent Exam OTP for ${purpose.replace('_', ' ')}`;
  const text = `Your OTP is: ${otp}\nIt expires in ${config.otp.expiration_minutes} minutes.`;
  await sendEmail(normalizedEmail, subject, text);

  // 7. Cleanup old expired OTPs (Lightweight background task)
  cleanupExpiredOtps().catch(err => console.error('OTP Cleanup Error:', err));

  return null;
};

export const verifyOtp = async (email: string, otp: string, purpose: OtpPurpose) => {
  const normalizedEmail = normalizeEmail(email);

  // 1. Find latest unused OTP
  const otpRecord = await prisma.otp.findFirst({
    where: {
      email: normalizedEmail,
      purpose,
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otpRecord) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired OTP');
  }

  if (otpRecord.attempts >= config.otp.max_attempts) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Maximum OTP attempts reached. Request a new OTP.');
  }

  // 2. Verify OTP hash
  const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isValid) {
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  // 3. Mark OTP as used ATOMICALLY to prevent race conditions
  const updateResult = await prisma.otp.updateMany({
    where: { id: otpRecord.id, isUsed: false },
    data: { isUsed: true },
  });

  if (updateResult.count === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP was already used concurrently');
  }

  return true;
};

// Cleanup strategy: Deletes OTPs that expired more than 24 hours ago
export const cleanupExpiredOtps = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.otp.deleteMany({
    where: {
      expiresAt: { lt: oneDayAgo },
    },
  });
};
