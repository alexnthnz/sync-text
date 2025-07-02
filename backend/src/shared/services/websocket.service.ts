import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { jwt as jwtConfig } from '../../config';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  documentId?: string;
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
  private documentUsers: Map<string, Map<string, DocumentUser>> = new Map(); // documentId -> userId -> user info
  private userSockets: Map<string, AuthenticatedWebSocket> = new Map(); // userId -> socket

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

    // Store socket reference
    this.userSockets.set(userId, ws);

    console.log(`✅ WebSocket connected: ${username} (${userId})`);

    // Handle messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
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
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for user ${username}:`, error);
    });

    // Send connection confirmation
    this.sendMessage(ws, 'connected', { message: 'WebSocket connected successfully' });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    const { type, data } = message;

    switch (type) {
      case 'join-document':
        this.handleJoinDocument(ws, data.documentId);
        break;

      case 'leave-document':
        this.handleLeaveDocument(ws);
        break;

      case 'document-change':
        this.handleDocumentChange(ws, data);
        break;

      case 'cursor-update':
        this.handleCursorUpdate(ws, data);
        break;

      case 'typing-start':
        this.handleTypingStart(ws);
        break;

      case 'typing-stop':
        this.handleTypingStop(ws);
        break;

      case 'yjs-update':
        this.handleYjsUpdate(ws, data);
        break;

      case 'awareness-update':
        this.handleAwarenessUpdate(ws, data);
        break;

      case 'sync-request':
        this.handleSyncRequest(ws, data);
        break;

      case 'sync-response':
        this.handleSyncResponse(ws, data);
        break;

      default:
        console.warn(`⚠️ Unknown WebSocket message type: ${type}`);
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  /**
   * Handle user joining a document
   */
  private handleJoinDocument(ws: AuthenticatedWebSocket, documentId: string): void {
    if (!ws.userId || !ws.username) {
      this.sendError(ws, 'User not authenticated');
      return;
    }

    // Leave current document if any
    if (ws.documentId) {
      this.handleLeaveDocument(ws);
    }

    // Set current document
    ws.documentId = documentId;

    // Initialize document users map if needed
    if (!this.documentUsers.has(documentId)) {
      this.documentUsers.set(documentId, new Map());
    }

    const documentUsersMap = this.documentUsers.get(documentId)!;
    
    // Add user to document
    documentUsersMap.set(ws.userId, {
      userId: ws.userId,
      username: ws.username,
      socketId: this.generateSocketId(ws),
    });

    console.log(`👤 User ${ws.username} joined document ${documentId}`);

    // Notify others in the document
    this.broadcastToDocument(documentId, 'user-joined', {
      user: {
        userId: ws.userId,
        username: ws.username,
      }
    }, ws.userId);

    // Send current users list to the new user
    const users = Array.from(documentUsersMap.values()).map(user => ({
      userId: user.userId,
      username: user.username,
    }));

    this.sendMessage(ws, 'users-in-document', { users });
  }

  /**
   * Handle user leaving a document
   */
  private handleLeaveDocument(ws: AuthenticatedWebSocket): void {
    if (!ws.documentId || !ws.userId) {
      return;
    }

    const documentId = ws.documentId;
    const documentUsersMap = this.documentUsers.get(documentId);
    
    if (documentUsersMap) {
      documentUsersMap.delete(ws.userId);
      
      // Clean up empty document
      if (documentUsersMap.size === 0) {
        this.documentUsers.delete(documentId);
      }

      // Notify others
      this.broadcastToDocument(documentId, 'user-left', {
        user: {
          userId: ws.userId,
          username: ws.username,
        }
      }, ws.userId);
    }

    console.log(`👤 User ${ws.username} left document ${documentId}`);
    delete ws.documentId;
  }

  /**
   * Handle document content changes
   */
  private handleDocumentChange(ws: AuthenticatedWebSocket, data: any): void {
    if (!ws.documentId) {
      this.sendError(ws, 'Not joined to any document');
      return;
    }

    // Broadcast to other users in the document
    this.broadcastToDocument(ws.documentId, 'document-updated', {
      content: data.content,
      cursor: data.cursor,
      user: {
        userId: ws.userId,
        username: ws.username,
      }
    }, ws.userId);
  }

  /**
   * Handle cursor position updates
   */
  private handleCursorUpdate(ws: AuthenticatedWebSocket, data: any): void {
    if (!ws.documentId) {
      return;
    }

    // Broadcast cursor position to other users
    this.broadcastToDocument(ws.documentId, 'cursor-updated', {
      cursor: data.cursor,
      user: {
        userId: ws.userId,
        username: ws.username,
      }
    }, ws.userId);
  }

  /**
   * Handle typing start event
   */
  private handleTypingStart(ws: AuthenticatedWebSocket): void {
    if (!ws.documentId) {
      return;
    }

    this.broadcastToDocument(ws.documentId, 'user-typing', {
      user: {
        userId: ws.userId,
        username: ws.username,
      },
      isTyping: true
    }, ws.userId);
  }

  /**
   * Handle typing stop event
   */
  private handleTypingStop(ws: AuthenticatedWebSocket): void {
    if (!ws.documentId) {
      return;
    }

    this.broadcastToDocument(ws.documentId, 'user-typing', {
      user: {
        userId: ws.userId,
        username: ws.username,
      },
      isTyping: false
    }, ws.userId);
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
    this.broadcastToDocument(ws.documentId, 'yjs-update', {
      documentId: data.documentId,
      update: data.update,
      user: {
        userId: ws.userId,
        username: ws.username,
      }
    }, ws.userId);
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
    this.broadcastToDocument(ws.documentId, 'awareness-update', {
      documentId: data.documentId,
      awarenessUpdate: data.awarenessUpdate,
    }, ws.userId);
  }

  /**
   * Handle sync request (Yjs state synchronization)
   */
  private handleSyncRequest(ws: AuthenticatedWebSocket, data: any): void {
    if (!ws.documentId) {
      this.sendError(ws, 'Not joined to any document');
      return;
    }

    console.log(`🔄 Sync request from ${ws.username} for document ${ws.documentId}`);

    // Broadcast sync request to other users in the document
    this.broadcastToDocument(ws.documentId, 'sync-request', {
      documentId: data.documentId,
      stateVector: data.stateVector,
      user: {
        userId: ws.userId,
        username: ws.username,
      }
    }, ws.userId);
  }

  /**
   * Handle sync response (Yjs state synchronization)
   */
  private handleSyncResponse(ws: AuthenticatedWebSocket, data: any): void {
    if (!ws.documentId) {
      this.sendError(ws, 'Not joined to any document');
      return;
    }

    console.log(`📤 Sync response from ${ws.username} for document ${ws.documentId}`);

    // Broadcast sync response to other users in the document
    this.broadcastToDocument(ws.documentId, 'sync-response', {
      documentId: data.documentId,
      update: data.update,
      user: {
        userId: ws.userId,
        username: ws.username,
      }
    }, ws.userId);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      console.log(`❌ WebSocket disconnected: ${ws.username} (${ws.userId})`);
      
      // Remove from user sockets
      this.userSockets.delete(ws.userId);
      
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
  private broadcastToDocument(documentId: string, type: string, data: any, excludeUserId?: string): void {
    const documentUsersMap = this.documentUsers.get(documentId);
    if (!documentUsersMap) {
      return;
    }

    for (const [userId] of documentUsersMap) {
      if (excludeUserId && userId === excludeUserId) {
        continue;
      }

      const userSocket = this.userSockets.get(userId);
      if (userSocket && userSocket.readyState === WebSocket.OPEN) {
        this.sendMessage(userSocket, type, data);
      }
    }
  }

  /**
   * Emit event to all users in a document (API triggered)
   */
  emitToDocument(documentId: string, type: string, data: any): void {
    this.broadcastToDocument(documentId, type, data);
  }

  /**
   * Get users currently connected to a document
   */
  getDocumentUsers(documentId: string): DocumentUser[] {
    const documentUsersMap = this.documentUsers.get(documentId);
    if (!documentUsersMap) {
      return [];
    }

    return Array.from(documentUsersMap.values());
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
    return this.userSockets.size;
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documentUsers.size;
  }

  /**
   * Close WebSocket server
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
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
} 