import { ErrorRequestHandler } from 'express';
import config from '../../config';
import ApiError from './ApiError';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

interface IGenericErrorMessage {
  path: string | number;
  message: string;
}

const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorMessages: IGenericErrorMessage[] = [];

  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errorMessages = error.issues.map((issue) => ({
      path: String(issue.path[issue.path.length - 1]),
      message: issue.message,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      statusCode = 409;
      message = 'Duplicate Key Error';
      errorMessages = [
        {
          path: '',
          message: error.message,
        },
      ];
    } else if (error.code === 'P2025') {
      statusCode = 404;
      message = 'Record Not Found';
      errorMessages = [
        {
          path: '',
          message: error.message,
        },
      ];
    } else {
      statusCode = 400;
      message = 'Prisma Error';
      errorMessages = [
        {
          path: '',
          message: error.message,
        },
      ];
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Database Validation Error';
    errorMessages = [
      {
        path: '',
        message: error.message,
      },
    ];
  } else if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    errorMessages = error.message
      ? [
          {
            path: '',
            message: error.message,
          },
        ]
      : [];
  } else if (error instanceof Error) {
    message = error.message;
    errorMessages = error.message
      ? [
          {
            path: '',
            message: error.message,
          },
        ]
      : [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: config.env !== 'production' ? error.stack : undefined,
  });
};

export default globalErrorHandler;
