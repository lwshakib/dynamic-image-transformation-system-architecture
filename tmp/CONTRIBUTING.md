# Contributing to Dynamic Image Transformation 🤝

First off, thank you for considering contributing to this project! It's people like you who make the open-source community such a great place to learn, inspire, and create.

## 🚀 Technical Setup

This project uses a monorepo structure with a **Bun/Express** backend and a **Next.js** frontend dashboard.

### Prerequisites
- [Bun](https://bun.sh/) installed.
- Access to an AWS account (for infrastructure testing).
- A local or remote PostgreSQL instance.

## 🍴 How to Contribute

### 1. Fork the Repository
First, [fork](https://github.com/lwshakib/dynamic-image-transformation-system-architecture/fork) the project to your own GitHub account.

### 2. Clone Your Fork
Clone your fork locally and add the upstream remote for syncing:
```bash
git clone https://github.com/YOUR-USERNAME/dynamic-image-transformation-system-architecture.git
cd dynamic-image-transformation-system-architecture

# Add the main project as 'upstream'
git remote add upstream https://github.com/lwshakib/dynamic-image-transformation-system-architecture.git
```

### 3. Create a Feature Branch
Create a branch for your specific change:
```bash
git checkout -b feature/your-feature-name
```

### 4. Setup Development Environment
Refer to the **[🛠️ Local Development & Setup](./README.md#️-local-development--setup)** section in the main README for full installation and infrastructure instructions.

### 5. Commit and Push
Ensure your commit messages follow a clear pattern (e.g., `feat: XYZ`, `fix: ABC`).
```bash
git add .
git commit -m "feat: detailed description of changes"
git push origin feature/your-feature-name
```

### 6. Open a Pull Request
Go to the project's original repository and open a Pull Request (PR) from your feature branch. Be sure to link any related issues!

---

## 🏗️ Architecture Awareness

Before making changes to the transformation logic, please review:
- [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the data flow.
- [AWS_CONFIGURATION.md](./AWS_CONFIGURATION.md) for infrastructure details.

## ⚖️ Standards

- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md) at all times.
- Ensure TypeScript types are correctly defined.
- Run `bun run build` in the server directory before submitting a PR to verify the Lambda build pipeline remains intact.

## 🧪 Testing

We value quality code. If you add a new service or utility, please include unit tests where applicable.

---

Happy coding! 🚀
