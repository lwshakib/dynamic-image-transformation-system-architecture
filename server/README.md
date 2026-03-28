# Dynamic Image Transformation - Backend Server 🚀

This is the proxy and management server for the Dynamic Image Transformation pipeline. it handles image uploads, database registry management, and provides signed URLs for secure transformation.

## 🛠️ Infrastructure Automation

The backend includes a suite of scripts to manage your AWS resources and local database automatically.

### Provisioning Commands
Run these from the `server` directory:

- **Full Setup**: `bun run infra:setup` (Provison DB, S3, Lambda, and CloudFront in one go)
- **Database Setup**: `bun run db:setup` (Initializes PostgreSQL schema)
- **S3 Setup**: `bun run buckets:setup` (Creates Uploads and Transformed buckets)
- **Lambda Deploy**: `bun run lambda:deploy` (Builds and pushes the edge engine)
- **CDN Setup**: `bun run cloudfront:setup` (Configures CloudFront Distribution)

### Reset / Decommissioning
- **Full Reset**: `bun run infra:reset` (Wipes all AWS resources and local DB)
- **Individual Resets**: `bun run db:reset`, `bun run buckets:reset`, `bun run lambda:reset`, `bun run cloudfront:reset`

---

## 🏗️ Lambda Build Pipeline

AWS Lambda requires a specific binary version of the `sharp` library (for Linux x64). This project automates the cross-platform build process.

1. **Standard Build**: `bun run build` (Builds the server and triggers `lambda:build`)
2. **Dedicated Lambda Build**: `bun run lambda:build`
   - Dynamically checks your OS.
   - Forges the correct `sharp` binary for the AWS Lambda environment.
   - Bundles the handler into the `lambda-build` directory.

---

## 🔑 Environment Configuration

Copy `.env.example` to `.env` and fill in your AWS credentials. 

> [!TIP]
> Variables in the **Automated Infrastructure** section will be populated automatically if you use the `infra:setup` scripts!

---

## 🚀 Running the Server

### Development
```bash
bun run dev
```

### Production
```bash
bun run build
bun run start
```

---

## 📜 Documentation Links
- [Root Architecture Guide](../ARCHITECTURE.md)
- [AWS Configuration Manual](../AWS_CONFIGURATION.md)
