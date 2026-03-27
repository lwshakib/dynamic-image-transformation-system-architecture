"use client"

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Minimalist Asset List (Gallery Component)
 * Provides thumbnails and links to the dynamic transformation CDN.
 */
interface UploadedImage {
  id: string;
  name: string;
  url: string; // The base CDN Proxy URL (e.g. /cdn/uploads/...)
  key: string;
}

interface ImageListProps {
  images: UploadedImage[];
  onDelete: (id: string) => void;
}

export function ImageList({ images, onDelete }: ImageListProps) {
  // Empty state feedback
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed text-muted-foreground/50">
        <p className="text-sm">Store is empty.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {images.map((image) => (
        <div key={image.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 group transition-all">
          {/* A. Left-Side Metadata and Preview */}
          <div className="flex items-center gap-4 min-w-0">
             {/* Thumbnail Link points directly to your Edge Transformation engine */}
             <a 
                href={image.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 border border-muted-foreground/10 shadow-sm"
             >
                <img 
                    src={image.url} 
                    alt={image.name} 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300" 
                />
             </a>

             {/* Filename link - User can click to open in new tab and test ?w= queries */}
             <a 
                href={image.url} 
                target="_blank" 
                rel="noopener noreferrer"
                title="Open in transformation engine"
                className="text-sm font-medium truncate hover:underline text-muted-foreground hover:text-foreground transition-colors"
             >
                {image.name}
             </a>
          </div>

          {/* B. Subtle Action Layer (Visible on Hover only) */}
          <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(image.id)}
                title="Permanently remove asset"
                className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
                <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
