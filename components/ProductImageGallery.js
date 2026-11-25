'use client';

import { useState } from 'react';
import Image from 'next/image';

const shouldUnoptimizeImage = (src) => {
  if (typeof src !== 'string') return true;
  return !(src.startsWith('/') || /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(src));
};

export default function ProductImageGallery({ images = [], title = '' }) {
  const availableImages = images.filter((image) => image?.image_url);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = availableImages[selectedIndex] || availableImages[0] || null;

  if (!selectedImage) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-muted-foreground">
        No image
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <Image
          key={selectedImage.image_url}
          src={selectedImage.image_url}
          alt={selectedImage.alt_text || title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="h-full w-full object-contain p-3"
          preload={selectedIndex === 0}
          fetchPriority={selectedIndex === 0 ? 'high' : 'auto'}
          unoptimized={shouldUnoptimizeImage(selectedImage.image_url)}
        />
      </div>
      {availableImages.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label="Product images">
          {availableImages.map((image, index) => {
            const selected = index === selectedIndex;
            return (
              <button
                key={image.image_url + '-' + index}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={'Show product image ' + (index + 1)}
                aria-pressed={selected}
                className={'relative aspect-square overflow-hidden rounded-md border bg-muted p-1 transition-colors ' +
                  (selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/60')}
              >
                <Image
                  src={image.image_url}
                  alt={image.alt_text || title + ' image ' + (index + 1)}
                  fill
                  sizes="(max-width: 640px) 20vw, 96px"
                  loading="lazy"
                  className="object-contain p-1"
                  unoptimized={shouldUnoptimizeImage(image.image_url)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
