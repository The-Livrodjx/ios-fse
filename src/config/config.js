import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    type: process.env.DB_TYPE,
    mysql: {
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
    }
  },
  api: {
    port: parseInt(process.env.API_PORT),
    host: process.env.API_HOST
  },
  ingest: {
    batchSize: parseInt(process.env.BATCH_SIZE),
    logLevel: process.env.LOG_LEVEL
  }
};
