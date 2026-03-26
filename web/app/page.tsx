"use client"

import React, { useState } from 'react'
import { ImageUploader } from '@/components/image-uploader'
import { ImageList } from '@/components/image-list'
import { Toaster } from 'sonner'
import { toast } from 'sonner'

interface UploadedImage {
  id: string;
  name: string;
  url: string;
  size: string;
  type: string;
  status: 'ready' | 'processing' | 'failed';
}

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>([
    {
      id: "1",
      name: "landscape-sample.jpg",
      url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
      size: "1.2 MB",
      type: "image/jpeg",
      status: "ready"
    },
    {
        id: "2",
        name: "product-shot.png",
        url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
        size: "2.4 MB",
        type: "image/png",
        status: "ready"
    }
  ]);

  const handleUpload = (file: File) => {
    const newImage: UploadedImage = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        url: URL.createObjectURL(file), // Local URL for demo
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        type: file.type,
        status: 'ready'
    };
    setImages(prev => [newImage, ...prev]);
    toast.success("Image uploaded!");
  };

  const handleDelete = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    toast.info("Image deleted.");
  };

  return (
    <main className="min-h-screen container mx-auto p-4 md:p-16 max-w-4xl">
      <div className="space-y-12">
        <section>
            <h1 className="text-2xl font-bold tracking-tight mb-8">Image Storage</h1>
            <ImageUploader onUpload={handleUpload} />
        </section>

        <section>
            <h2 className="text-xl font-semibold mb-6">Uploaded Files</h2>
            <ImageList images={images} onDelete={handleDelete} />
        </section>
      </div>
      <Toaster />
    </main>
  );
}
