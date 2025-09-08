import express from 'express';
import cors from 'cors';
import { db } from '../config/database.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import routes from './routes/index.js';

class ApiServer {
  constructor() {
    this.app = express();
    this.port = config.api.port;
    this.host = config.api.host;
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip
      });
      next();
    });

    this.app.use('/api/v1', routes);

    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
      });
    });

    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error in API', {
        error: err.message,
        stack: err.stack,
        path: req.path
      });

      res.status(500).json({
        error: 'Internal server error'
      });
    });
  }

  async start() {
    try {
      await db.connect();
      this.setupMiddleware();

      this.server = this.app.listen(this.port, this.host, () => {
        logger.info(`API started at http://${this.host}:${this.port}`);
        logger.info('Available endpoints:');
        logger.info('- GET /api/v1/health');
        logger.info('- GET /api/v1/playlists/:id/tracks?energyMin=0.7');
        logger.info('- GET /api/v1/artists/:id/summary');
      });

      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Error starting API', { error: error.message });
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Starting API shutdown...');

    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    await db.close();
    logger.info('Shutdown complete');
    process.exit(0);
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const server = new ApiServer();
  server.start();
}

export default ApiServer;
