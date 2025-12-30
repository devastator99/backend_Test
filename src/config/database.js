const { PrismaClient } = require('@prisma/client');
const { DatabaseError } = require('../utils/errors');

class DatabaseConnection {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
    this.isConnected = false;
  }

  async connect() {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Database connection failed:', error);
      throw new DatabaseError('Failed to connect to database');
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
    }
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        connected: this.isConnected,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async transaction(callback) {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      throw new DatabaseError(`Transaction failed: ${error.message}`);
    }
  }

  getClient() {
    if (!this.isConnected) {
      throw new DatabaseError('Database not connected');
    }
    return this.prisma;
  }
}

const dbConnection = new DatabaseConnection();

module.exports = dbConnection;
