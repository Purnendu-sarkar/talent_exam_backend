import { Server } from 'http';
import app from './app';
import config from './config';
import prisma from './shared/prisma';
import { ensureSuperAdmin } from './app/utils/manageSuperAdmin';

let server: Server;

async function bootstrap() {
  try {
    // Validate database connection
    await prisma.$connect();
    console.log('🗄️  Database connection established successfully');

    // Ensure Super Admin exists before starting server
    await ensureSuperAdmin();

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
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  
  const exitTimeout = setTimeout(() => {
    console.error('Graceful shutdown timeout (10s) reached. Forcing exit.');
    process.exit(1);
  }, 10000);

  const performDisconnect = async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error('Error disconnecting Prisma:', err);
    }
  };

  if (server) {
    server.close(async () => {
      await performDisconnect();
      clearTimeout(exitTimeout);
      console.log('Closed out remaining connections.');
      process.exit(0);
    });
  } else {
    await performDisconnect();
    clearTimeout(exitTimeout);
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (error) => {
  console.error('😈 Unhandled Rejection detected, shutting down...');
  console.error(error);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('😈 Uncaught Exception detected, shutting down immediately...');
  console.error(error);
  process.exit(1);
});
