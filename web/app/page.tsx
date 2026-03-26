"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { ImageUploader } from '@/components/image-uploader'
import { ImageList } from '@/components/image-list'
import { Toaster, toast } from 'sonner'
import axios from 'axios'

interface UploadedImage {
  id: string;
  name: string;
  url: string;
  key: string;
  size: string;
  type: string;
  status: 'ready' | 'processing' | 'failed';
}

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchImages = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      setIsLoading(true);
      const { data } = await axios.get(`${API_URL}/images`);
      setImages(data);
    } catch (error) {
      console.error('Failed to fetch images:', error);
      toast.error("Failed to load images from server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleDelete = async (id: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await axios.delete(`${API_URL}/images/${id}`);
      setImages(prev => prev.filter(img => img.id !== id));
      toast.info("Image deleted.");
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error("Failed to delete image.");
    }
  };

  return (
    <main className="min-h-screen container mx-auto p-4 md:p-16 max-w-3xl space-y-12">
      <header className="space-y-2 border-b pb-6">
          <h1 className="text-2xl font-bold tracking-tight">Image Transformation</h1>
          <p className="text-sm text-muted-foreground">Upload and manage your assets on S3.</p>
      </header>

      <section className="space-y-4">
          <ImageUploader onSuccess={fetchImages} />
      </section>

      <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Gallery</h2>
              {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Syncing...</span>}
          </div>
          <ImageList images={images} onDelete={handleDelete} />
      </section>

      <Toaster position="bottom-right" richColors theme="dark" />
    </main>
  );
}
