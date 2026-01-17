# Dream Trade - NestJS Monorepo

**NestJS Monorepo** cho 6 microservices với shared libraries.

## 🏗️ Cấu trúc Monorepo

```
dream-trade-be/
├── apps/                    # Tất cả microservices
│   ├── market/             # Market Service (Port 3001)
│   ├── auth/               # Auth Service (Port 3005)
│   ├── crawler/            # Crawler Service (Port 3002)
│   ├── gateway/            # API Gateway (Port 3000)
│   ├── ai-analysis/        # AI Analysis Service (Port 3003)
│   └── realtime/           # Realtime WebSocket (Port 3004)
│
├── libs/                    # Shared libraries
│   └── common/             # Interfaces, types, utils
│
├── nest-cli.json           # NestJS monorepo config
├── package.json            # Single package.json cho tất cả
├── Dockerfile.monorepo     # Dockerfile cho monorepo
└── docker-compose.yml      # Docker orchestration
```

## 🚀 Quick Start

### Development (chạy local)

```bash
# Install dependencies (1 lần duy nhất)
npm install

# Chạy từng service
npm run start:market
npm run start:auth
npm run start:crawler
npm run start:gateway
npm run start:ai-analysis
npm run start:realtime

# Hoặc chạy tất cả (cần nhiều terminal)
npm run start:dev  # Default service
```

### Production (Docker)

```bash
# Build và chạy tất cả services
docker compose up -d

# Xem logs
docker compose logs -f

# Stop
docker compose down
```

## 📦 Services

| Service | Port | Command | Tech Stack |
|---------|------|---------|------------|
| **Gateway** | 3000 | `npm run start:gateway` | NestJS + Proxy |
| **Market** | 3001 | `npm run start:market` | NestJS + MongoDB |
| **Crawler** | 3002 | `npm run start:crawler` | NestJS + Bull Queue |
| **AI Analysis** | 3003 | `npm run start:ai-analysis` | NestJS + Sentiment |
| **Realtime** | 3004 | `npm run start:realtime` | NestJS + WebSocket |
| **Auth** | 3005 | `npm run start:auth` | NestJS + JWT |

## 🧪 Testing

```bash
# Test tất cả services
npm test

# Test 1 service
npm test -- market

# Test coverage
npm run test:cov
```

## 📝 Database Migrations

Mỗi service quản lý migrations riêng theo nguyên tắc **Database per Service**.

### Cấu trúc

```
apps/
├── auth/migrations/         # Auth service migrations
│   └── 003-add-user-name.migration.ts
├── market/migrations/       # Market service migrations (if needed)
└── .../
```

### Chạy migrations

```bash
# Auth service
cd apps/auth
npm run migrate:up    # Apply migration
npm run migrate:down  # Rollback migration
```

### Tạo migration mới

```typescript
// apps/<service>/migrations/XXX-description.migration.ts
import { BaseMigration, IMigrationContext } from '@app/database';

export class MyMigration extends BaseMigration {
  protected readonly name = 'XXX-description';

  async up(context: IMigrationContext): Promise<void> {
    const Model = context.getModel('ModelName');
    // Migration logic
  }

  async down(context: IMigrationContext): Promise<void> {
    // Rollback logic
  }
}

// Auto-run when executed directly
if (require.main === module) {
  const { AppModule } = require('../app.module');
  const migration = new MyMigration();
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  migration.run(AppModule, direction)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
```

> **Best Practice:** Mỗi service có migrations riêng để đảm bảo tính độc lập và khả năng scale.

## 🛠️ Development

### Tạo service mới

```bash
# NestJS CLI tự động tạo trong monorepo
nest generate app new-service
```

### Tạo shared library

```bash
nest generate library my-lib
```

### Share code giữa services

```typescript
// apps/market/src/market.service.ts
import { SomeInterface } from '@app/common';
```

## 🔑 Environment Variables

Tạo file `.env` ở root:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/dream-trade

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Service Ports
MARKET_PORT=3001
AUTH_PORT=3005
CRAWLER_PORT=3002
GATEWAY_PORT=3000
AI_PORT=3003
REALTIME_PORT=3004
```

## 📊 API Documentation

Mỗi service có Swagger UI riêng:

- Gateway: http://localhost:3000/api
- Market: http://localhost:3001/api
- Crawler: http://localhost:3002/api
- AI Analysis: http://localhost:3003/api
- Auth: http://localhost:3005/api

## ✅ Ưu điểm Monorepo

1. **1 package.json** - Install dependencies 1 lần
2. **Share code dễ** - Import từ `@app/common`
3. **Build tất cả** - `npm run build:all`
4. **TypeScript paths** - Tự động resolve
5. **NestJS CLI** - Generate code tự động

## 🐳 Docker

```bash
# Build tất cả images
docker compose build

# Build 1 service
docker compose build market-service

# Chạy infrastructure only
docker compose up -d mongodb redis

# Restart 1 service
docker compose restart market-service
```

## 📝 Scripts

```json
{
  "start:market": "nest start market --watch",
  "start:auth": "nest start auth --watch",
  "start:crawler": "nest start crawler --watch",
  "start:gateway": "nest start gateway --watch",
  "start:ai-analysis": "nest start ai-analysis --watch",
  "start:realtime": "nest start realtime --watch",
  "build:all": "nest build market && nest build auth && ..."
}
```

## 🎯 Next Steps

1. Run `npm install`
2. Start MongoDB & Redis: `docker compose up -d mongodb redis`
3. Run services: `npm run start:market`, `npm run start:auth`, etc.
4. Test API: http://localhost:3000/api

---

**Team**: Minh (Market), Nguyên (Crawler), Lương (AI), Lâm (Realtime)
