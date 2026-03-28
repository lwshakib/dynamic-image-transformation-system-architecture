"use client"

import { Trash2, ShieldCheck, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Minimalist Asset List (Gallery Component)
 * Provides thumbnails and links to the dynamic transformation CDN.
 */
interface UploadedImage {
  id: string;
  name: string;
  path: string; // The path relative to /cdn/
  secure: boolean;
  key: string;
}

interface ImageListProps {
  images: UploadedImage[];
  onDelete: (id: string) => void;
  isSecure?: boolean;
}

export function ImageList({ images, onDelete, isSecure = false }: ImageListProps) {
  // Empty state feedback
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed text-muted-foreground/50">
        <p className="text-sm">Store is empty.</p>
      </div>
    )
  }

  // Distribution Base for assets
  const distributionBase = process.env.NEXT_PUBLIC_CDN_URL || 'http://localhost:3001/cdn';

  return (
    <div className="space-y-1">
      {images.map((image) => {
        const signatureParam = (image as any).signature ? `?s=${(image as any).signature}` : '';
        const fullUrl = `${distributionBase}/${image.path}${signatureParam}`;
        
        return (
          <div key={image.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 group transition-all">
            {/* A. Left-Side Metadata and Preview */}
            <div className="flex items-center gap-4 min-w-0">
               {/* Thumbnail Link points directly to your Edge Transformation engine */}
               <a 
                  href={fullUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 border border-muted-foreground/10 shadow-sm"
               >
                  <img 
                      src={fullUrl} 
                      alt={image.name} 
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300" 
                  />
               </a>

                <div className="flex flex-col min-w-0">
                    <a 
                      href={fullUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="Open in transformation engine"
                      className="text-sm font-medium truncate hover:underline text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {image.name}
                    </a>
                    
                    {image.secure && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 cursor-help opacity-70 hover:opacity-100 transition-opacity">
                                      <ShieldCheck className="w-3 h-3 text-primary" />
                                      <span className="text-[10px] font-medium text-primary">Signed</span>
                                  </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-[10px] py-1 px-2">
                                  Signature verified
                              </TooltipContent>
                          </Tooltip>
                      </div>
                    )}
                </div>
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
        );
      })}
    </div>
  );
}
