import { Server } from 'http';
import app from './app';
import config from './config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let server: Server;

async function bootstrap() {
  try {
    // Validate database connection
    await prisma.$connect();
    console.log('🗄️  Database connection established successfully');

    server = app.listen(config.port, () => {
      console.log(`🚀 Application is running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('Received shutdown signal, shutting down gracefully...');
  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Closed out remaining connections.');
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (error) => {
  console.error('😈 Unhandled Rejection detected, shutting down...');
  console.error(error);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('😈 Uncaught Exception detected, shutting down...');
  console.error(error);
  process.exit(1);
});
