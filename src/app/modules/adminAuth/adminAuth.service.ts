import { PrismaClient, Role, Status } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { jwtHelper } from '../../utils/jwtHelper';
import config from '../../../config';

import prisma from '../../../shared/prisma';

const sendOtp = async (email: string) => {
  // 1. Check if user exists and is Admin/SuperAdmin
  const adminUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!adminUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Admin account not found');
  }

  if (adminUser.role !== Role.ADMIN && adminUser.role !== Role.SUPER_ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized access to admin portal');
  }

  if (adminUser.status !== Status.ACTIVE) {
    throw new ApiError(httpStatus.FORBIDDEN, `Admin account is ${adminUser.status.toLowerCase()}`);
  }

  // 2. Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // 3. Hash OTP
  const otpHash = await bcrypt.hash(otp, 12);
  
  // 4. Expiration time
  const expiresAt = new Date(Date.now() + config.otp.expiration_minutes * 60 * 1000);

  // 5. Invalidate previous OTPs
  await prisma.otp.updateMany({
    where: { email, isUsed: false },
    data: { isUsed: true },
  });

  // 6. Store OTP
  await prisma.otp.create({
    data: {
      email,
      otpHash,
      expiresAt,
    },
  });

  // 7. Mock Email Sending
  console.log(`\n🛡️ [MOCK ADMIN EMAIL] OTP for ${email} is: ${otp}\n`);

  return null;
};

const verifyOtp = async (email: string, otp: string) => {
  // 1. Find user and verify role
  const adminUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!adminUser || (adminUser.role !== Role.ADMIN && adminUser.role !== Role.SUPER_ADMIN)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized access');
  }

  if (adminUser.status !== Status.ACTIVE) {
    throw new ApiError(httpStatus.FORBIDDEN, `Admin account is ${adminUser.status.toLowerCase()}`);
  }

  // 2. Find latest unused OTP
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
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, 'Maximum OTP attempts reached');
  }

  // 3. Verify OTP hash
  const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isValid) {
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP');
  }

  // 4. Mark OTP as used
  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  // 5. Generate Token
  const jwtPayload = {
    userId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
  };

  const token = jwtHelper.createToken(jwtPayload, config.jwt.secret as string, config.jwt.expires_in);

  return { token };
};

export const AdminAuthService = {
  sendOtp,
  verifyOtp,
};
