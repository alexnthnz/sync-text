import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Don't add NODE_ENV into T3 Env, it changes the tree-shaking behavior
export const Env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]),
    AUTH_SECRET: z.string().min(32),
    BACKEND_URL: z.string().url().default("http://localhost:3001"),
  },
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    BACKEND_URL: process.env.BACKEND_URL,
  },
  emptyStringAsUndefined: true,
});