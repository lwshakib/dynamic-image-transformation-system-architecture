"use client"

import { Trash2, ShieldCheck, Settings2, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useState } from 'react'
import Image from 'next/image'
import axios from 'axios'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

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
  distributionBase: string;
  signature?: string;
  expires?: string;
}

interface ImageListProps {
  images: UploadedImage[];
  onDelete: (id: string) => void;
}

export function ImageList({ images, onDelete }: ImageListProps) {
  // 1. Dialog & Parameter State
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  
  const [params, setParams] = useState({
    w: '',
    h: '',
    f: '',
    q: '80'
  });

  // 2. Manual Signing Logic
  const handleTransform = async () => {
    if (!selectedImage) return;
    
    try {
      setIsSigning(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const { data } = await axios.get(`${API_URL}/images/${selectedImage.id}/sign`, {
        params: {
          w: params.w || undefined,
          h: params.h || undefined,
          f: params.f || undefined,
          q: params.q || undefined
        }
      });
      setSignedUrl(data.signedUrl);
    } catch (error) {
        console.error('Failed to sign transformation:', error);
        toast.error("Security handshake failed.");
    } finally {
        setIsSigning(false);
    }
  };

  const openTransform = (image: UploadedImage) => {
    setSelectedImage(image);
    setIsDialogOpen(true);
    
    // Initialize with the current gallery signed URL (original view)
    const sig = image.signature;
    const exp = image.expires;
    const signatureParam = sig ? `?s=${sig}${exp ? `&e=${exp}` : ''}` : '';
    setSignedUrl(`${image.distributionBase}/${image.path}${signatureParam}`);
    
    setParams({
        w: '',
        h: '',
        f: '',
        q: '80'
    });
  };

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
      {images.map((image) => {
        const sig = image.signature;
        const exp = image.expires;
        const signatureParam = sig ? `?s=${sig}${exp ? `&e=${exp}` : ''}` : '';
        const fullUrl = `${image.distributionBase}/${image.path}${signatureParam}`;
        
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
                  <Image 
                      src={fullUrl} 
                      alt={image.name} 
                      width={40}
                      height={40}
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
                      unoptimized 
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
              {image.secure && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openTransform(image)}
                    title="Configure transformation"
                    className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                    <Settings2 className="w-4 h-4" />
                </Button>
              )}
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

      {/* 3. Global Transformation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Edge Transformation
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Preview Zone */}
              <div className="aspect-square rounded-lg overflow-hidden bg-muted border relative group">
                  {isSigning && (
                    <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                  {signedUrl ? (
                    <Image 
                      src={signedUrl} 
                      alt="Preview" 
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      Preparing signature...
                    </div>
                  )}
                  
                  {signedUrl && !isSigning && (
                    <a 
                      href={signedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background shadow-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
              </div>

              {/* Controls Zone */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider opacity-60">Width</Label>
                    <Input 
                      type="number" 
                      value={params.w} 
                      onChange={(e) => setParams({...params, w: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider opacity-60">Height</Label>
                    <Input 
                      type="number" 
                      value={params.h} 
                      onChange={(e) => setParams({...params, h: e.target.value})}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[11px] font-bold uppercase tracking-wider opacity-60">Quality</Label>
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{params.q}%</span>
                  </div>
                  <Slider 
                    value={[parseInt(params.q)]} 
                    onValueChange={([val]) => setParams({...params, q: val.toString()})}
                    max={100} 
                    step={1} 
                    className="py-2"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider opacity-60">Format</Label>
                  <Select value={params.f} onValueChange={(val) => setParams({...params, f: val})}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Original Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Original (No change)</SelectItem>
                      <SelectItem value="webp">WebP (Optimized)</SelectItem>
                      <SelectItem value="avif">AVIF (Ultra)</SelectItem>
                      <SelectItem value="jpeg">JPEG (Legacy)</SelectItem>
                      <SelectItem value="png">PNG (Lossless)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Close</Button>
                <Button 
                   size="sm" 
                   onClick={handleTransform}
                   disabled={isSigning}
                   className="gap-2"
                >
                  {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                  Apply Transformation
                </Button>
                <Button 
                   size="sm" 
                   variant="secondary"
                   disabled={!signedUrl || isSigning}
                   onClick={() => signedUrl && window.open(signedUrl, '_blank')}
                   className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Full URL
                </Button>
            </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
