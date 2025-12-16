# 📚 Database Library - MongoDB + Mongoose cho Monorepo Microservices

## 🏗️ Kiến trúc

Thư viện `@app/database` cung cấp một lớp trừu tượng clean và tái sử dụng cho MongoDB + Mongoose trong kiến trúc monorepo + microservices.

### Cấu trúc thư mục

```
libs/database/
├── src/
│   ├── config/
│   │   └── database.config.ts       # Cấu hình database
│   ├── repositories/
│   │   └── base.repository.ts       # Abstract base repository
│   ├── schemas/
│   │   └── base.schema.ts           # Base schema với timestamps
│   ├── types/
│   │   └── index.ts                 # TypeScript types
│   ├── database.module.ts           # Database module chính
│   └── index.ts                     # Exports
├── package.json
└── tsconfig.lib.json
```

## 🚀 Cài đặt & Sử dụng

### 1. Cấu hình Environment Variables

Tạo file `.env` trong root project:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=dreamtrade
MONGODB_RETRY_ATTEMPTS=5
MONGODB_RETRY_DELAY=3000
NODE_ENV=development
```

### 2. Import DatabaseModule trong App Module

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Sử dụng DatabaseModule với cấu hình mặc định
    DatabaseModule.forRoot(),
  ],
})
export class AppModule {}
```

### 3. Tạo Schema với BaseSchema

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema, baseSchemaOptions } from '@app/database';

@Schema(baseSchemaOptions)
export class User extends BaseSchema {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Thêm indexes
UserSchema.index({ email: 1 });
UserSchema.index({ isDeleted: 1, isActive: 1 });
```

**BaseSchema tự động cung cấp:**

- `createdAt: Date`
- `updatedAt: Date`
- `isDeleted: boolean`
- `deletedAt?: Date`

### 4. Tạo Repository với BaseRepository

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@app/database';
import { User } from '../schemas/user.schema';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  protected readonly logger = new Logger(UserRepository.name);

  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super(userModel);
  }

  // Custom methods
  async findByEmail(email: string) {
    return this.findOne({ email, isDeleted: false });
  }

  async findActiveUsers(page: number, limit: number) {
    return this.findWithPagination({ isActive: true, isDeleted: false }, page, limit);
  }

  async softDelete(userId: string) {
    return this.updateById(userId, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }
}
```

### 5. Đăng ký Models và Repository trong Feature Module

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { User, UserSchema } from './schemas/user.schema';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';

@Module({
  imports: [
    // Đăng ký models cho feature
    DatabaseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UserRepository, UserService],
  exports: [UserRepository, UserService],
})
export class UserModule {}
```

### 6. Sử dụng Repository trong Service

```typescript
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(createUserDto: CreateUserDto) {
    return this.userRepository.create(createUserDto);
  }

  async findUserById(id: string) {
    return this.userRepository.findByIdOrFail(id);
  }

  async findAllUsers(page: number = 1, limit: number = 10) {
    return this.userRepository.findWithPagination({}, page, limit);
  }

  async updateUser(id: string, updateData: Partial<User>) {
    return this.userRepository.updateById(id, updateData);
  }

  async deleteUser(id: string) {
    return this.userRepository.softDelete(id);
  }
}
```

## 📖 Base Repository Methods

BaseRepository cung cấp đầy đủ CRUD operations:

### Create

- `create(dto)` - Tạo document mới
- `createMany(dtos)` - Tạo nhiều documents

### Read

- `findOne(filter, projection?, options?)` - Tìm 1 document
- `findOneOrFail(filter, projection?, options?)` - Tìm hoặc throw error
- `findById(id, projection?, options?)` - Tìm theo ID
- `findByIdOrFail(id, projection?, options?)` - Tìm theo ID hoặc throw error
- `find(filter?, projection?, options?)` - Tìm tất cả
- `findWithPagination(filter?, page, limit, sort?)` - Phân trang

### Update

- `update(filter, updateDto, options?)` - Update document
- `updateOrFail(filter, updateDto, options?)` - Update hoặc throw error
- `updateById(id, updateDto, options?)` - Update theo ID
- `updateMany(filter, updateDto)` - Update nhiều documents

### Delete

- `delete(filter)` - Xóa document
- `deleteById(id)` - Xóa theo ID
- `deleteMany(filter)` - Xóa nhiều documents

### Utilities

- `count(filter?)` - Đếm documents
- `exists(filter)` - Kiểm tra tồn tại
- `aggregate(pipeline)` - Aggregation queries

## 🎯 Best Practices

### 1. Soft Delete Pattern

```typescript
// Luôn filter isDeleted trong queries
async findActiveRecords() {
  return this.find({ isDeleted: false });
}

// Sử dụng soft delete thay vì hard delete
async softDelete(id: string) {
  return this.updateById(id, {
    isDeleted: true,
    deletedAt: new Date(),
  });
}
```

### 2. Pagination

```typescript
async getUsers(page: number, limit: number) {
  const result = await this.userRepository.findWithPagination(
    { isDeleted: false },
    page,
    limit,
  );

  // Result structure:
  // {
  //   data: User[],
  //   pagination: {
  //     page: number,
  //     limit: number,
  //     total: number,
  //     totalPages: number
  //   }
  // }

  return result;
}
```

### 3. Custom Queries trong Repository

```typescript
@Injectable()
export class UserRepository extends BaseRepository<User> {
  // Sử dụng aggregate cho complex queries
  async getUserStats() {
    return this.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$isActive',
          count: { $sum: 1 },
        },
      },
    ]);
  }

  // Search với text index
  async searchUsers(searchTerm: string) {
    return this.find({
      $text: { $search: searchTerm },
      isDeleted: false,
    });
  }
}
```

### 4. Indexes cho Performance

```typescript
export const UserSchema = SchemaFactory.createForClass(User);

// Single field indexes
UserSchema.index({ email: 1 });
UserSchema.index({ createdAt: -1 });

// Compound indexes
UserSchema.index({ isDeleted: 1, isActive: 1 });

// Text index cho search
UserSchema.index({ email: 'text', firstName: 'text', lastName: 'text' });
```

## 🔧 Advanced Configuration

### Custom Database Connection

```typescript
DatabaseModule.forRoot({
  connectionName: 'secondary-db',
  useFactory: (configService: ConfigService) => ({
    uri: configService.get('SECONDARY_DB_URI'),
    dbName: 'secondary',
  }),
});
```

### Multiple Database Connections

```typescript
@Module({
  imports: [
    // Primary database
    DatabaseModule.forRoot(),

    // Secondary database
    DatabaseModule.forRoot({
      connectionName: 'analytics',
      useFactory: () => ({
        uri: process.env.ANALYTICS_DB_URI,
        dbName: 'analytics',
      }),
    }),
  ],
})
export class AppModule {}
```

## 🛠️ Troubleshooting

### Lỗi kết nối MongoDB

```bash
# Kiểm tra MongoDB đang chạy
docker ps | grep mongo

# Hoặc start MongoDB với Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### TypeScript errors với Mongoose types

- Đảm bảo sử dụng `HydratedDocument<T>` cho return types
- BaseRepository đã xử lý type casting với `as any`

## 📚 Tài liệu tham khảo

- [NestJS Mongoose](https://docs.nestjs.com/techniques/mongodb)
- [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
