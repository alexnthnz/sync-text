import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface DatabaseConfig {
  url: string;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigin: string;
}

export interface SecurityConfig {
  bcryptRounds: number;
  rateLimitMax: number;
  rateLimitWindow: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  jwt: JWTConfig;
  security: SecurityConfig;
  redis: RedisConfig;
}

// Helper function to get required environment variable
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// Helper function to get optional environment variable with default
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// Helper function to get number from environment variable
function getEnvAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  return parsed;
}

// Helper function to get boolean from environment variable
function getEnvAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;

  return value.toLowerCase() === 'true';
}

// Export for potential future use
export { getEnvAsBoolean };

// Validate node environment
function validateNodeEnv(env: string): 'development' | 'production' | 'test' {
  if (env === 'development' || env === 'production' || env === 'test') {
    return env;
  }
  throw new Error(`Invalid NODE_ENV: ${env}. Must be 'development', 'production', or 'test'`);
}

// Create configuration object
const config: AppConfig = {
  server: {
    port: getEnvAsNumber('PORT', 3001),
    nodeEnv: validateNodeEnv(getOptionalEnv('NODE_ENV', 'development')),
    corsOrigin: getOptionalEnv('CORS_ORIGIN', 'http://localhost:3000'),
  },

  database: {
    url: getRequiredEnv('DATABASE_URL'),
  },

  jwt: {
    secret: getRequiredEnv('JWT_SECRET'),
    expiresIn: getOptionalEnv('JWT_EXPIRES_IN', '7d'),
    refreshSecret: getOptionalEnv('JWT_REFRESH_SECRET', `${getRequiredEnv('JWT_SECRET')}_refresh`),
    refreshExpiresIn: getOptionalEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
  },

  security: {
    bcryptRounds: getEnvAsNumber('BCRYPT_ROUNDS', 12),
    rateLimitMax: getEnvAsNumber('RATE_LIMIT_MAX', 100),
    rateLimitWindow: getEnvAsNumber('RATE_LIMIT_WINDOW', 15 * 60 * 1000), // 15 minutes
  },

  redis: {
    host: getOptionalEnv('REDIS_HOST', 'localhost'),
    port: getEnvAsNumber('REDIS_PORT', 6379),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    db: getEnvAsNumber('REDIS_DB', 0),
  },
};

// Validation function to ensure all required configs are present
export function validateConfig(): void {
  try {
    // Test database URL format
    if (!config.database.url.startsWith('postgresql://')) {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
    }

    // Test JWT secret length
    if (config.jwt.secret.length < 32) {
      console.warn('⚠️  JWT_SECRET should be at least 32 characters long for security');
    }

    // Test bcrypt rounds range
    if (config.security.bcryptRounds < 10 || config.security.bcryptRounds > 15) {
      console.warn(
        '⚠️  BCRYPT_ROUNDS should be between 10-15 for optimal security/performance balance'
      );
    }

    console.log('✅ Configuration validation passed');
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
  }
}

// Helper functions for common config access patterns
export const isDevelopment = () => config.server.nodeEnv === 'development';
export const isProduction = () => config.server.nodeEnv === 'production';
export const isTest = () => config.server.nodeEnv === 'test';

// Export the configuration
export default config;

// Export individual config sections for convenience
export const { server, database, jwt, security, redis } = config;
