# Contributing to Dynamic Image Transformation 🤝

First off, thank you for considering contributing to this project! It's people like you who make the open-source community such a great place to learn, inspire, and create.

## 🚀 Technical Setup

This project uses a monorepo structure with a **Bun/Express** backend and a **Next.js** frontend dashboard.

### Prerequisites
- [Bun](https://bun.sh/) installed.
- Access to an AWS account (for infrastructure testing).
- A local or remote PostgreSQL instance.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dynamic-image-transformation-system-architecture.git
   cd dynamic-image-transformation-system-architecture
   ```
2. Install dependencies for both projects:
   ```bash
   cd server && bun install
   cd ../web && bun install
   ```

## 🛠️ Development Workflow

1. **Feature Branching**: Always create a new branch for your feature or bugfix.
   `git checkout -b feature/your-feature-name`
2. **Local Testing**:
   - Ensure you have a `.env` file in the `server` directory.
   - Run the backend: `bun run dev` (in `/server`).
   - Run the frontend: `bun run dev` (in `/web`).
3. **Drafting PRs**: Provide a clear description of the changes and a screenshot/recording if there are UI updates.

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
