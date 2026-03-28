# AWS Configuration Guide ☁️

This project provides both an automated setup script and a manual path for infrastructure provisioning.

## 🤖 Automated Setup (Recommended)

To set up the entire stack automatically, follow these steps:

1. **Create an IAM User**:
   - Go to AWS console -> IAM -> Users.
   - Create a user with **Programmatic Access**.
   - Attach the following policies:
     - `AmazonS3FullAccess`
     - `AWSLambda_FullAccess`
     - `CloudFrontFullAccess`
     - `IAMFullAccess` (Required to create the Lambda execution role)
2. **Configure Environment**:
   - Add your `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` (e.g., `us-east-1`) to `server/.env`.
3. **Run Setup**:
   ```bash
   cd server
   bun run infra:setup
   ```

---

## 🛠️ Manual Configuration Steps

If you prefer to provision resources manually, use the following guide:

### 1. S3 Buckets
- Create two buckets: one for source images, one for transformed cache.
- **CORS**: Enable CORS on the uploads bucket to allow browser uploads from your dashboard domain.

### 2. IAM Execution Role
- Create a role for Lambda with `lambda.amazonaws.com` trust relationship.
- Attach `AmazonS3FullAccess` and `AWSLambdaBasicExecutionRole`.
- **Note**: This ARN must be placed in `server/.env` as `AWS_LAMBDA_ROLE_ARN`.

### 3. Lambda Function
- Create a function (Runtime: Node.js 18.x).
- Set Environment Variables:
  - `AWS_BUCKET_NAME_IMAGES`
  - `AWS_BUCKET_NAME_TRANSFORMED`
  - `DATABASE_URL`
  - `SIGNING_SECRET`
- **Memory**: Set to at least 1536MB for `sharp` performance.
- **Timeout**: Set to 60 seconds.

### 4. CloudFront Distribution
- **Origin**: Point to the source S3 bucket.
- **Cache Behavior**: Configure to allow headers (Width, Height, etc.) if not using URL path transformation.
- **Enable Function URL**: If using Lambda URL as the origin (default in this project), add the Lambda URL as a custom origin.

---

## ⚠️ Important Considerations

### propagation Time
**CloudFront Setup** takes ~15-20 minutes to reach 'Deployed' status. Until then, you will receive `403` or `404` errors from the CDN.

### Sharp Binary Issues
AWS Lambda requires `sharp` to be built for Linux x64. If you deploy manually from a Mac or Windows machine, the `node_modules` will not work. Use the `bun run lambda:build` script to generate a compatible deployment package.
