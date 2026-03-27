"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { ImageUploader } from '@/components/image-uploader'
import { ImageList } from '@/components/image-list'
import { Toaster, toast } from 'sonner'
import axios from 'axios'

/**
 * Image Transformation Dashboard (Main Page)
 * Provides a unified interface for uploading and managing transformed images.
 */
interface UploadedImage {
  id: string;
  name: string;
  url: string; // This is the dynamic CDN/Proxy URL
  key: string;
  size: string;
  type: string;
  status: 'ready' | 'processing' | 'failed';
}

export default function Home() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Data Layer: Fetch all images from the backend registry.
   */
  const fetchImages = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      setIsLoading(true);
      const { data } = await axios.get(`${API_URL}/images`);
      setImages(data);
    } catch (error) {
      console.error('Data Sync Error:', error);
      toast.error("Cloud Gallery sync failed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Sync
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  /**
   * Action Layer: Remove an image permanently.
   */
  const handleDelete = async (id: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await axios.delete(`${API_URL}/images/${id}`);
      // Optimistically update the UI by filtering out the deleted ID
      setImages(prev => prev.filter(img => img.id !== id));
      toast.info("Image decommissioned.");
    } catch (error) {
      console.error('Delete Task Error:', error);
      toast.error("Failed to delete the asset.");
    }
  };

  return (
    <main className="min-h-screen container mx-auto p-4 md:p-16 max-w-3xl space-y-12">
      {/* 1. Page Header (Modern Minimalist Title) */}
      <header className="space-y-2 border-b pb-6">
          <h1 className="text-2xl font-bold tracking-tight">Image Transformation</h1>
          <p className="text-sm text-muted-foreground">Upload and test dynamic edge assets.</p>
      </header>

      {/* 2. Drag-and-Drop Ingest Interface */}
      <section className="space-y-4">
          <ImageUploader onSuccess={fetchImages} />
      </section>

      {/* 3. Global Distribution Gallery */}
      <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Asset Distribution</h2>
              {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Syncing...</span>}
          </div>
          <ImageList images={images} onDelete={handleDelete} />
      </section>

      {/* Notification Layer for user feedback */}
      <Toaster position="bottom-right" richColors theme="dark" />
    </main>
  );
}
