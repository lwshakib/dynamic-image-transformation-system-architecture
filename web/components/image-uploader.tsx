"use client"

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  onUpload: (file: File) => void;
}

export function ImageUploader({ onUpload }: ImageUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    onUpload(file);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 bg-card"
      )}
    >
      <input {...getInputProps()} />
      <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold">Click to upload</span> or drag and drop
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        PNG, JPG or WebP (MAX. 5MB)
      </p>
    </div>
  )
}
