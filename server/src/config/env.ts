import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Parse .env manually if necessary (especially for scripts)
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // AWS Configuration
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_BUCKET_NAME_IMAGES: z.string().min(1),
  AWS_BUCKET_NAME_TRANSFORMED: z.string().min(1),
  
  // Lambda Optimization
  AWS_LAMBDA_ROLE_ARN: z.string().optional(), // Optional for local dev/proxy
  
  // Database Configuration
  DATABASE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
