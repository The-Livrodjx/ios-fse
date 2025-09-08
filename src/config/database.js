import mysql from 'mysql2/promise';
import { config } from './config.js';
import { logger } from '../utils/logger.js';

class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.dbType = 'mysql';
  }

  async connect() {
    try {
      this.pool = mysql.createPool(config.database.mysql);
      logger.info('Connected to MySQL', {
        host: config.database.mysql.host,
        database: config.database.mysql.database
      });

      await this.testConnection();
    } catch (error) {
      logger.error('Error connecting to database', { error: error.message });
      throw error;
    }
  }

  async testConnection() {
    try {
      const [rows] = await this.pool.execute('SELECT 1 as test');
      logger.info('MySQL connection test successful');
    } catch (error) {
      logger.error('Connection test failed', { error: error.message });
      throw error;
    }
  }

  async query(sql, params = []) {
    if (!this.pool) {
      throw new Error('Database connection not established. Call connect() first.');
    }

    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('SQL query error', {
        sql: sql.substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  async transaction(callback) {
    if (!this.pool) {
      throw new Error('Database connection not established. Call connect() first.');
    }

    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      const result = await callback(connection);

      await connection.commit();
      return result;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('Transaction error', { error: error.message });
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database connection closed');
    }
  }

  getUpsertQuery(table, data, conflictColumns) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?');

    const updateClause = columns
      .filter(col => !conflictColumns.includes(col))
      .map(col => `${col} = VALUES(${col})`)
      .join(', ');

    return {
      sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON DUPLICATE KEY UPDATE ${updateClause}`,
      values
    };
  }
}

export const db = new DatabaseConnection();
