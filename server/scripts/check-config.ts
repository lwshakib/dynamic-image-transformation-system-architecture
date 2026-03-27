import { LambdaClient, GetFunctionUrlConfigCommand, GetPolicyCommand } from "@aws-sdk/client-lambda";
import { env } from "../src/config/env";

const lambdaClient = new LambdaClient({ 
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    }
});
const functionName = "image-transformation-engine";

async function check() {
    try {
        console.log("Checking Function URL Config...");
        const config = await lambdaClient.send(new GetFunctionUrlConfigCommand({ FunctionName: functionName }));
        console.log("AuthType:", config.AuthType);
        console.log("FunctionUrl:", config.FunctionUrl);
        
        console.log("\nChecking Resource Policy...");
        try {
            const policy = await lambdaClient.send(new GetPolicyCommand({ FunctionName: functionName }));
            console.log("Policy Document:", JSON.stringify(JSON.parse(policy.Policy || "{}"), null, 2));
        } catch (e: any) {
            console.log("No policy found or error:", e.message);
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

check();
