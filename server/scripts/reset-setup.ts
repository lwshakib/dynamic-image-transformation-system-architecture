import { LambdaClient, DeleteFunctionCommand, GetFunctionCommand, DeleteFunctionUrlConfigCommand } from "@aws-sdk/client-lambda";
import { IAMClient, DeleteRoleCommand, DetachRolePolicyCommand, ListAttachedRolePoliciesCommand } from "@aws-sdk/client-iam";
import { S3Client, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, DeleteDistributionCommand, GetDistributionCommand, UpdateDistributionCommand } from "@aws-sdk/client-cloudfront";
import { postgresService } from "../src/services/postgres.service";
import { env } from "../src/config/env";

const lambdaClient = new LambdaClient({ region: env.AWS_REGION });
const iamClient = new IAMClient({ region: env.AWS_REGION });
const s3Client = new S3Client({ region: env.AWS_REGION });
const cloudFrontClient = new CloudFrontClient({ region: env.AWS_REGION });

const functionName = "image-transformation-engine";
const roleName = "image-transformation-engine-role";

async function deleteTable() {
    console.log("Dropping PostgreSQL table...");
    try {
        await postgresService.query('DROP TABLE IF EXISTS images');
        console.log("Table deleted.");
    } catch (e: any) { console.error("DB Error:", e.message); }
}

async function emptyAndDeleteBucket(bucketName: string) {
    try {
        console.log(`Emptying bucket "${bucketName}"...`);
        const listResult = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));
        if (listResult.Contents?.length) {
            const deleteParams = {
                Bucket: bucketName,
                Delete: { Objects: listResult.Contents.map(obj => ({ Key: obj.Key! })) }
            };
            await s3Client.send(new DeleteObjectsCommand(deleteParams));
        }
        console.log(`Deleting bucket "${bucketName}"...`);
        await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket "${bucketName}" deleted.`);
    } catch (e: any) { console.warn(`Bucket Error (${bucketName}):`, e.message); }
}

async function deleteLambda() {
    console.log(`Deleting Lambda function "${functionName}"...`);
    try {
        await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: functionName }));
        console.log("Lambda deleted.");
    } catch (e: any) { console.warn("Lambda Error:", e.message); }
}

async function deleteRole() {
    console.log(`Cleaning up IAM Role "${roleName}"...`);
    try {
        const policies = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }));
        if (policies.AttachedPolicies) {
            for (const policy of policies.AttachedPolicies) {
                await iamClient.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policy.PolicyArn }));
            }
        }
        await iamClient.send(new DeleteRoleCommand({ RoleName: roleName }));
        console.log("IAM Role deleted.");
    } catch (e: any) { console.warn("IAM Error:", e.message); }
}

async function resetAll() {
    console.log("\x1b[31m\x1b[1m=== Image Transformation System: Global Reset ===\x1b[0m");
    
    // CloudFront reset is complex as it requires disabling first and waiting.
    console.log("\n\x1b[33mNote: CloudFront distributions require manual disabling/wait (approx 15-20 mins) before deletion. Skipping automated CloudFront deletion to prevent script hang.\x1b[0m");
    
    await deleteTable();
    await emptyAndDeleteBucket(env.AWS_BUCKET_NAME_IMAGES);
    await emptyAndDeleteBucket(env.AWS_BUCKET_NAME_TRANSFORMED);
    await deleteLambda();
    await deleteRole();

    await postgresService.close();
    console.log("\x1b[32m\x1b[1mRESET COMPLETE: Database, S3, and Lambda cleaned up.\x1b[0m");
}

resetAll();
