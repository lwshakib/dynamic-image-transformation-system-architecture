"use client"

import React from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadedImage {
  id: string;
  name: string;
  url: string; // The CDN URL (e.g. /cdn/uploads/...)
  key: string;
}

interface ImageListProps {
  images: UploadedImage[];
  onDelete: (id: string) => void;
}

export function ImageList({ images, onDelete }: ImageListProps) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed text-muted-foreground/50">
        <p className="text-sm">No assets found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {images.map((image) => (
        <div key={image.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors group">
          <div className="flex items-center gap-4 min-w-0">
             <a 
                href={image.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-sm overflow-hidden bg-muted shrink-0"
             >
                <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
             </a>

             <a 
                href={image.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium truncate hover:underline"
             >
                {image.name}
             </a>
          </div>

          <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(image.id)}
                className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
                <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
