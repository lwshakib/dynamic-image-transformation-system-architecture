# Dynamic Image Transformation - Dashboard 🎨

A modern Next.js dashboard to manage your images and interact with the transformation pipeline.

## ✨ Features

- **Object Management**: Upload and browse images stored in S3.
- **On-the-fly Transformation**: Interactive dialog to test transformation parameters (width, height, format, blur, etc.).
- **Security First**: Automatically generates HMAC-signed URLs for secure asset delivery.
- **Cache Awareness**: Real-time feedback on cache status for transformed images.

---

## 🚀 Getting Started

### Development

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build for Production

```bash
bun run build
bun run start
```

---

## 🔧 Component Overview

- `components/image-list.tsx`: The heart of the app. Handles image fetching, transformation previewing, and signed URL generation.
- `components/transformation-dialog.tsx`: Provides the UI for tweaking image parameters and viewing real-time previews.

---

## 📡 API Integration

The dashboard communicates with the Bun proxy server (default: `localhost:3001`). Ensure the backend is running for the dashboard to function correctly.

---

## 📜 Documentation Links

- [Root Architecture Guide](../ARCHITECTURE.md)
- [AWS Configuration Manual](../AWS_CONFIGURATION.md)
