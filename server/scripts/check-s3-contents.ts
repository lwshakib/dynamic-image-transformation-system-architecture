import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { env } from "../src/config/env";

const s3Client = new S3Client({ 
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY ? {
        credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
        }
    } : {})
} as any);

async function listBucket() {
    try {
        console.log(`Listing bucket: ${env.AWS_BUCKET_NAME_IMAGES}`);
        const res = await s3Client.send(new ListObjectsV2Command({
            Bucket: env.AWS_BUCKET_NAME_IMAGES,
            Prefix: "uploads/"
        }));
        console.log("Objects found:");
        res.Contents?.forEach(obj => console.log(` - ${obj.Key} (${obj.Size} bytes)`));
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

listBucket();
