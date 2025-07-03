import { PrismaClient } from '@prisma/client';

class PrismaService {
  private static instance: PrismaClient;

  static getClient(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient();
    }
    return this.instance;
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
    }
  }
}

export { PrismaService }; 