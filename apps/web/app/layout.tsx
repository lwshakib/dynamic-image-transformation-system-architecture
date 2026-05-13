import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

export const metadata: Metadata = {
  title: "Transformation Dashboard - Dynamic Image System",
  description:
    "Professional-grade serverless image transformation pipeline with on-the-fly processing and edge caching.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <Toaster />
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
