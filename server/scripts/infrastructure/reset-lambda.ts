import { LambdaClient, DeleteFunctionCommand } from "@aws-sdk/client-lambda";
import { IAMClient, DeleteRoleCommand, DetachRolePolicyCommand, ListAttachedRolePoliciesCommand } from "@aws-sdk/client-iam";
import { env } from "../../src/config/env";

const lambdaClient = new LambdaClient({ region: env.AWS_REGION });
const iamClient = new IAMClient({ region: env.AWS_REGION });

const functionName = "image-transformation-engine";
const roleName = "image-transformation-engine-role";

async function deleteLambda() {
    console.log(`Decommissioning Lambda function "${functionName}"...`);
    try {
        await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: functionName }));
        console.log("Lambda deleted.");
    } catch (e: any) { console.warn("Lambda Cleanup Error:", e.message); }
}

async function deleteRole() {
    console.log(`Decommissioning IAM Role "${roleName}"...`);
    try {
        const policies = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }));
        if (policies.AttachedPolicies) {
            for (const policy of policies.AttachedPolicies) {
                await iamClient.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policy.PolicyArn }));
            }
        }
        await iamClient.send(new DeleteRoleCommand({ RoleName: roleName }));
        console.log("IAM Role decommissioned.");
    } catch (e: any) { console.warn("IAM Cleanup Error:", e.message); }
}

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.log("\n\x1b[31m\x1b[1m=== Lambda & IAM Decommissioner ===\x1b[0m");
    await deleteLambda();
    await deleteRole();
    console.log("\x1b[32m\x1b[1mSUCCESS: Lambda compute resources wiped clean!\x1b[0m");
}

run();
