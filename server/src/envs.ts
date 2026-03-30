import dotenv from "dotenv";
import path from "path";

/**
 * Structured placeholders for automated infrastructure keys.
 */
export const INFRA_PLACEHOLDERS = {
    AWS_LAMBDA_ROLE_ARN: 'arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME',
    AWS_LAMBDA_FUNCTION_URL: 'https://FUNCTION_ID.lambda-url.REGION.on.aws/',
    CLOUDFRONT_DISTRIBUTION_ID: 'DISTRIBUTION_ID',
    CLOUDFRONT_DOMAIN: 'd111111abcdef8.cloudfront.net',
} as const;

/**
 * Environment Configuration Service (src/envs.ts)
 * Centrally loads and validates all required environment variables.
 */

// Load environment variables from the .env file in the root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Utility function to retrieve an environment variable.
 * @param key - The name of the environment variable (e.g., "AWS_REGION")
 * @param required - Whether the variable must be present (default: true)
 * @param defaultValue - Optional value to return if the variable is missing
 * @returns The value of the environment variable, the default value, or an empty string
 * @throws Error if a required variable is missing and no default is provided
 */
function getEnv(key: string, required: boolean = false, defaultValue?: string): string {
    const value = process.env[key];
    if (required && !value && defaultValue === undefined) {
        // Halt everything if a critical configuration is missing
        throw new Error(`❌ Missing required environment variable: ${key}`);
    }
    return value || defaultValue || "";
}

// --- SERVER INSTANCE CONFIGURATION ---
export const NODE_ENV = getEnv("NODE_ENV");
export const PORT = parseInt(getEnv("PORT"), 10);

// --- AWS GLOBAL CONFIGURATION ---
export const AWS_REGION = getEnv("AWS_REGION");
export const AWS_ACCESS_KEY_ID = getEnv("AWS_ACCESS_KEY_ID");
export const AWS_SECRET_ACCESS_KEY = getEnv("AWS_SECRET_ACCESS_KEY");

// --- S3 BUCKET CONFIGURATION ---
export const AWS_BUCKET_NAME_IMAGES = getEnv("AWS_BUCKET_NAME_IMAGES");
export const AWS_BUCKET_NAME_TRANSFORMED = getEnv("AWS_BUCKET_NAME_TRANSFORMED");

// --- DATABASE CONFIGURATION ---
export const DATABASE_URL = getEnv("DATABASE_URL");

// --- SECURITY CONFIGURATION ---
export const SIGNING_SECRET = getEnv("SIGNING_SECRET");

// --- AUTOMATED INFRASTRUCTURE ---
export const AWS_LAMBDA_ROLE_ARN = getEnv("AWS_LAMBDA_ROLE_ARN");
export const AWS_LAMBDA_FUNCTION_URL = getEnv("AWS_LAMBDA_FUNCTION_URL");
export const CLOUDFRONT_DISTRIBUTION_ID = getEnv("CLOUDFRONT_DISTRIBUTION_ID");
export const CLOUDFRONT_DOMAIN = getEnv("CLOUDFRONT_DOMAIN");

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
