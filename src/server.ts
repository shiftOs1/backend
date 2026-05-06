import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { initSocket } from './config/socket';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 ShiftOS API running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`🔌 Socket.io ready`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    shutdown('unhandledRejection');
  });
};

startServer();