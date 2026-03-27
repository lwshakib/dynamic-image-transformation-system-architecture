"use client"

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import axios from 'axios'
import { toast } from 'sonner'

/**
 * Image Uploader Component
 * Implements a Direct-to-S3 upload pattern using pre-signed URLs.
 * This ensures large images are uploaded efficiently without burdening the Express server.
 */
interface ImageUploaderProps {
  onSuccess?: () => void;
}

export function ImageUploader({ onSuccess }: ImageUploaderProps) {
  // --- Global Component State ---
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Main Upload Protocol: Logic follows the 3-step Ingest flow.
   * 1. Get Pre-signed URL -> 2. Upload to S3 -> 3. Save Metadata to DB.
   */
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Use environment-based API URL or local default
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      setIsUploading(true);
      setUploadProgress(10); // Start progress at 10% for immediate feedback

      // Step 1: Secure Ingest Handshake
      // We request a temporary authorization (Pre-signed URL) from our server.
      const { data: { uploadUrl, publicUrl, key } } = await axios.post(`${API_URL}/images/presigned-url`, {
        fileName: file.name,
        contentType: file.type
      });

      // Step 2: Direct-to-Storage Upload
      // Using 'axios.put' to send the raw binary directly to AWS S3.
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        // Tracking progress real-time for the user
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
          setUploadProgress(percentCompleted);
        }
      });

      // Step 3: Global Asset Registry Sync
      // We inform our Postgres DB about the successful upload so the asset appears in the gallery.
      await axios.post(`${API_URL}/images/confirm`, {
        key,
        name: file.name,
        type: file.type,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        url: publicUrl
      });

      // Success Feedback Layer
      toast.success("Successfully uploaded to S3 Cloud.");
      // Trigger parent synchronization (fetching updated list)
      onSuccess?.();
    } catch (error) {
      console.error('Core Uploader Panic Error:', error);
      toast.error("Upload process failed.");
    } finally {
      // Final Cleanup Phase
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onSuccess]);

  // Dropzone Hook Configuration: Restrict to single image uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  return (
    <div className="space-y-4">
      {/* 1. Drag-and-Drop Interaction Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-[1rem] p-12 transition-all cursor-pointer text-center group
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/10 hover:border-muted-foreground/30'}
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
             {/* Dynamic Icon Layer (Loading vs Ready) */}
             {isUploading ? (
               <Loader2 className="w-8 h-8 text-primary animate-spin" />
             ) : (
               <Upload className="w-8 h-8 text-primary" />
             )}
          </div>
          <div className="space-y-1">
             <p className="font-bold text-lg tracking-tight">
                {isDragActive ? "Release to process" : "Select an image"}
             </p>
             <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                Automated optimization active
             </p>
          </div>
        </div>
      </div>

      {/* 2. Visual Progress Feedback Layer */}
      {isUploading && (
        <div className="space-y-2 px-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                <span>Ingesting to edge storage...</span>
                <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1" />
        </div>
      )}
    </div>
  )
}
