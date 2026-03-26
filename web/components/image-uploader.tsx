"use client"

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'
import { toast } from 'sonner'

interface ImageUploaderProps {
  onSuccess: () => void;
}

export function ImageUploader({ onSuccess }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setProgress(0);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // 1. Get Pre-signed URL from server
      const { data: { uploadUrl, publicUrl, key } } = await axios.post(`${API_URL}/images/presigned-url`, {
        fileName: file.name,
        contentType: file.type
      });

      // 2. Upload to S3/R2 with progress
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
          setProgress(percentCompleted);
        }
      });

      // 3. Confirm upload to server database
      await axios.post(`${API_URL}/images/confirm`, {
        key,
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        url: publicUrl
      });

      toast.success("Image uploaded successfully!");
      onSuccess();
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.error?.[0]?.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }, [onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: false,
    disabled: isUploading
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 relative overflow-hidden",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 bg-card",
        isUploading && "pointer-events-none opacity-80"
      )}
    >
      <input {...getInputProps()} />
      
      {isUploading ? (
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="text-center">
             <p className="text-sm font-medium">Uploading... {progress}%</p>
             <div className="w-48 h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div 
                    className="h-full bg-primary transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }} 
                />
             </div>
          </div>
        </div>
      ) : (
        <>
            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
                PNG, JPG or WebP (max 5MB)
            </p>
        </>
      )}
    </div>
  )
}
