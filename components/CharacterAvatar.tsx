'use client';

import React, { useState } from 'react';
import { Character } from '@/lib/types';
import { getCachedCharacterBlobUrl } from '@/lib/imageCache';

interface CharacterAvatarProps {
  character: Character;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

const sizeMap = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-14 h-14 text-2xl',
  xl: 'w-20 h-20 text-3xl',
};

export default function CharacterAvatar({
  character,
  size = 'md',
  className = '',
  showGlow = true,
}: CharacterAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = sizeMap[size] || sizeMap.md;

  // Primary image path matches cached Blob URL, character imagePath, or /characters/id.png
  const cachedBlob = getCachedCharacterBlobUrl(character.id);
  const imageSrc = cachedBlob || character.imagePath || `/characters/${character.id}.png`;

  return (
    <div
      className={`relative rounded-2xl flex items-center justify-center shrink-0 border-2 overflow-hidden select-none transition-all ${sizeClasses} ${className}`}
      style={{
        backgroundColor: character.themeColor,
        borderColor: character.accentColor,
        boxShadow: showGlow ? `0 0 15px ${character.themeColor}55` : undefined,
      }}
    >
      {!imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={character.name}
          loading="eager"
          decoding="async"
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth <= 1) {
              setImageError(true);
            }
          }}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="leading-none drop-shadow-md">
          {character.avatarEmoji.slice(0, 2)}
        </span>
      )}
    </div>
  );
}
