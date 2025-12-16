import { BaseMigration, IMigrationContext } from '@app/database';
import { Model } from 'mongoose';

/**
 * Migration: Add lastName field to existing users
 * - Set lastName = 'Default' for all existing users
 * - New users phải cung cấp lastName khi đăng ký
 */
export class AddUserLastNameMigration extends BaseMigration {
  protected readonly name = '003-add-user-lastname';

  async up(context: IMigrationContext): Promise<void> {
    console.log('🔧 Adding lastName field to existing users...');

    const UserModel: Model<any> = context.getModel('User');

    // Thêm lastName = 'Default' cho users chưa có lastName field
    const result = await UserModel.updateMany(
      { lastName: { $exists: false } }, // Chỉ update users chưa có lastName
      {
        $set: {
          lastName: 'Default',
        },
      }
    );

    console.log(`✅ Added lastName field to ${result.modifiedCount} user documents`);
    console.log(`📊 Matched ${result.matchedCount} documents without lastName`);
  }

  async down(context: IMigrationContext): Promise<void> {
    console.log('⚠️  Rolling back: Removing lastName field...');

    const UserModel: Model<any> = context.getModel('User');

    const result = await UserModel.updateMany(
      {},
      {
        $unset: {
          lastName: '',
        },
      }
    );

    console.log(`✅ Removed lastName field from ${result.modifiedCount} documents`);
  }
}

// Run migration if executed directly
if (require.main === module) {
  const { AppModule } = require('../app.module');

  const migration = new AddUserLastNameMigration();
  const direction = process.argv[2] === 'down' ? 'down' : 'up';

  migration
    .run(AppModule, direction)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
