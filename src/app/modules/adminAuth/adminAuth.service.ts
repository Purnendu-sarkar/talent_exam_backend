import { Role, Status, OtpPurpose } from '@prisma/client';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { jwtHelper } from '../../utils/jwtHelper';
import config from '../../../config';
import prisma from '../../../shared/prisma';
import { sendOtp as sendOtpService, verifyOtp as verifyOtpService } from '../otp/otp.service';
import { normalizeEmail } from '../../utils/email.utils';

const sendOtp = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  // 1. Check if user exists and is Admin/SuperAdmin
  const adminUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!adminUser || (adminUser.role !== Role.ADMIN && adminUser.role !== Role.SUPER_ADMIN)) {
    // Anti-enumeration: Do not reveal that the account does not exist or isn't an admin.
    console.warn(`[ANTI-ENUMERATION] Blocked admin OTP request for non-admin email: ${normalizedEmail}`);
    return null; // Pretend it succeeded
  }

  if (adminUser.status !== Status.ACTIVE) {
    // We can be ambiguous here as well, or just log it.
    console.warn(`[ANTI-ENUMERATION] Blocked admin OTP request for inactive admin: ${normalizedEmail}`);
    return null; 
  }

  // Delegate to OTP service
  await sendOtpService(normalizedEmail, OtpPurpose.ADMIN_LOGIN);

  return null;
};

const verifyOtp = async (email: string, otp: string) => {
  const normalizedEmail = normalizeEmail(email);

  // 1. Find user and verify role
  const adminUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!adminUser || (adminUser.role !== Role.ADMIN && adminUser.role !== Role.SUPER_ADMIN)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or OTP');
  }

  if (adminUser.status !== Status.ACTIVE) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or OTP');
  }

  // 2. Delegate to OTP service
  try {
    await verifyOtpService(normalizedEmail, otp, OtpPurpose.ADMIN_LOGIN);
  } catch (error) {
    // Mask specific OTP errors to prevent enumeration if necessary, 
    // or just pass through standard OTP errors (e.g. Invalid OTP)
    throw error;
  }

  // 3. Generate Token
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
