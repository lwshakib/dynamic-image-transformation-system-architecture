# Dynamic Image Transformation System 🖼️✨

A professional-grade, serverless image transformation pipeline designed for high performance, edge caching, and a premium user experience.

[![Architecture Guide](https://img.shields.io/badge/Architecture-Guide-blue)](./ARCHITECTURE.md)
[![AWS Setup](https://img.shields.io/badge/AWS-Configuration-orange)](./AWS_CONFIGURATION.md)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

## 🌟 Vision
This project aims to provide an open-source, easily deployable alternative to commercial image CDNs. It leverages AWS Lambda and CloudFront to perform real-time image processing (resizing, conversion, effects) with global edge delivery and intelligent caching.

---

## 🏗️ The Stack

- **Backend (Proxy/API)**: [Bun](https://bun.sh/) + [Express](https://expressjs.com/)
- **Dashboard**: [Next.js 14+](https://nextjs.org/) (App Router) + [TailwindCSS](https://tailwindcss.com/)
- **Compute**: AWS Lambda (Node.js 18.x + [Sharp](https://sharp.pixelplumbing.com/))
- **Delivery**: AWS CloudFront (CDN)
- **Database**: PostgreSQL (Prisma-ready registry)

---

## 🚀 Quickstart

### 1. Provision Infrastructure
Configure your `.env` in the `/server` directory and run:
```bash
cd server
bun run infra:setup
```
*Wait ~15 minutes for CloudFront propagation.*

### 2. Run the Services
**Start the Proxy Server:**
```bash
cd server
bun run dev
```

**Start the Dashboard:**
```bash
cd web
bun run dev
```

---

## 📂 Project Structure

- [`/server`](./server/README.md): Backend API, AWS infrastructure management, and Lambda build automation.
- [`/web`](./web/README.md): Next.js dashboard for image management and transformation previewing.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): Detailed system diagrams and data flow.
- [`AWS_CONFIGURATION.md`](./AWS_CONFIGURATION.md): Step-by-step guide for manual or automated AWS setup.

---

---

## 🤝 Contributing
We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## 📚 References & Inspiration
This project's architecture is inspired by and aligned with the official AWS Networking & Content Delivery Blog:
- [Image Optimization using Amazon CloudFront and AWS Lambda](https://aws.amazon.com/blogs/networking-and-content-delivery/image-optimization-using-amazon-cloudfront-and-aws-lambda/)

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.