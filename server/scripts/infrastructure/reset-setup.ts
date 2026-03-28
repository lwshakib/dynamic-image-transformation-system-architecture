import { LambdaClient, DeleteFunctionCommand, GetFunctionCommand, DeleteFunctionUrlConfigCommand } from "@aws-sdk/client-lambda";
import { IAMClient, DeleteRoleCommand, DetachRolePolicyCommand, ListAttachedRolePoliciesCommand } from "@aws-sdk/client-iam";
import { S3Client, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, DeleteDistributionCommand, GetDistributionCommand, UpdateDistributionCommand } from "@aws-sdk/client-cloudfront";
import { postgresService } from "../../src/services/postgres.service";
import { env } from "../../src/config/env";
import { removeFromEnv } from "../utils/env-utils";
import fs from "fs";
import path from "path";

/**
 * Global Architecture Decommissioner (Reset Tool)
 * Safely removes all provisioned resources to clear the environment.
 */
const lambdaClient = new LambdaClient({ region: env.AWS_REGION });
const iamClient = new IAMClient({ region: env.AWS_REGION });
const s3Client = new S3Client({ region: env.AWS_REGION });
const cloudFrontClient = new CloudFrontClient({ region: env.AWS_REGION });

const functionName = "image-transformation-engine";
const roleName = "image-transformation-engine-role";

/**
 * DB: Wipe all metadata
 */
async function deleteTable() {
    console.log("Emptying PostgreSQL registry table...");
    try {
        await postgresService.query('DROP TABLE IF EXISTS images');
        console.log("Registry wiped.");
    } catch (e: any) { console.error("Database Cleanup Error:", e.message); }
}

/**
 * S3: Empty and Delete specific buckets
 */
async function emptyAndDeleteBucket(bucketName: string) {
    try {
        console.log(`Cleaning S3 storage: Bucket "${bucketName}"...`);
        // --- 1. S3 buckets must be empty before deletion ---
        const listResult = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));
        if (listResult.Contents?.length) {
            const deleteParams = {
                Bucket: bucketName,
                Delete: { Objects: listResult.Contents.map(obj => ({ Key: obj.Key! })) }
            };
            await s3Client.send(new DeleteObjectsCommand(deleteParams));
        }
        // --- 2. Safe deletion of the bucket itself ---
        await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket "${bucketName}" decommissioned.`);
    } catch (e: any) { console.warn(`Bucket Error (${bucketName}):`, e.message); }
}

/**
 * Lambda: Remove the transformation engine
 */
async function deleteLambda() {
    console.log(`Decommissioning Lambda function "${functionName}"...`);
    try {
        await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: functionName }));
        console.log("Lambda deleted.");
    } catch (e: any) { console.warn("Lambda Cleanup Error:", e.message); }
}

/**
 * IAM: Remove the automated role and detach policies
 */
async function deleteRole() {
    console.log(`Decommissioning IAM Role "${roleName}"...`);
    try {
        // --- 1. Policies must be detached before a role can be deleted ---
        const policies = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }));
        if (policies.AttachedPolicies) {
            for (const policy of policies.AttachedPolicies) {
                await iamClient.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policy.PolicyArn }));
            }
        }
        // --- 2. Final deletion of the role instance ---
        await iamClient.send(new DeleteRoleCommand({ RoleName: roleName }));
        console.log("IAM Role decommissioned.");
    } catch (e: any) { console.warn("IAM Cleanup Error:", e.message); }
}


async function resetAll() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.log("\n\x1b[31m\x1b[1m=== Global Infrastructure Decommissioner (Reset) ===\x1b[0m");
    console.log("\x1b[33mWarning: This will permanently wipe all S3 assets and DB records.\x1b[0m");

    // Skip CloudFront automated deletion as it takes ~20 minutes to disable
    console.log("\nNote: CloudFront distributions require manual 'Disable' and 20-min wait before deletion. Skipping automated CDN deletion.");

    await deleteTable();
    await emptyAndDeleteBucket(env.AWS_BUCKET_NAME_IMAGES);
    await emptyAndDeleteBucket(env.AWS_BUCKET_NAME_TRANSFORMED);
    await deleteLambda();
    await deleteRole();

    // Final scrub of environment variables
    removeFromEnv([
        'AWS_LAMBDA_ROLE_ARN',
        'AWS_LAMBDA_FUNCTION_URL',
        'CLOUDFRONT_DISTRIBUTION_ID',
        'CLOUDFRONT_DOMAIN'
    ]);

    await postgresService.close();
    console.log("\n\x1b[32m\x1b[1mSUCCESS: Core Infrastructure wiped clean!\x1b[0m");
}

resetAll();
