import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

/**
 * Base Migration Runner
 * Tạo class mới extends BaseMigration để tạo migration
 */
export abstract class BaseMigration {
  abstract up(models: any): Promise<void>;
  abstract down(models: any): Promise<void>;

  async run(direction: 'up' | 'down' = 'up') {
    console.log(`🚀 Running migration ${this.constructor.name} [${direction}]`);

    const app = await NestFactory.createApplicationContext(AppModule);

    try {
      const models = {
        User: app.get(getModelToken('User')),
        UserSession: app.get(getModelToken('UserSession')),
        TokenBlacklist: app.get(getModelToken('TokenBlacklist')),
      };

      if (direction === 'up') {
        await this.up(models);
        console.log('✅ Migration completed successfully');
      } else {
        await this.down(models);
        console.log('✅ Migration rolled back successfully');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await app.close();
    }
  }
}

/**
 * Example Usage:
 *
 * class AddPhoneNumberMigration extends BaseMigration {
 *   async up(models) {
 *     await models.User.updateMany(
 *       { phoneNumber: { $exists: false } },
 *       { $set: { phoneNumber: null } }
 *     );
 *   }
 *
 *   async down(models) {
 *     await models.User.updateMany({}, { $unset: { phoneNumber: 1 } });
 *   }
 * }
 *
 * new AddPhoneNumberMigration().run('up');
 */
