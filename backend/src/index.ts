import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';

// Import config and validate
import config, { validateConfig, server, isDevelopment } from './config';
import { RedisService, WebSocketService } from './shared';

// Validate configuration on startup
validateConfig();

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Initialize Redis
async function initializeRedis() {
  try {
    await RedisService.initialize();
    console.log('✅ Redis initialization completed');
  } catch (error) {
    console.error('❌ Redis initialization failed:', error);
    console.warn('⚠️  Continuing without Redis - sessions will not be cached');
  }
}

// Initialize Redis on startup
initializeRedis();

// Import routes
import apiRoutes from './routes';
import { errorHandler } from './shared/middleware/errorHandler';
import { ResponseHelper } from './shared/utils/response.utils';

const app = express();
const httpServer = createServer(app);
const PORT = server.port;

// Initialize WebSocket service
const webSocketService = new WebSocketService();
webSocketService.initialize(httpServer);

// Make WebSocket service available globally for use in controllers
declare global {
  var webSocketService: WebSocketService;
}
global.webSocketService = webSocketService;

// Middleware
app.use(helmet());
app.use(cors({
  origin: server.corsOrigin,
  credentials: true
}));
app.use(morgan(isDevelopment() ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    environment: server.nodeEnv,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    websocket: {
      initialized: webSocketService.isInitialized(),
      connections: webSocketService.getConnectionCount(),
      documents: webSocketService.getDocumentCount(),
    }
  };
  
  ResponseHelper.success(res, healthData, 'Server is healthy');
});

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// Handle 404
app.use('*', (req, res) => {
  ResponseHelper.notFound(res, `Route ${req.originalUrl} not found`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  await Promise.all([
    prisma.$disconnect(),
    RedisService.close().catch(err => console.warn('Redis close error:', err)),
    webSocketService.close().catch(err => console.warn('WebSocket close error:', err))
  ]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  await Promise.all([
    prisma.$disconnect(),
    RedisService.close().catch(err => console.warn('Redis close error:', err)),
    webSocketService.close().catch(err => console.warn('WebSocket close error:', err))
  ]);
  process.exit(0);
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server available at ws://localhost:${PORT}/ws`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${server.nodeEnv}`);
  console.log(`🔒 Security: Bcrypt rounds = ${config.security.bcryptRounds}`);
  console.log(`🗄️  Database: ${config.database.url.replace(/:[^:]*@/, ':****@')}`); // Hide password in logs
});

export default app; 