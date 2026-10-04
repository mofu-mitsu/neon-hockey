'use client';

import React from 'react';
import { InGameSpeech } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import CharacterAvatar from './CharacterAvatar';

interface SpeechOverlayProps {
  speech: InGameSpeech | null;
}

export default function SpeechOverlay({ speech }: SpeechOverlayProps) {
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-[560px] pointer-events-none z-30 px-4">
      <AnimatePresence>
        {speech && (
          <motion.div
            key={speech.id}
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`flex items-start gap-3 p-3 rounded-2xl backdrop-blur-md shadow-2xl border ${
              speech.isAlly
                ? 'bg-slate-950/90 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)] ml-auto max-w-[85%]'
                : 'bg-slate-950/90 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)] mr-auto max-w-[85%]'
            }`}
          >
            {/* Character Avatar Icon with image support */}
            <CharacterAvatar character={speech.character} size="sm" />

            {/* Bubble Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-xs font-bold"
                  style={{ color: speech.character.accentColor }}
                >
                  {speech.character.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {speech.isAlly ? '味方' : 'ライバル'}
                </span>
                {speech.character.motif && (
                  <span className="text-[10px] text-slate-500">
                    · {speech.character.motif}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-100 leading-snug">
                {speech.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
