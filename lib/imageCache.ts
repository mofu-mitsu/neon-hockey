'use client';

import { CHARACTERS } from './characters';

const inMemoryImageCache = new Map<string, HTMLImageElement>();
const inMemoryBlobUrlCache = new Map<string, string>();
let isPreloaded = false;

const CACHE_NAME = 'neon-character-cache-v2';

/**
 * Preload all character PNG images into memory, Blob URLs, and Cache Storage.
 * Eliminates loading delay and guarantees instant rendering across game, modals, and canvas cards.
 */
export async function preloadCharacterImages() {
  if (typeof window === 'undefined' || isPreloaded) return;
  isPreloaded = true;

  const supportsCacheStorage = 'caches' in window;
  let cacheStorage: Cache | null = null;
  if (supportsCacheStorage) {
    try {
      cacheStorage = await window.caches.open(CACHE_NAME);
    } catch {
      // Ignore if cache storage disabled (e.g. private mode)
    }
  }

  CHARACTERS.forEach(async (char) => {
    const src = char.imagePath || `/characters/${char.id}.png`;

    try {
      // 1. Try fetching from Cache Storage or network
      let response: Response | undefined;
      if (cacheStorage) {
        response = await cacheStorage.match(src);
      }

      if (!response) {
        response = await fetch(src, { cache: 'force-cache' });
        if (response.ok && cacheStorage) {
          try {
            await cacheStorage.put(src, response.clone());
          } catch {
            // quota or private browsing
          }
        }
      }

      if (response && response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        inMemoryBlobUrlCache.set(char.id, blobUrl);

        const img = new window.Image();
        img.src = blobUrl;
        img.onload = () => {
          inMemoryImageCache.set(char.id, img);
        };
        inMemoryImageCache.set(char.id, img);
        return;
      }
    } catch {
      // Fallback to standard Image loading
    }

    // Fallback standard load
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      inMemoryImageCache.set(char.id, img);
    };
    inMemoryImageCache.set(char.id, img);
  });
}

export function getCachedCharacterImage(charId: string): HTMLImageElement | undefined {
  return inMemoryImageCache.get(charId);
}

export function getCachedCharacterBlobUrl(charId: string): string | undefined {
  return inMemoryBlobUrlCache.get(charId);
}
