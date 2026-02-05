import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  uri: string;
  dbName: string;
  retryAttempts: number;
  retryDelay: number;
}

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'DreamTrade',
    retryAttempts: parseInt(process.env.MONGODB_RETRY_ATTEMPTS || '5', 10),
    retryDelay: parseInt(process.env.MONGODB_RETRY_DELAY || '3000', 10),
  })
);
