import { createClient, RedisClientType } from 'redis';
import { redis as redisConfig } from '../../config';

export class RedisService {
  private static client: RedisClientType;
  private static isConnected = false;

  /**
   * Initialize Redis connection
   */
  static async initialize(): Promise<void> {
    try {
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

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      throw error;
    }
  }

  /**
   * Get Redis client instance
   */
  static getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client is not initialized or connected');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  static isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
} 