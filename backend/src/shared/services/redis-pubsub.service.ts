import { createClient, RedisClientType } from 'redis';
import { redis as redisConfig } from '../../config';

export type PubSubMessage = {
  type: string;
  data: any;
};

export class RedisPubSubService {
  private static pubClient: RedisClientType;
  private static subClient: RedisClientType;
  private static handlers: Map<string, (message: PubSubMessage, channel: string) => void> = new Map();
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
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

      // Create separate clients for pub and sub
      this.pubClient = createClient(clientConfig);
      this.subClient = createClient(clientConfig);

      await this.pubClient.connect();
      await this.subClient.connect();

      this.isInitialized = true;
      console.log('✅ Redis PubSub service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Redis PubSub service:', error);
      throw error;
    }
  }

  static async subscribe(channel: string, handler: (message: PubSubMessage, channel: string) => void): Promise<void> {
    await this.initialize();
    this.handlers.set(channel, handler);
    await this.subClient.subscribe(channel, (message, channelName) => {
      try {
        const parsed: PubSubMessage = JSON.parse(message);
        const handler = this.handlers.get(channelName);
        if (handler) handler(parsed, channelName);
      } catch (e) {
        console.error('Failed to parse pubsub message:', e, message);
      }
    });
    console.log(`📡 Subscribed to channel: ${channel}`);
  }

  static async unsubscribe(channel: string): Promise<void> {
    await this.initialize();
    this.handlers.delete(channel);
    await this.subClient.unsubscribe(channel);
    console.log(`📡 Unsubscribed from channel: ${channel}`);
  }

  static async publish(channel: string, message: PubSubMessage): Promise<void> {
    await this.initialize();
    await this.pubClient.publish(channel, JSON.stringify(message));
  }

  static async close(): Promise<void> {
    if (this.pubClient) await this.pubClient.quit();
    if (this.subClient) await this.subClient.quit();
    this.handlers.clear();
    this.isInitialized = false;
  }
} 