'use client';

import React from 'react';
import { Character } from '@/lib/types';
import { Zap, Shield, Flame, Activity } from 'lucide-react';
import CharacterAvatar from './CharacterAvatar';

interface CharacterCardProps {
  character: Character;
  isSelected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
  roleLabel?: string;
}

export default function CharacterCard({
  character,
  isSelected = false,
  onSelect,
  compact = false,
  roleLabel,
}: CharacterCardProps) {
  if (compact) {
    return (
      <div
        onClick={onSelect}
        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
          isSelected
            ? 'bg-slate-800/90 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
        }`}
      >
        <CharacterAvatar character={character} size="sm" showGlow={false} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] truncate">
              {character.name}
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {character.fullName}
            </span>
            {character.reading && (
              <span className="text-[10px] text-slate-400">
                （{character.reading}）
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono ml-auto">
              {character.mbti}
            </span>
          </div>
          <div className="text-xs text-slate-400 truncate">
            {character.grade} · {character.motif} · {character.playStyle.split('。')[0]}
          </div>
        </div>
        {roleLabel && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {roleLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
        isSelected
          ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 hover:shadow-lg'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <CharacterAvatar character={character} size="md" />
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-200 group-hover:from-cyan-200 group-hover:to-pink-300 transition-colors drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                {character.name}
              </h3>
              <span className="text-xs font-bold text-slate-200">
                {character.fullName}
              </span>
              {character.reading && (
                <span className="text-[11px] text-slate-400">
                  （{character.reading}）
                </span>
              )}
              {character.nickname !== character.name && (
                <span className="text-xs text-cyan-400/90 font-medium">
                  [{character.nickname}]
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="text-slate-300 font-medium">{character.grade}</span>
              <span aria-hidden="true">·</span>
              <span>{character.motif}</span>
              {character.dialect && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-cyan-400 font-semibold">{character.dialect}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Psychological Archetypes */}
        <div className="text-right shrink-0">
          <div className="text-xs font-mono font-bold text-cyan-400">
            {character.mbti}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {character.socionics} · {character.enneagram}
          </div>
        </div>
      </div>

      {/* Tagline / Dialogue Preview */}
      <p className="text-xs text-slate-300 italic mb-3 line-clamp-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
        {character.tagline}
      </p>

      {/* Play style description */}
      <p className="text-xs text-slate-400 mb-3.5 leading-relaxed line-clamp-2">
        {character.playStyle}
      </p>

      {/* Stat Meters */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" /> スピード
          </span>
          <span className="font-mono text-slate-200 font-bold">{character.stats.speed}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-400" /> パワー
          </span>
          <span className="font-mono text-slate-200 font-bold">{character.stats.power}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" /> 守備力
          </span>
          <span className="font-mono text-slate-200 font-bold">{character.stats.defense}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-amber-400" /> 変化球
          </span>
          <span className="font-mono text-slate-200 font-bold">{character.stats.curve}</span>
        </div>
      </div>
    </div>
  );
}
