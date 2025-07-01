import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { RegisterRequest, LoginRequest, RegisterResponse, LoginResponse, JwtPayload, AuthUser } from './auth.types';
import { jwt as jwtConfig, security } from '../../config';
import { RedisService } from '../../shared';

const prisma = new PrismaClient();

export class AuthService {
  private static readonly JWT_SECRET = jwtConfig.secret;
  private static readonly JWT_EXPIRES_IN = jwtConfig.expiresIn;
  private static readonly SALT_ROUNDS = security.bcryptRounds;

  /**
   * Extract username from email address
   */
  private static extractUsernameFromEmail(email: string): string {
    const username = email.split('@')[0];
    if (!username) {
      throw new Error('Invalid email format');
    }
    return username.toLowerCase();
  }

  /**
   * Calculate expiration timestamp from JWT expires in string
   */
  private static calculateExpirationTime(expiresIn: string): string {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhdw])$/);
    
    if (!match || match.length < 3 || !match[1] || !match[2]) {
      throw new Error('Invalid expiration format');
    }

    const value = match[1];
    const unit = match[2];
    const duration = parseInt(value, 10);

    switch (unit) {
      case 's': // seconds
        now.setSeconds(now.getSeconds() + duration);
        break;
      case 'm': // minutes
        now.setMinutes(now.getMinutes() + duration);
        break;
      case 'h': // hours
        now.setHours(now.getHours() + duration);
        break;
      case 'd': // days
        now.setDate(now.getDate() + duration);
        break;
      case 'w': // weeks
        now.setDate(now.getDate() + (duration * 7));
        break;
      default:
        throw new Error('Invalid time unit');
    }

    return now.toISOString();
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload: JwtPayload): { token: string; } {
    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return { token };
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.JWT_SECRET) as JwtPayload;
  }

  /**
   * Save user session
   */
  static async saveUserSession(
    userData: AuthUser,
    expirationInSeconds = 7 * 24 * 60 * 60
  ): Promise<void> {
    try {
      const key = `user_session:${userData.id}`;
      const data = JSON.stringify({
        ...userData,
        loginAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      });

      await RedisService.getClient().setEx(key, expirationInSeconds, data);
    } catch (error) {
      console.error('❌ Failed to save user session:', error);
      throw error;
    }
  }

  /**
   * Get user session
   */
  static async getUserSession(userId: string): Promise<AuthUser | null> {
    try {
      const key = `user_session:${userId}`;
      const data = await RedisService.getClient().get(key);

      if (!data) {
        return null;
      }

      const sessionData = JSON.parse(data);
      return {
        id: sessionData.id,
        email: sessionData.email,
        username: sessionData.username,
      };
    } catch (error) {
      console.error('❌ Failed to get user session:', error);
      return null;
    }
  }

  /**
   * Revoke token
   */
  static async revokeToken(userId: string): Promise<void> {
    try {
      const key = `user_session:${userId}`;
      await RedisService.getClient().del(key);
    } catch (error) {
      console.error('❌ Failed to revoke token:', error);
      throw error;
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register new user
   */
  static async register(data: RegisterRequest): Promise<RegisterResponse> {
    const { email, password } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate username from email
    const username = this.extractUsernameFromEmail(email);

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new Error('Username already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    return {
      user,
    };
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<LoginResponse> {
    const { email, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
      },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const { token } = this.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // Save user session
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    await this.saveUserSession(userData);

    // Calculate expiration time
    const expire_at = this.calculateExpirationTime(this.JWT_EXPIRES_IN);

    return {
      token,
      expire_at,
    };
  }

  /**
   * Logout user by revoking token
   */
  static async logout(token: string): Promise<void> {
    try {
      const payload = this.verifyToken(token);
      await this.revokeToken(payload.userId);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    return user;
  }

  /**
   * Validate user credentials for middleware
   */
  static async validateUser(token: string): Promise<AuthUser | null> {
    try {
      const payload = this.verifyToken(token);

      // Get user session
      const user = await this.getUserSession(payload.userId);

      return user;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    return user;
  }

  /**
   * Update user
   */
  static async updateUser(
    userId: string,
    data: { email?: string; password?: string }
  ): Promise<AuthUser> {
    const updateData: any = {};

    if (data.email) {
      updateData.email = data.email;
    }

    if (data.password) {
      updateData.password = await this.hashPassword(data.password);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    return user;
  }



  /**
   * Get user with password (for authentication)
   */
  static async getUserWithPassword(
    userId: string
  ): Promise<{ id: string; email: string; username: string; password: string } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
      },
    });

    return user;
  }
}
