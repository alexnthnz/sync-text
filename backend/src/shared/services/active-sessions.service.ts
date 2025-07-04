import { RedisService } from './redis.service';

export interface ActiveSession {
  userId: string;
  username: string;
  socketId: string;
  cursorPosition?: string; // JSON string of cursor position
  lastActive: number; // timestamp
}

export interface CursorPosition {
  x: number;
  y: number;
  index: number;
  length: number;
}

export class ActiveSessionsService {
  private static readonly SESSION_PREFIX = 'session';
  private static readonly SESSION_TTL = 300; // 5 minutes in seconds

  /**
   * Add or update a user session for a document
   */
  static async addSession(
    documentId: string,
    userId: string,
    username: string,
    socketId: string,
    cursorPosition?: CursorPosition
  ): Promise<void> {
    try {
      const client = RedisService.getClient();
      const key = `${this.SESSION_PREFIX}:${documentId}`;
      const now = Date.now();

      const sessionData: Record<string, string> = {
        userId,
        username,
        socketId,
        lastActive: now.toString(),
      };

      if (cursorPosition) {
        sessionData.cursorPosition = JSON.stringify(cursorPosition);
      }

      // Add user to the document's session hash
      // doc://   key: session:documentId
      await client.hSet(key, userId, JSON.stringify(sessionData));

      // Set TTL for the entire hash
      await client.expire(key, this.SESSION_TTL);

      console.log(`👤 Session added: ${username} (${userId}) to document ${documentId}`);
    } catch (error) {
      console.error('Failed to add session:', error);
      throw error;
    }
  }

  /**
   * Remove a user session from a document
   */
  static async removeSession(documentId: string, userId: string): Promise<void> {
    try {
      const client = RedisService.getClient();
      const key = `${this.SESSION_PREFIX}:${documentId}`;

      // Get user info before removing for logging
      const sessionData = await client.hGet(key, userId);
      let username = 'unknown';

      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          username = session.username;
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Remove user from the document's session hash
      await client.hDel(key, userId);

      console.log(`👋 Session removed: ${username} (${userId}) from document ${documentId}`);
    } catch (error) {
      console.error('Failed to remove session:', error);
      throw error;
    }
  }

  /**
   * Update cursor position for a user session
   */
  static async updateCursorPosition(
    documentId: string,
    userId: string,
    cursorPosition: CursorPosition
  ): Promise<void> {
    try {
      const client = RedisService.getClient();
      const key = `${this.SESSION_PREFIX}:${documentId}`;

      // Get existing session data
      const sessionData = await client.hGet(key, userId);
      if (!sessionData) {
        console.warn(`Session not found for user ${userId} in document ${documentId}`);
        return;
      }

      const session = JSON.parse(sessionData);
      session.cursorPosition = JSON.stringify(cursorPosition);
      session.lastActive = Date.now();

      // Update the session
      await client.hSet(key, userId, JSON.stringify(session));

      // Refresh TTL
      await client.expire(key, this.SESSION_TTL);
    } catch (error) {
      console.error('Failed to update cursor position:', error);
      throw error;
    }
  }

  /**
   * Update last active timestamp for a user session
   */
  static async updateLastActive(documentId: string, userId: string): Promise<void> {
    try {
      const client = RedisService.getClient();
      const key = `${this.SESSION_PREFIX}:${documentId}`;

      // Get existing session data
      const sessionData = await client.hGet(key, userId);
      if (!sessionData) {
        return; // Session might have expired
      }

      const session = JSON.parse(sessionData);
      session.lastActive = Date.now();

      // Update the session
      await client.hSet(key, userId, JSON.stringify(session));

      // Refresh TTL
      await client.expire(key, this.SESSION_TTL);
    } catch (error) {
      console.error('Failed to update last active:', error);
      // Don't throw error to prevent service disruption
    }
  }

  /**
   * Get all active sessions for a document
   */
  static async getDocumentSessions(documentId: string): Promise<ActiveSession[]> {
    try {
      const client = RedisService.getClient();
      const key = `${this.SESSION_PREFIX}:${documentId}`;

      // Get all sessions for the document
      const sessionsHash = await client.hGetAll(key);
      const sessions: ActiveSession[] = [];

      for (const [userId, sessionData] of Object.entries(sessionsHash)) {
        try {
          const session = JSON.parse(sessionData);
          sessions.push({
            userId,
            username: session.username,
            socketId: session.socketId,
            cursorPosition: session.cursorPosition,
            lastActive: session.lastActive,
          });
        } catch (error) {
          console.error(`Failed to parse session data for user ${userId}:`, error);
          // Skip invalid session data
        }
      }

      return sessions;
    } catch (error) {
      console.error('Failed to get document sessions:', error);
      return [];
    }
  }

