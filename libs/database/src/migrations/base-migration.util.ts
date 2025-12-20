import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';

/**
 * Base Migration Utility - Shared across all services
 * Location: libs/database/src/migrations/base-migration.util.ts
 *
 * Usage in each service:
 * import { BaseMigration } from '@app/database';
 */
export abstract class BaseMigration {
  protected abstract readonly name: string;

  abstract up(context: IMigrationContext): Promise<void>;
  abstract down(context: IMigrationContext): Promise<void>;

  async run(appModule: any, direction: 'up' | 'down' = 'up'): Promise<void> {
    console.log(`🚀 Running migration: ${this.name} [${direction}]`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);

    const app = await NestFactory.createApplicationContext(appModule, {
      logger: ['error', 'warn'],
    });

    const startTime = Date.now();

    try {
      const context: IMigrationContext = {
        app,
        getModel: (modelName: string) => this.getModel(app, modelName),
      };

      if (direction === 'up') {
        await this.up(context);
        console.log(`✅ Migration UP completed: ${this.name}`);
      } else {
        await this.down(context);
        console.log(`✅ Migration DOWN completed: ${this.name}`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`⏱️  Duration: ${duration}s`);
    } catch (error) {
      console.error(`❌ Migration failed: ${this.name}`);
      console.error(error);
      throw error;
    } finally {
      await app.close();
      console.log('🔌 Database connection closed');
    }
  }

  protected getModel(app: INestApplicationContext, modelName: string) {
    try {
      return app.get(`${modelName}Model`);
    } catch {
      throw new Error(`Model "${modelName}" not found. Make sure it's registered in the module.`);
    }
  }
}

export interface IMigrationContext {
  app: INestApplicationContext;
  getModel: (modelName: string) => any;
}

/**
 * Migration Status Tracker - Optional advanced feature
 */
export interface IMigrationRecord {
  name: string;
  executedAt: Date;
  direction: 'up' | 'down';
  status: 'success' | 'failed';
  duration: number;
  error?: string;
}
