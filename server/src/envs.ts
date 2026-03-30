import dotenv from "dotenv";
import path from "path";

/**
 * Structured placeholders for automated infrastructure keys.
 */
export const INFRA_PLACEHOLDERS = {
    AWS_LAMBDA_ROLE_ARN: 'arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME',
    AWS_LAMBDA_FUNCTION_URL: 'https://FUNCTION_ID.lambda-url.REGION.on.aws/',
    CLOUDFRONT_DISTRIBUTION_ID: 'DISTRIBUTION_ID',
    CLOUDFRONT_DOMAIN: 'DISTRIBUTION_SUBDOMAIN.cloudfront.net',
} as const;

/**
 * Environment Configuration Service (src/envs.ts)
 * Centrally loads and validates all required environment variables.
 */

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Load environment variables from the .env file in the root directory (Local development only)
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

function getEnv(key: string, required: boolean = true, defaultValue?: string): string | undefined {
    const value = process.env[key];
    if (required && !value && defaultValue === undefined) {
        // Halt everything if a critical configuration is missing
        throw new Error(`❌ Missing required environment variable: ${key}`);
    }
    return value || defaultValue;
}

// --- SERVER INSTANCE CONFIGURATION ---
export const NODE_ENV = getEnv("NODE_ENV", false, "development") as string;
export const PORT = parseInt(getEnv("PORT", false, "3001") as string, 10);

// --- AWS GLOBAL CONFIGURATION ---
export const AWS_REGION = getEnv("AWS_REGION", false, "ap-south-1") as string;
export const AWS_ACCESS_KEY_ID = getEnv("AWS_ACCESS_KEY_ID", false);
export const AWS_SECRET_ACCESS_KEY = getEnv("AWS_SECRET_ACCESS_KEY", false);

// --- S3 BUCKET CONFIGURATION ---
export const AWS_BUCKET_NAME_IMAGES = getEnv("AWS_BUCKET_NAME_IMAGES") as string;
export const AWS_BUCKET_NAME_TRANSFORMED = getEnv("AWS_BUCKET_NAME_TRANSFORMED") as string;

// --- DATABASE CONFIGURATION ---
export const DATABASE_URL = getEnv("DATABASE_URL") as string;

// --- SECURITY CONFIGURATION ---
export const SIGNING_SECRET = getEnv("SIGNING_SECRET") as string;

// --- AUTOMATED INFRASTRUCTURE ---
export const AWS_LAMBDA_ROLE_ARN = getEnv("AWS_LAMBDA_ROLE_ARN", false);
export const AWS_LAMBDA_FUNCTION_URL = getEnv("AWS_LAMBDA_FUNCTION_URL", false);
export const CLOUDFRONT_DISTRIBUTION_ID = getEnv("CLOUDFRONT_DISTRIBUTION_ID", false);
export const CLOUDFRONT_DOMAIN = getEnv("CLOUDFRONT_DOMAIN", false);

// --- AGGREGATED EXPORT FOR BACKWARD COMPATIBILITY ---
export const env = {
    NODE_ENV,
    PORT,
    AWS_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_BUCKET_NAME_IMAGES,
    AWS_BUCKET_NAME_TRANSFORMED,
    DATABASE_URL,
    SIGNING_SECRET,
    AWS_LAMBDA_ROLE_ARN,
    AWS_LAMBDA_FUNCTION_URL,
    CLOUDFRONT_DISTRIBUTION_ID,
    CLOUDFRONT_DOMAIN,
};