  /**
   * Get a specific user's session for a document
   */
  static async getUserSession(documentId: string, userId: string): Promise<ActiveSession | null> {
    try {
      const client = RedisService.getClient();
      const key = `${this.SESSION_PREFIX}:${documentId}`;

      const sessionData = await client.hGet(key, userId);
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData);
      return {
        userId,
        username: session.username,
        socketId: session.socketId,
        cursorPosition: session.cursorPosition,
        lastActive: session.lastActive,
      };
    } catch (error) {
      console.error('Failed to get user session:', error);
      return null;
    }
  }

  /**
   * Check if a user has an active session for a document
   */
  static async hasActiveSession(documentId: string, userId: string): Promise<boolean> {
    try {
      const client = RedisService.getClient();
      const key = `${this.SESSION_PREFIX}:${documentId}`;

      const exists = await client.hExists(key, userId);
      return exists === 1;
    } catch (error) {
      console.error('Failed to check active session:', error);
      return false;
    }
  }

  /**
   * Get all documents with active sessions
   */
  static async getActiveDocuments(): Promise<string[]> {
    try {
      const client = RedisService.getClient();
      const pattern = `${this.SESSION_PREFIX}:*`;

      const keys = await client.keys(pattern);
      return keys.map(key => key.replace(`${this.SESSION_PREFIX}:`, ''));
    } catch (error) {
      console.error('Failed to get active documents:', error);
      return [];
    }
  }

  /**
   * Get total number of active sessions across all documents
   */
  static async getTotalActiveSessions(): Promise<number> {
    try {
      const client = RedisService.getClient();
      const pattern = `${this.SESSION_PREFIX}:*`;

      const keys = await client.keys(pattern);
      let totalSessions = 0;

      for (const key of keys) {
        const sessionCount = await client.hLen(key);
        totalSessions += sessionCount;
      }

      return totalSessions;
    } catch (error) {
      console.error('Failed to get total active sessions:', error);
      return 0;
    }
  }

  /**
   * Get the number of active sessions for a specific document
   */
  static async getDocumentSessionCount(documentId: string): Promise<number> {
    try {
      const client = RedisService.getClient();
      const key = `${this.SESSION_PREFIX}:${documentId}`;
      return await client.hLen(key);
    } catch (error) {
      console.error('Failed to get document session count:', error);
      return 0;
    }
  }

  /**
   * Clean up stale sessions (older than TTL)
   */
  static async cleanupStaleSessions(): Promise<void> {
    try {
      const client = RedisService.getClient();
      const pattern = `${this.SESSION_PREFIX}:*`;
      const keys = await client.keys(pattern);
      const now = Date.now();
      const staleThreshold = now - this.SESSION_TTL * 1000;

      for (const key of keys) {
        const sessionsHash = await client.hGetAll(key);
        const staleUserIds: string[] = [];

        for (const [userId, sessionData] of Object.entries(sessionsHash)) {
          try {
            const session = JSON.parse(sessionData);
            if (session.lastActive < staleThreshold) {
              staleUserIds.push(userId);
            }
          } catch (error) {
            // Invalid session data, mark for removal
            staleUserIds.push(userId);
          }
        }

        // Remove stale sessions
        if (staleUserIds.length > 0) {
          await client.hDel(key, staleUserIds);
          console.log(`🧹 Cleaned up ${staleUserIds.length} stale sessions from ${key}`);
        }

        // If no sessions remain, delete the entire key
        const remainingSessions = await client.hLen(key);
        if (remainingSessions === 0) {
          await client.del(key);
          console.log(`🗑️ Removed empty session key: ${key}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup stale sessions:', error);
    }
  }

  /**
   * Get session statistics for monitoring
   */
  static async getSessionStats(): Promise<{
    totalDocuments: number;
    totalSessions: number;
    activeDocuments: string[];
  }> {
    try {
      const activeDocuments = await this.getActiveDocuments();
      const totalSessions = await this.getTotalActiveSessions();

      return {
        totalDocuments: activeDocuments.length,
        totalSessions,
        activeDocuments,
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return {
        totalDocuments: 0,
        totalSessions: 0,
        activeDocuments: [],
      };
    }
  }

  /**
   * Remove all sessions for a document (when document is deleted)
   */
  static async removeAllDocumentSessions(documentId: string): Promise<void> {
    try {
      const client = RedisService.getClient();
      const key = `${this.SESSION_PREFIX}:${documentId}`;

      await client.del(key);
      console.log(`🗑️ Removed all sessions for document: ${documentId}`);
    } catch (error) {
      console.error('Failed to remove document sessions:', error);
      throw error;
    }
  }
}
