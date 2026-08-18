import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import router from './app/routes';
import globalErrorHandler from './app/errors/globalErrorHandler';
import notFoundHandler from './app/middlewares/notFoundHandler';
import swaggerUi from 'swagger-ui-express';
import config from './config';

const app: Application = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Application Routes
app.use('/api/v1', router);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup({}));

// Root Endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Talent Exam API is running successfully!',
    environment: config.env,
    uptime: process.uptime().toFixed(2) + "sec",
    timeStamp: new Date().toUTCString()
  });
});

// Global Error Handler
app.use(globalErrorHandler);

// Not Found Handler
app.use(notFoundHandler);

export default app;
