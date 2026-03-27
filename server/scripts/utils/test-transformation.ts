import { transformationService } from "../../src/services/transformation.service";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../src/config/env";

const s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: env.AWS_SESSION_TOKEN
    }
} as any);

async function testTransformation() {
    const imageName = "A cinematic photo of a 2D cinematic illustration in 169 aspe.jpg";
    const imagePath = path.join(process.cwd(), imageName);
    
    if (!fs.existsSync(imagePath)) {
        console.error(`Image not found at ${imagePath}`);
        // Try searching for it
        const files = fs.readdirSync(process.cwd());
        const found = files.find(f => f.includes("A cinematic photo"));
        if (found) {
            console.log(`Found similar file: ${found}`);
        } else {
            return;
        }
    }

    const key = `uploads/${Date.now()}-test-image.jpg`;
    console.log(`Uploading to S3 as: ${key}`);
    
    const imageBuffer = fs.readFileSync(imagePath);
    await s3Client.send(new PutObjectCommand({
        Bucket: env.AWS_BUCKET_NAME_IMAGES,
        Key: key,
        Body: imageBuffer,
        ContentType: "image/jpeg"
    }));
    
    console.log("Testing transformation...");
    try {
        const ops = { width: 300, format: "webp" };
        const targetCacheKey = `cdn/${key}/width=300,format=webp`;
        
        const result = await transformationService.transformImage(key, targetCacheKey, ops);
        console.log("Transformation SUCCESS!");
        console.log("Result Content-Type:", result.contentType);
        
        const outputPath = path.join(process.cwd(), "test-output.webp");
        fs.writeFileSync(outputPath, result.buffer);
        console.log(`Output saved to ${outputPath}`);
    } catch (error: any) {
        console.error("Transformation FAILED:", error);
    }
}

testTransformation();
