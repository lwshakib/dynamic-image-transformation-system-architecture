import { 
  LambdaClient, 
  CreateFunctionCommand, 
  UpdateFunctionCodeCommand, 
  GetFunctionCommand, 
  CreateFunctionUrlConfigCommand, 
  AddPermissionCommand 
} from "@aws-sdk/client-lambda";
import { 
  IAMClient, 
  CreateRoleCommand, 
  GetRoleCommand, 
  AttachRolePolicyCommand 
} from "@aws-sdk/client-iam";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { env } from "../src/config/env";

const lambdaClient = new LambdaClient({ region: env.AWS_REGION });
const iamClient = new IAMClient({ region: env.AWS_REGION });
const functionName = "image-transformation-engine";
const roleName = "image-transformation-engine-role";

async function createZip() {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', (err) => reject(err));

        // Package our source for Lambda delivery
        archive.directory('src/', 'src');
        
        archive.finalize();
    });
}

async function getOrCreateRole() {
    try {
        console.log(`Checking if IAM Role "${roleName}" exists...`);
        const result = await iamClient.send(new GetRoleCommand({ RoleName: roleName }));
        console.log(`Found existing IAM Role: ${result.Role?.Arn}`);
        return result.Role!.Arn!;
    } catch (error: any) {
        // AWS SDK v3 uses 'NoSuchEntityException' or 'NoSuchEntity'
        if (error.name === "NoSuchEntity" || error.name === "NoSuchEntityException") {
            console.log(`Role not found. Creating new IAM Role "${roleName}"...`);
            
            // Define Trust Policy (Allows Lambda to assume this role)
            const assumeRolePolicy = JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Principal: { Service: "lambda.amazonaws.com" },
                    Action: "sts:AssumeRole"
                }]
            });

            const createResult = await iamClient.send(new CreateRoleCommand({
                RoleName: roleName,
                AssumeRolePolicyDocument: assumeRolePolicy,
                Description: "Role for Image Transformation Lambda to access S3"
            }));

            const roleArn = createResult.Role!.Arn!;
            
            // Attach Policies (S3 & Logs)
            console.log("Attaching S3 and CloudWatch logging policies...");
            await iamClient.send(new AttachRolePolicyCommand({
                RoleName: roleName,
                PolicyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess"
            }));
            await iamClient.send(new AttachRolePolicyCommand({
                RoleName: roleName,
                PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
            }));

            // IMPORTANT: IAM Role propagation can take up to 10-15 seconds
            console.log("Waiting for IAM Role to propagate (10 seconds)...");
            await new Promise(r => setTimeout(r, 10000));
            
            return roleArn;
        }
        throw error;
    }
}

async function run() {
    console.log(`\n\x1b[35m=== Automated Lambda Deployment Engine ===\x1b[0m`);
    
    try {
        const roleArn = await getOrCreateRole();
        const zipBuffer = await createZip();
        
        // 1. Check if function exists
        let exists = false;
        try {
            await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }));
            exists = true;
        } catch {}

        if (exists) {
            console.log(`Updating existing function code for "${functionName}"...`);
            await lambdaClient.send(new UpdateFunctionCodeCommand({
                FunctionName: functionName,
                ZipFile: zipBuffer,
            }));
        } else {
            console.log(`Creating new Lambda function "${functionName}"...`);
            
            await lambdaClient.send(new CreateFunctionCommand({
                FunctionName: functionName,
                Runtime: "nodejs18.x",
                Role: roleArn,
                Handler: "src/lambda/handler.handler",
                Code: { ZipFile: zipBuffer },
                Timeout: 30, // Processing images takes time
                MemorySize: 1024, // Sharp needs memory
                Environment: {
                    Variables: {
                        AWS_BUCKET_NAME_IMAGES: env.AWS_BUCKET_NAME_IMAGES,
                        AWS_BUCKET_NAME_TRANSFORMED: env.AWS_BUCKET_NAME_TRANSFORMED,
                    }
                }
            }));

            // Create Function URL for CloudFront
            console.log("Generating Lambda Function URL...");
            await lambdaClient.send(new CreateFunctionUrlConfigCommand({
                FunctionName: functionName,
                AuthType: "NONE",
            }));

            // Allow public invoke for the Function URL
            await lambdaClient.send(new AddPermissionCommand({
                FunctionName: functionName,
                StatementId: "FunctionUrlAllowPublic",
                Action: "lambda:InvokeFunctionUrl",
                Principal: "*",
                FunctionUrlAuthType: "NONE",
            }));
        }

        console.log(`\n\x1b[32m\x1b[1mSUCCESS: Automated Deployment Complete!\x1b[0m`);
    } catch (error: any) {
        console.error(`\n\x1b[31m\x1b[1mFATAL: Deployment Error:\x1b[0m\n${error.message}`);
        process.exit(1);
    }
}

run();
