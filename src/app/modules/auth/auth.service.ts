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
  // OTP logic delegated to OTP service
  await sendOtpService(normalizedEmail, OtpPurpose.USER_LOGIN);
  return null;
};

const verifyOtp = async (email: string, otp: string) => {
  const normalizedEmail = normalizeEmail(email);
  
  // OTP logic delegated to OTP service
  await verifyOtpService(normalizedEmail, otp, OtpPurpose.USER_LOGIN);

  // Find or Create User (Since it's USER auth, auto-register is allowed for USER role)
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        role: Role.USER, // strictly forces USER role
      },
    });
  } else {
    // Boundary enforcement: ADMIN and SUPER_ADMIN cannot login through /auth
    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Admins must use the admin login portal');
    }
  }

  if (user.status !== Status.ACTIVE) {
    throw new ApiError(httpStatus.FORBIDDEN, `User account is ${user.status.toLowerCase()}`);
  }

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
