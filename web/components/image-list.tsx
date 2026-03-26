"use client"

import React from 'react'
import { Trash2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface UploadedImage {
  id: string;
  name: string;
  url: string;
  size: string;
  type: string;
  status: 'ready' | 'processing' | 'failed';
}

interface ImageListProps {
  images: UploadedImage[];
  onDelete: (id: string) => void;
}

export function ImageList({ images, onDelete }: ImageListProps) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-muted-foreground/10 bg-card/50">
        <p className="text-sm text-muted-foreground">No images uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-4">
      {images.map((image) => (
        <div key={image.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-muted-foreground/10 group">
          <div className="flex items-center gap-4 min-w-0">
             <div className="w-12 h-12 rounded-md overflow-hidden bg-muted/20 shrink-0">
                <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
             </div>
             <div className="flex flex-col min-w-0">
                <p className="text-sm font-medium truncate max-w-[200px] md:max-w-md">{image.name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{image.size}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-muted-foreground/20">
                        {image.type.split('/')[1].toUpperCase()}
                    </Badge>
                </div>
             </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(image.id)}
            className="w-9 h-9 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
