import { NextFunction, Request, Response } from 'express';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../errors/ApiError';
import httpStatus from 'http-status';
import { jwtHelper } from '../utils/jwtHelper';
import { catchAsync } from '../utils/catchAsync';

const auth = (...requiredRoles: string[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get authorization header
    const token = req.headers.authorization;

    if (!token) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
    }

    // 2. Extract token from Bearer scheme
    const bearerToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

    // 3. Verify token
    let verifiedUser = null;
    try {
      verifiedUser = jwtHelper.verifyToken(bearerToken, config.jwt.secret as Secret);
    } catch (error) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
    }

    // 4. Attach user to request
    // @ts-ignore
    req.user = verifiedUser;

    // 5. Role based authorization
    if (requiredRoles.length && !requiredRoles.includes(verifiedUser.role)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not have the required permissions');
    }

    next();
  });
};

export default auth;
