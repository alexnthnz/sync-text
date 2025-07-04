import { createClient, RedisClientType } from 'redis';
import { redis as redisConfig } from '../../config';

export class RedisService {
  private static client: RedisClientType | null = null;
  private static readonly DOCUMENT_CACHE_PREFIX = 'doc:content:';
  private static readonly DOCUMENT_CACHE_TTL = 3600; // 1 hour

  /**
   * Initialize Redis client
   */
  static async initialize(): Promise<void> {
    if (this.client) {
      return;
    }

    const clientConfig: any = {
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      database: redisConfig.db,
    };

    if (redisConfig.password) {
      clientConfig.password = redisConfig.password;
    }

    this.client = createClient(clientConfig);

    this.client.on('error', err => {
      console.error('❌ Redis client error:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    await this.client.connect();
  }

  /**
   * Get Redis client instance
   */
  static getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call RedisService.initialize() first.');
    }
    return this.client;
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Cache document content
   */
  static async cacheDocumentContent(
    documentId: string,
    content: string,
    title?: string
  ): Promise<void> {
    try {
      const client = this.getClient();
      const key = `${this.DOCUMENT_CACHE_PREFIX}${documentId}`;

      const cacheData = {
        content,
        title,
        cachedAt: new Date().toISOString(),
        version: Date.now(),
      };

      await client.setEx(key, this.DOCUMENT_CACHE_TTL, JSON.stringify(cacheData));
      console.log(`💾 Cached document content for ${documentId}`);
    } catch (error) {
      console.error('Failed to cache document content:', error);
      // Don't throw error to prevent service disruption
    }
  }

  /**
   * Get cached document content
   */
  static async getCachedDocumentContent(documentId: string): Promise<{
    content: string;
    title?: string;
    cachedAt: string;
    version: number;
  } | null> {
    try {
      const client = this.getClient();
      const key = `${this.DOCUMENT_CACHE_PREFIX}${documentId}`;

      const cachedData = await client.get(key);
      if (!cachedData) {
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      console.error('Failed to get cached document content:', error);
      return null;
    }
  }

  /**
   * Check if document content has changed
   */
  static async hasDocumentContentChanged(
    documentId: string,
    newContent: string,
    newTitle?: string
  ): Promise<{
    hasChanged: boolean;
    cachedContent?: string;
    cachedTitle?: string;
  }> {
    try {
      const cached = await this.getCachedDocumentContent(documentId);

      if (!cached) {
        // No cache exists, consider it as changed
        return { hasChanged: true };
      }

      const contentChanged = cached.content !== newContent;
      const titleChanged = newTitle !== undefined && cached.title !== newTitle;

      return {
        hasChanged: contentChanged || titleChanged,
        cachedContent: cached.content,
        cachedTitle: cached.title || '',
      };
    } catch (error) {
      console.error('Failed to check document content changes:', error);
      // If cache check fails, assume content has changed for safety
      return { hasChanged: true };
    }
  }

  /**
   * Invalidate document cache
   */
  static async invalidateDocumentCache(documentId: string): Promise<void> {
    try {
      const client = this.getClient();
      const key = `${this.DOCUMENT_CACHE_PREFIX}${documentId}`;

      await client.del(key);
      console.log(`🗑️ Invalidated document cache for ${documentId}`);
    } catch (error) {
      console.error('Failed to invalidate document cache:', error);
    }
  }

  /**
   * Warm up document cache from database
   */
  static async warmDocumentCache(
    documentId: string,
    content: string,
    title?: string
  ): Promise<void> {
    await this.cacheDocumentContent(documentId, content, title);
  }

  /**
   * Get cache statistics for monitoring
   */
  static async getCacheStats(): Promise<{
    totalCachedDocuments: number;
    cacheHitRate?: number;
    cacheSize?: number;
  }> {
    try {
      const client = this.getClient();
      const pattern = `${this.DOCUMENT_CACHE_PREFIX}*`;
      const keys = await client.keys(pattern);

      return {
        totalCachedDocuments: keys.length,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalCachedDocuments: 0,
      };
    }
  }

  /**
   * Clear all document caches (for maintenance/debugging)
   */
  static async clearAllDocumentCaches(): Promise<number> {
    try {
      const client = this.getClient();
      const pattern = `${this.DOCUMENT_CACHE_PREFIX}*`;
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        await client.del(keys);
        console.log(`🗑️ Cleared ${keys.length} document caches`);
      }

      return keys.length;
    } catch (error) {
      console.error('Failed to clear document caches:', error);
      return 0;
    }
  }

  /**
   * Get cache info for a specific document
   */
  static async getDocumentCacheInfo(documentId: string): Promise<{
    exists: boolean;
    cachedAt?: string;
    version?: number;
    ttl?: number;
  }> {
    try {
      const client = this.getClient();
      const key = `${this.DOCUMENT_CACHE_PREFIX}${documentId}`;

      const [cachedData, ttl] = await Promise.all([client.get(key), client.ttl(key)]);

      if (!cachedData) {
        return { exists: false };
      }

      const parsed = JSON.parse(cachedData);
      return {
        exists: true,
        cachedAt: parsed.cachedAt,
        version: parsed.version,
        ttl,
      };
    } catch (error) {
      console.error('Failed to get document cache info:', error);
      return { exists: false };
    }
  }
}
