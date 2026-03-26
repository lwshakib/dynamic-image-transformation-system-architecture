import { s3Service } from '../src/services/s3.service';
import { env } from '../src/config/env';

async function run() {
    console.log("Setting up S3 buckets...");
    try {
        await s3Service.createBucket(env.AWS_BUCKET_NAME_IMAGES);
        await s3Service.setupCors(env.AWS_BUCKET_NAME_IMAGES);
        
        await s3Service.createBucket(env.AWS_BUCKET_NAME_TRANSFORMED);
        await s3Service.setupCors(env.AWS_BUCKET_NAME_TRANSFORMED);
        
        console.log("S3 Setup complete.");
    } catch (error: any) {
        console.error("Fatal error during S3 setup:", error.message);
        process.exit(1);
    }
}

run();
