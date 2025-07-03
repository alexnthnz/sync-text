# Sync Text

A modern, real-time collaborative document editing platform built with Next.js 14 and Express.js. Features live cursor tracking, instant synchronization, and seamless collaboration for teams.

## ✨ Features

### 🔄 Real-time Collaboration
- **Live Editing**: Multiple users can edit documents simultaneously
- **Cursor Tracking**: See other users' cursors and selections in real-time
- **User Presence**: Know who's currently viewing or editing the document
- **Conflict Resolution**: Automatic conflict resolution using operational transformation (Yjs)
- **Instant Sync**: Changes appear instantly across all connected clients

### 📄 Document Management
- **Rich Text Editor**: Full-featured editor with formatting options (bold, italic, lists, links, etc.)
- **Document Sharing**: Share documents with team members
- **Role-based Access**: Owner, Editor, and Viewer permissions
- **Search & Filter**: Find documents by title or content
- **Pagination**: Efficient document browsing with cursor-based pagination

### 🔐 Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **Password Security**: Bcrypt hashing with configurable rounds
- **Session Management**: Redis-backed session storage
- **Rate Limiting**: WebSocket message rate limiting to prevent abuse
- **Input Validation**: Comprehensive validation using Zod schemas

### 🎨 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark Mode Support**: Built-in theme switching
- **Modern Components**: Radix UI primitives with custom styling
- **Loading States**: Skeleton loaders and smooth transitions
- **Error Handling**: Graceful error states and user feedback

## 🏗️ Architecture

### Frontend (Next.js 14)
```
frontend/
├── app/                    # Next.js 14 App Router
│   ├── (default)/         # Main application routes
│   ├── auth/              # Authentication pages
│   └── api/               # API routes (NextAuth)
├── components/            # Reusable UI components
│   ├── documents/         # Document-related components
│   ├── document-share/    # Sharing functionality
│   └── ui/                # Base UI components (Radix UI)
├── lib/                   # Utilities and configurations
├── store/                 # Redux Toolkit state management
└── types/                 # TypeScript type definitions
```

### Backend (Express.js)
```
backend/
├── src/
│   ├── modules/           # Feature modules
│   │   ├── auth/          # Authentication logic
│   │   └── documents/     # Document management
│   ├── shared/            # Shared utilities and services
│   │   ├── services/      # Core services (WebSocket, Redis, etc.)
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Utility functions
│   └── routes/            # API route definitions
└── prisma/                # Database schema and migrations
```

### Real-time Infrastructure
- **WebSocket Server**: Handles real-time connections and message routing
- **Yjs Integration**: Operational transformation for conflict resolution
- **Redis Pub/Sub**: Scalable message broadcasting across server instances
- **Rate Limiting**: Prevents abuse with configurable limits per user
- **Session Tracking**: Monitors active users and document sessions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

### 1. Start Infrastructure Services
```bash
# Make the script executable
chmod +x scripts/docker-dev.sh

# Start PostgreSQL, Redis, and management tools
./scripts/docker-dev.sh start
```

### 2. Set Up Backend
```bash
cd backend

# Copy environment configuration
cp env.example .env

# Install dependencies
npm install

# Set up database
npm run db:generate
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

### 3. Set Up Frontend
```bash
cd frontend

# Copy environment configuration
cp env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **WebSocket**: ws://localhost:3001/ws

## 🛠️ Development Tools

When using Docker, the following services are available:

| Service | URL | Purpose |
|---------|-----|---------|
| **PostgreSQL** | `localhost:5432` | Main database |
| **Redis** | `localhost:6379` | Caching & sessions |
| **RedisInsight** | http://localhost:8001 | Redis GUI |
| **Adminer** | http://localhost:8080 | Database GUI |

### Database Credentials
- **Database**: `sync_text_db`
- **Username**: `postgres`
- **Password**: `postgres123`
- **Redis Password**: `redis123`

## 🐳 Docker Commands

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

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/sync_text_db

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
```

#### Frontend (.env)
```bash
# Auth.js Configuration
AUTH_SECRET=your-secret-key-here

# Backend API
BACKEND_URL=http://localhost:3001

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```

## 🗄️ Database Schema

```sql
-- Users table
users (
  id        UUID PRIMARY KEY,
  email     VARCHAR UNIQUE NOT NULL,
  username  VARCHAR UNIQUE NOT NULL,
  password  VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Documents table
documents (
  id        UUID PRIMARY KEY,
  owner_id  UUID REFERENCES users(id),
  title     VARCHAR(255) NOT NULL,
  content   TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Document sharing permissions
document_users (
  document_id UUID REFERENCES documents(id),
  user_id     UUID REFERENCES users(id),
  role        ENUM('owner', 'editor', 'viewer') DEFAULT 'editor',
  PRIMARY KEY (document_id, user_id)
)
```

## 🧪 Available Scripts

### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication with configurable expiration
- **Password Hashing**: Bcrypt with configurable salt rounds (default: 12)
- **Rate Limiting**: WebSocket message rate limiting to prevent abuse
- **Input Validation**: Comprehensive validation using Zod schemas
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: HTTP headers for security
- **Session Management**: Redis-backed session storage with automatic cleanup

## 🔄 Real-time Collaboration Details

### WebSocket Message Types
- `join-document`: User joins a document
- `leave-document`: User leaves a document
- `yjs-update`: Document content updates
- `awareness-update`: User presence and cursor updates

### Rate Limiting
- **YJS Updates**: 50 messages per second per user
- **Awareness Updates**: 30 messages per second per user
- **Block Duration**: 3-5 seconds for violations

### User Presence
- Real-time cursor tracking with user colors
- Document join/leave notifications
- Active user list with usernames
- Automatic cleanup of disconnected users

## 🤝 Contributing

1. **Fork the repository**
2. **Start the infrastructure**: `./scripts/docker-dev.sh start`
3. **Set up both frontend and backend** following the quick start guide
4. **Create a feature branch**: `git checkout -b feature/amazing-feature`
5. **Make your changes** and test thoroughly
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Test real-time collaboration features thoroughly
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: Check the inline code comments and type definitions
- **Health Check**: Monitor system status at `/health` endpoint

---

Built with ❤️ using Next.js, Express.js, and modern web technologies.