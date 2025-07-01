# Sync Text

A simple mono repo with Next.js frontend and Express TypeScript backend using Prisma ORM.

## Project Structure

```
sync-text/
├── frontend/          # Next.js application
├── backend/           # Express TypeScript API with Prisma
├── docker/            # Docker configuration files
├── scripts/           # Helper scripts
├── docker-compose.yml # Docker services configuration
└── README.md          # This file
```

## Quick Start with Docker (Recommended)

The easiest way to get started is using Docker for the database services:

1. **Start the infrastructure services:**
   ```bash
   # Make the script executable
   chmod +x scripts/docker-dev.sh
   
   # Start PostgreSQL and Redis
   ./scripts/docker-dev.sh start
   ```

2. **Set up the backend:**
   ```bash
   cd backend
   cp env.example .env
   npm install
   npm run db:generate
   npm run db:push
   npm run db:seed
   npm run dev
   ```

3. **Set up the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Services

When using Docker, the following services will be available:

- **PostgreSQL Database**: `localhost:5432`
  - Database: `sync_text_db`
  - Username: `postgres`
  - Password: `postgres123`

- **Redis**: `localhost:6379`
  - Password: `redis123`

- **RedisInsight** (Redis GUI): http://localhost:8001

- **Adminer** (Database GUI): http://localhost:8080

## Docker Commands

```bash
# Start all services
./scripts/docker-dev.sh start

# Stop all services
./scripts/docker-dev.sh stop

# View logs
./scripts/docker-dev.sh logs

# View logs for specific service
./scripts/docker-dev.sh logs postgres

# Clean up (removes all data!)
./scripts/docker-dev.sh cleanup
```

## Manual Setup (Alternative)

If you prefer to install PostgreSQL and Redis manually:

1. Install PostgreSQL 16.8 and Redis locally
2. Create a database named `sync_text_db`
3. Update the `DATABASE_URL` in `backend/.env` with your local credentials
4. Follow the backend setup steps above

## Development

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## Tech Stack

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS

### Backend
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis (optional, for caching/sessions)

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 16.8
- Redis Stack (with RedisInsight)

## Contributing

1. Start the Docker services
2. Set up both frontend and backend
3. Make your changes
4. Test your changes
5. Submit a pull request