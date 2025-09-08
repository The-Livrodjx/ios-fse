
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'mysql';
  process.env.MYSQL_DATABASE = 'playlist_db_test';
  process.env.LOG_LEVEL = 'error';
});

afterAll(async () => {
});

// Mock logger for ES modules
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {}
};

// Create a mock module for logger
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/utils/logger.js', () => ({
  logger: mockLogger
}));
