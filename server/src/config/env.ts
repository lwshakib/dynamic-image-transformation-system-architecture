import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Environment Configuration Service
 */

// 1. Manually resolve the .env path (server root)
dotenv.config({ path: path.join(__dirname, '../.env') });

const envSchema = z.object({
  // 2. Core Server Configuration
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // 3. AWS Global Configuration
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),
  
  // 4. S3 Infrastructure
  AWS_BUCKET_NAME_IMAGES: z.string().min(1),
  AWS_BUCKET_NAME_TRANSFORMED: z.string().min(1),
  
  // 5. Infrastructure Automation
  AWS_LAMBDA_ROLE_ARN: z.string().optional(),
  AWS_LAMBDA_FUNCTION_URL: z.string().optional(),
  
  // 6. CloudFront Configuration (Auto-filled by setup script)
  CLOUDFRONT_DOMAIN: z.string().optional(),
  CLOUDFRONT_DISTRIBUTION_ID: z.string().optional(),
  
  // 7. Database Configuration
  DATABASE_URL: z.string().url(),

  // 8. Security Configuration
  SIGNING_SECRET: z.string().min(16).default('placeholder-change-me-for-security'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
