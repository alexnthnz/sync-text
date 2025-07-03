import { RedisService } from './redis.service';

export interface RateLimitConfig {
  maxMessages: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface RateLimitResult {
  isLimited: boolean;
  remaining: number;
  resetTime: number;
  blockedUntil?: number;
}

export class RateLimitService {
  private static readonly RATE_LIMIT_PREFIX = 'rate_limit';
  private static readonly BLOCK_PREFIX = 'rate_limit_block';

  /**
   * Check if a user is rate limited for a specific message type
   */
  static async isRateLimited(
    userId: string,
    messageType: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    try {
      const client = RedisService.getClient();
      const now = Date.now();
      
      // Check if user is currently blocked
      const blockKey = `${this.BLOCK_PREFIX}:${userId}:${messageType}`;
      const blockedUntil = await client.get(blockKey);
      
      if (blockedUntil) {
        const blockTime = parseInt(blockedUntil);
        if (now < blockTime) {
          return {
            isLimited: true,
            remaining: 0,
            resetTime: blockTime,
            blockedUntil: blockTime,
          };
        } else {
          // Block has expired, remove it
          await client.del(blockKey);
        }
      }

      // Get current count for the sliding window
      const key = `${this.RATE_LIMIT_PREFIX}:${userId}:${messageType}`;
      const windowStart = now - config.windowMs;
      
      // Use Redis sorted set to track requests with timestamps
      const requests = await client.zRangeByScore(key, windowStart, '+inf');
      const currentCount = requests.length;

      // Check if limit exceeded
      if (currentCount >= config.maxMessages) {
        // Set block
        const blockUntil = now + config.blockDurationMs;
        await client.setEx(blockKey, Math.ceil(config.blockDurationMs / 1000), blockUntil.toString());
        
        return {
          isLimited: true,
          remaining: 0,
          resetTime: windowStart + config.windowMs,
          blockedUntil: blockUntil,
        };
      }

      return {
        isLimited: false,
        remaining: config.maxMessages - currentCount,
        resetTime: windowStart + config.windowMs,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // If Redis fails, allow the request to prevent service disruption
      return {
        isLimited: false,
        remaining: 999,
        resetTime: Date.now() + 60000,
      };
    }
  }

  /**
   * Increment rate limit counter for a user and message type
   */
  static async incrementRateLimit(userId: string, messageType: string): Promise<void> {
    try {
      const client = RedisService.getClient();
      const now = Date.now();
      const key = `${this.RATE_LIMIT_PREFIX}:${userId}:${messageType}`;
      
      // Add current timestamp to sorted set
      await client.zAdd(key, { score: now, value: now.toString() });
      
      // Set expiration for the key (window size + some buffer)
      await client.expire(key, 7200); // 2 hours
    } catch (error) {
      console.error('Rate limit increment failed:', error);
      // Don't throw error to prevent service disruption
    }
  }

  /**
   * Reset rate limits for a specific user
   */
  static async resetUserRateLimits(userId: string): Promise<void> {
    try {
      const client = RedisService.getClient();
      
      // Get all rate limit keys for this user
      const pattern = `${this.RATE_LIMIT_PREFIX}:${userId}:*`;
      const keys = await client.keys(pattern);
      
      // Get all block keys for this user
      const blockPattern = `${this.BLOCK_PREFIX}:${userId}:*`;
      const blockKeys = await client.keys(blockPattern);
      
      // Delete all keys
      if (keys.length > 0) {
        await client.del(keys);
      }
      if (blockKeys.length > 0) {
        await client.del(blockKeys);
      }
      
      console.log(`🔄 Rate limits reset for user: ${userId}`);
    } catch (error) {
      console.error('Failed to reset rate limits:', error);
    }
  }

  /**
   * Get rate limit statistics for monitoring
   */
  static async getRateLimitStats(): Promise<{
    userId: string;
    messageType: string;
    count: number;
    blockedUntil?: number;
  }[]> {
    try {
      const client = RedisService.getClient();
      const stats: { userId: string; messageType: string; count: number; blockedUntil?: number }[] = [];
      
      // Get all rate limit keys
      const rateLimitKeys = await client.keys(`${this.RATE_LIMIT_PREFIX}:*`);
      const blockKeys = await client.keys(`${this.BLOCK_PREFIX}:*`);
      
      // Create a map of block times
      const blockMap = new Map<string, number>();
      for (const blockKey of blockKeys) {
        const blockedUntil = await client.get(blockKey);
        if (blockedUntil) {
          const parts = blockKey.split(':');
          const userId = parts[2];
          const messageType = parts[3];
          const key = `${userId}:${messageType}`;
          blockMap.set(key, parseInt(blockedUntil));
        }
      }
      
      // Process rate limit keys
      for (const key of rateLimitKeys) {
        const parts = key.split(':');
        const userId = parts[2];
        const messageType = parts[3];
        
        // Skip if we don't have valid parts
        if (!userId || !messageType) {
          continue;
        }
        
        const count = await client.zCard(key);
        
        const stat: { userId: string; messageType: string; count: number; blockedUntil?: number } = {
          userId,
          messageType,
          count,
        };
        
        const blockKey = `${userId}:${messageType}`;
        const blockedUntil = blockMap.get(blockKey);
        if (blockedUntil) {
          stat.blockedUntil = blockedUntil;
        }
        
        stats.push(stat);
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get rate limit stats:', error);
      return [];
    }
  }

  /**
   * Clean up expired rate limit data
   */
  static async cleanupExpiredData(): Promise<void> {
    try {
      const client = RedisService.getClient();
      const now = Date.now();
      
      // Get all rate limit keys
      const rateLimitKeys = await client.keys(`${this.RATE_LIMIT_PREFIX}:*`);
      
      for (const key of rateLimitKeys) {
        // Remove entries older than 1 hour
        const cutoff = now - 3600000; // 1 hour
        await client.zRemRangeByScore(key, '-inf', cutoff);
        
        // If the set is empty, delete the key
        const count = await client.zCard(key);
        if (count === 0) {
          await client.del(key);
        }
      }
      
      // Block keys have TTL, so they'll expire automatically
    } catch (error) {
      console.error('Failed to cleanup expired rate limit data:', error);
    }
  }

  /**
   * Get current rate limit status for a user
   */
  static async getUserRateLimitStatus(
    userId: string,
    messageType: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    return this.isRateLimited(userId, messageType, config);
  }
} 