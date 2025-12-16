import { Module, DynamicModule, Global } from '@nestjs/common';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';

export interface DatabaseModuleOptions {
  connectionName?: string;
  useFactory?: (configService: ConfigService) => MongooseModuleOptions;
}

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseModuleOptions = {}): DynamicModule {
    const { connectionName, useFactory } = options;

    return {
      module: DatabaseModule,
      imports: [
        ConfigModule.forFeature(databaseConfig),
        MongooseModule.forRootAsync({
          connectionName,
          imports: [ConfigModule],
          useFactory: useFactory || this.defaultMongooseFactory,
          inject: [ConfigService],
        }),
      ],
      exports: [MongooseModule],
    };
  }

  private static defaultMongooseFactory(configService: ConfigService): MongooseModuleOptions {
    const uri = configService.get<string>('database.uri');
    const dbName = configService.get<string>('database.dbName');

    return {
      uri,
      dbName,
      retryAttempts: configService.get<number>('database.retryAttempts'),
      retryDelay: configService.get<number>('database.retryDelay'),
      autoIndex: process.env.NODE_ENV !== 'production',
      connectionFactory: connection => {
        // Removed mongoose-lean-virtuals plugin
        connection.on('connected', () => {
          console.log(`✅ MongoDB connected to ${dbName}`);
        });
        connection.on('disconnected', () => {
          console.log('❌ MongoDB disconnected');
        });
        connection.on('error', error => {
          console.error('MongoDB connection error:', error);
        });
        return connection;
      },
    };
  }

  // For feature-specific database modules
  static forFeature(models: any[], connectionName?: string): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [MongooseModule.forFeature(models, connectionName)],
      exports: [MongooseModule],
    };
  }
}
