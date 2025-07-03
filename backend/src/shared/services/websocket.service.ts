import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { jwt as jwtConfig } from '../../config';
import { RateLimitService, RateLimitConfig } from './rate-limit.service';
import { ActiveSessionsService } from './active-sessions.service';
import { RedisPubSubService, PubSubMessage } from './redis-pubsub.service';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  documentId?: string;
  socketId?: string;
}

export interface DocumentUser {
  userId: string;
  username: string;
  socketId: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  documentId?: string;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private socketConnections: Map<string, AuthenticatedWebSocket> = new Map(); // socket_id -> socket

  // Rate limiting configuration
  private readonly rateLimitConfigs: Map<string, RateLimitConfig> = new Map([
    ['yjs-update', { maxMessages: 50, windowMs: 1000, blockDurationMs: 5000 }],
    ['awareness-update', { maxMessages: 30, windowMs: 1000, blockDurationMs: 3000 }],
  ]);

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): void {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));

    // Set up periodic cleanup of Redis rate limit data
    setInterval(() => {
      RateLimitService.cleanupExpiredData().catch(error => {
        console.error('Failed to cleanup rate limit data:', error);
      });
    }, 300000); // Clean up every 5 minutes

    // Set up periodic cleanup of stale sessions
    setInterval(() => {
      ActiveSessionsService.cleanupStaleSessions().catch(error => {
        console.error('Failed to cleanup stale sessions:', error);
      });
    }, 600000); // Clean up every 10 minutes

    console.log('✅ WebSocket server initialized on /ws');
  }

  /**
   * Verify client authentication
   */
  private verifyClient(info: any): boolean {
    try {
      const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        console.log('❌ WebSocket connection rejected: No token provided');
        return false;
      }

      const decoded = jwt.verify(token, jwtConfig.secret) as any;
      if (!decoded.userId) {
        console.log('❌ WebSocket connection rejected: Invalid token');
        return false;
      }

      // Store user info for later use
      info.req.userId = decoded.userId;
      info.req.username = decoded.username || decoded.email?.split('@')[0];

      return true;
    } catch (error) {
      console.log('❌ WebSocket connection rejected: Token verification failed', error);
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: AuthenticatedWebSocket, req: any): void {
    const userId = req.userId;
    const username = req.username;

    // Set user info on socket
    ws.userId = userId;
    ws.username = username;

    // Generate socket_id and store socket reference
    const socketId = this.generateSocketId(ws);
    ws.socketId = socketId;
    this.socketConnections.set(socketId, ws);

    console.log(`✅ WebSocket connected: ${username} (${userId}) with socket_id: ${socketId}`);

    // Handle messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('❌ Invalid WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    // Handle errors
    ws.on('error', error => {
      console.error(`❌ WebSocket error for user ${username}:`, error);
    });

    // Send connection confirmation
    this.sendMessage(ws, 'connected', { message: 'WebSocket connected successfully' });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(
    ws: AuthenticatedWebSocket,
    message: WebSocketMessage
  ): Promise<void> {
    const { type, data } = message;

    // Check rate limiting for spam-prone message types
    if (ws.userId && this.rateLimitConfigs.has(type)) {
      const config = this.rateLimitConfigs.get(type)!;
      const rateLimitResult = await RateLimitService.isRateLimited(ws.userId, type, config);

      if (rateLimitResult.isLimited) {
        const remainingBlockTime = rateLimitResult.blockedUntil
          ? Math.ceil((rateLimitResult.blockedUntil - Date.now()) / 1000)
          : 0;

        console.warn(
          `⚠️ Rate limited: ${ws.username} (${ws.userId}) for message type: ${type}${remainingBlockTime > 0 ? `, blocked for ${remainingBlockTime}s` : ''}`
        );
        this.sendError(ws, `Rate limit exceeded for ${type}. Please slow down.`);
        return;
      }
    }

    switch (type) {
      case 'join-document':
        this.handleJoinDocument(ws, data.documentId);
        break;

      case 'leave-document':
        this.handleLeaveDocument(ws);
        break;

      case 'yjs-update':
        this.handleYjsUpdate(ws, data);
        break;

      case 'awareness-update':
        this.handleAwarenessUpdate(ws, data);
        break;

      default:
        console.warn(`⚠️ Unknown WebSocket message type: ${type}`);
        this.sendError(ws, `Unknown message type: ${type}`);
        return;
    }

    // Increment rate limit counter for processed messages
    if (ws.userId && this.rateLimitConfigs.has(type)) {
      await RateLimitService.incrementRateLimit(ws.userId, type);
    }
  }

  /**
   * Handle user joining a document
   */
  private async handleJoinDocument(ws: AuthenticatedWebSocket, documentId: string): Promise<void> {
    if (!ws.userId || !ws.username) {
      this.sendError(ws, 'User not authenticated');
      return;
    }

    // Leave current document if any
    if (ws.documentId) {
      await this.handleLeaveDocument(ws);
    }

    // Set current document
    ws.documentId = documentId;

    // Store user in Redis session hash
    if (!ws.socketId) {
      this.sendError(ws, 'Socket ID not found');
      return;
    }
    await ActiveSessionsService.addSession(documentId, ws.userId, ws.username, ws.socketId);

    // Publish user-joined event to channel
    await RedisPubSubService.publish(`channel:${documentId}`, {
      type: 'user-joined',
      data: { user: { userId: ws.userId, username: ws.username } }
    });
    console.log(`📡 Published user-joined event for ${ws.username} to channel:${documentId}`);

    // Subscribe to channel (idempotent)
    await RedisPubSubService.subscribe(`channel:${documentId}`, this.handlePubSubMessage.bind(this));

    // Send current users list to the new user
    const sessions = await ActiveSessionsService.getDocumentSessions(documentId);
    const users = sessions.map(session => ({
      userId: session.userId,
      username: session.username,
    }));

    this.sendMessage(ws, 'users-in-document', { users });
  }

  /**
   * Handle user leaving a document
   */
  private async handleLeaveDocument(ws: AuthenticatedWebSocket): Promise<void> {
    if (!ws.documentId || !ws.userId) {
      return;
    }

    const documentId = ws.documentId;

    // Remove user from document sessions
    await ActiveSessionsService.removeSession(documentId, ws.userId);

    // Publish user-left event to channel
    await RedisPubSubService.publish(`channel:${documentId}`, {
      type: 'user-left',
      data: { user: { userId: ws.userId, username: ws.username } }
    });
    console.log(`📡 Published user-left event for ${ws.username} to channel:${documentId}`);

    console.log(`👤 User ${ws.username} left document ${documentId}`);
    delete ws.documentId;

    // Check if there are any remaining sessions in the document
    const remainingSessions = await ActiveSessionsService.getDocumentSessionCount(documentId);
    if (remainingSessions === 0) {
      // Unsubscribe from channel if no users remain in the document
      await RedisPubSubService.unsubscribe(`channel:${documentId}`);
      console.log(`📡 Unsubscribed from channel:${documentId} - no users remaining`);
    }
  }

  /**
   * Handle Yjs document update
   */
  private handleYjsUpdate(ws: AuthenticatedWebSocket, data: any): void {
    if (!ws.documentId) {
      this.sendError(ws, 'Not joined to any document');
      return;
    }

    // Broadcast Yjs update to other users in the document
    this.broadcastToDocument(
      ws.documentId,
      'yjs-update',
      {
        documentId: data.documentId,
        update: data.update,
        user: {
          userId: ws.userId,
          username: ws.username,
        },
      },
      ws.userId
    );
  }

  /**
   * Handle awareness update (collaborative cursors)
   */
  private handleAwarenessUpdate(ws: AuthenticatedWebSocket, data: any): void {
    if (!ws.documentId) {
      this.sendError(ws, 'Not joined to any document');
      return;
    }

    // Broadcast awareness update to other users in the document
    this.broadcastToDocument(
      ws.documentId,
      'awareness-update',
      {
        documentId: data.documentId,
        update: data.update,
      },
      ws.userId
    );
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: AuthenticatedWebSocket): void {
    if (ws.userId && ws.socketId) {
      console.log(`❌ WebSocket disconnected: ${ws.username} (${ws.userId}) with socket_id: ${ws.socketId}`);

      // Remove from socket connections
      this.socketConnections.delete(ws.socketId);

      // Leave document
      this.handleLeaveDocument(ws);
    }
  }

  /**
   * Send message to a specific WebSocket
   */
  private sendMessage(ws: AuthenticatedWebSocket, type: string, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }

  /**
   * Send error message to a specific WebSocket
   */
  private sendError(ws: AuthenticatedWebSocket, message: string): void {
    this.sendMessage(ws, 'error', { message });
  }

  /**
   * Broadcast message to all users in a document
   */
  async broadcastToDocument(
    documentId: string,
    type: string,
    data: any,
    excludeUserId?: string
  ): Promise<void> {
    await RedisPubSubService.publish(`channel:${documentId}`, { type, data });

    const sessions = await ActiveSessionsService.getDocumentSessions(documentId);
    
    for (const session of sessions) {
      if (excludeUserId && session.userId === excludeUserId) {
        continue;
      }

      // Find socket by socket_id instead of userId
      const socket = this.socketConnections.get(session.socketId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        this.sendMessage(socket, type, data);
      }
    }
  }

  /**
   * Get users currently connected to a document
   */
  async getDocumentUsers(documentId: string): Promise<DocumentUser[]> {
    const sessions = await ActiveSessionsService.getDocumentSessions(documentId);
    return sessions.map(session => ({
      userId: session.userId,
      username: session.username,
      socketId: session.socketId,
    }));
  }

  /**
   * Generate a unique socket ID
   */
  private generateSocketId(ws: AuthenticatedWebSocket): string {
    return `${ws.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if WebSocket server is initialized
   */
  isInitialized(): boolean {
    return this.wss !== null;
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.socketConnections.size;
  }

  /**
   * Get document count
   */
  async getDocumentCount(): Promise<number> {
    const activeDocuments = await ActiveSessionsService.getActiveDocuments();
    return activeDocuments.length;
  }

  /**
   * Close WebSocket server
   */
  close(): Promise<void> {
    return new Promise(resolve => {
      if (this.wss) {
        this.wss.close(() => {
          console.log('🔌 WebSocket server closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get rate limit statistics for monitoring
   */
  async getRateLimitStats(): Promise<
    {
      userId: string;
      messageType: string;
      count: number;
      blockedUntil?: number;
    }[]
  > {
    return await RateLimitService.getRateLimitStats();
  }

  /**
   * Reset rate limits for a specific user (for debugging)
   */
  async resetUserRateLimits(userId: string): Promise<void> {
    await RateLimitService.resetUserRateLimits(userId);
  }

  /**
   * Get current rate limit configuration
   */
  getRateLimitConfig(): Record<string, RateLimitConfig> {
    const config: Record<string, RateLimitConfig> = {};
    for (const [messageType, rateLimitConfig] of this.rateLimitConfigs.entries()) {
      config[messageType] = { ...rateLimitConfig };
    }
    return config;
  }

  private async handlePubSubMessage(message: PubSubMessage, channel: string) {
    const documentId = channel.replace('channel:', '');
    console.log(`📡 Received Pub/Sub message: ${message.type} for document ${documentId}`);
    
    // Relay to all local sockets for this document
    for (const [, socket] of this.socketConnections.entries()) {
      if (socket.documentId === documentId && socket.readyState === WebSocket.OPEN) {
        this.sendMessage(socket, message.type, message.data);
      }
    }
  }
}
