import { PrismaClient, Role, Status } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { jwtHelper } from '../../utils/jwtHelper';
import config from '../../../config';

import prisma from '../../../shared/prisma';

const sendOtp = async (email: string) => {
  // 1. Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // 2. Hash OTP
  const otpHash = await bcrypt.hash(otp, 12);
  
  // 3. Expiration time
  const expiresAt = new Date(Date.now() + config.otp.expiration_minutes * 60 * 1000);

  // 4. Invalidate previous OTPs for this email to prevent multiple active OTPs
  await prisma.otp.updateMany({
    where: { email, isUsed: false },
    data: { isUsed: true },
  });

  // 5. Store OTP
  await prisma.otp.create({
    data: {
      email,
      otpHash,
      expiresAt,
    },
  });

  // 6. Mock Email Sending
  console.log(`\n📧 [MOCK EMAIL] OTP for ${email} is: ${otp}\n`);

  return null;
};

const verifyOtp = async (email: string, otp: string) => {
  // 1. Find latest unused OTP
  const otpRecord = await prisma.otp.findFirst({
    where: {
      email,
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

  // 3. Mark OTP as used
  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  // 4. Find or Create User
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: email.split('@')[0], // Default name
        role: Role.USER, // STRICTLY forces USER role for any new registration
      },
    });
  }

  // 5. Check if blocked
  if (user.status !== Status.ACTIVE) {
    throw new ApiError(httpStatus.FORBIDDEN, `User account is ${user.status.toLowerCase()}`);
  }

  // 6. Generate Token
  const jwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwtHelper.createToken(jwtPayload, config.jwt.secret as string, config.jwt.expires_in);

  return { token };
};

export const AuthService = {
  sendOtp,
  verifyOtp,
};
