'use client';

import React from 'react';
import { MatchConfig } from '@/lib/types';
import { GET_CHARACTER_BY_ID } from '@/lib/characters';
import { Volume2, VolumeX, Pause, Play, RotateCcw, HelpCircle } from 'lucide-react';
import { sound } from '@/lib/audio';
import CharacterAvatar from './CharacterAvatar';

interface GameHUDProps {
  config: MatchConfig;
  playerScore: number;
  opponentScore: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onOpenHowToPlay: () => void;
  onToggleGoalCountdown?: () => void;
}

export default function GameHUD({
  config,
  playerScore,
  opponentScore,
  isPaused,
  onTogglePause,
  onRestart,
  onOpenHowToPlay,
  onToggleGoalCountdown,
}: GameHUDProps) {
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());

  const handleToggleSound = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
  };

  const opp1 = GET_CHARACTER_BY_ID(config.opponent1Id);
  const opp2 = config.opponent2Id ? GET_CHARACTER_BY_ID(config.opponent2Id) : null;
  const ally = config.allyId ? GET_CHARACTER_BY_ID(config.allyId) : null;

  const modeLabels: Record<string, string> = {
    'classic': 'CLASSIC HOCKEY',
    '1v1': '1 VS 1 DUEL',
    '2v2': '2 VS 2 TAG TEAM',
    'double_puck': 'DOUBLE PUCK',
    'bumpers': 'NEON BUMPERS',
    'speed_rush': 'SPEED RUSH 60s',
    'target_break': 'TARGET BREAK',
    'billiards': '🎱 NEON BILLIARDS',
    'curling': '🥌 NEON CURLING',
    'multi_ball': '🌈 MULTI BALL CHAOS',
  };

  return (
    <header className="w-full max-w-[640px] mx-auto mb-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        {/* Opponent Info (Top Team) */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center -space-x-2">
            <CharacterAvatar character={opp1} size="sm" showGlow={false} />
            {opp2 && (
              <CharacterAvatar character={opp2} size="sm" showGlow={false} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
              {config.mode === '2v2' ? 'ENEMY TEAM' : 'OPPONENT'}
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate" title={opp2 ? `${opp1.fullName || opp1.name} & ${opp2.fullName || opp2.name}` : (opp1.fullName || opp1.name)}>
              {opp2 ? `${opp1.name} & ${opp2.name}` : opp1.name}
            </div>
          </div>
        </div>

        {/* Center Scoreboard */}
        <div className="flex flex-col items-center justify-center px-3.5 py-0.5 rounded-xl bg-slate-950/90 border border-slate-800">
          <div className="text-[9px] font-mono tracking-widest text-slate-400">
            {modeLabels[config.mode] || 'MATCH'}
          </div>
          <div className="flex items-center gap-2.5 text-2xl font-black font-mono tracking-tighter">
            <span className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
              {opponentScore}
            </span>
            <span className="text-slate-600 text-xs font-normal">:</span>
            <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
              {playerScore}
            </span>
          </div>
          {config.mode !== 'speed_rush' && (
            <div className="text-[8px] text-slate-500 font-mono">
              TARGET: {config.targetScore}
            </div>
          )}
        </div>

        {/* Player & Ally Info (Bottom Team) */}
        <div className="flex items-center justify-end gap-2 min-w-0">
          <div className="text-right min-w-0">
            <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
              {ally ? 'YOUR TEAM' : 'YOU'}
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate" title={ally ? `${config.playerName || 'あなた'} & ${ally.fullName || ally.name}` : (config.playerName || 'あなた')}>
              {ally ? `${config.playerName || 'あなた'} & ${ally.name}` : (config.playerName || 'あなた')}
            </div>
          </div>
          <div className="flex items-center -space-x-2">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-slate-950 shadow-md border-2 border-slate-900 shrink-0"
              style={{ backgroundColor: config.playerColor || '#06b6d4' }}
              title={config.playerName || 'あなた'}
            >
              YOU
            </span>
            {ally && (
              <CharacterAvatar character={ally} size="sm" showGlow={false} />
            )}
          </div>
        </div>
      </div>

      {/* Control Quick Actions */}
      <div className="flex items-center justify-between border-t border-slate-800/80 mt-2 pt-2 px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHowToPlay}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>遊び方</span>
          </button>

          {/* Goal Restart Tempo Toggle for Hockey Modes */}
          {config.mode !== 'billiards' && config.mode !== 'curling' && onToggleGoalCountdown && (
            <button
              onClick={onToggleGoalCountdown}
              title={
                config.goalCountdown
                  ? '現在: ゴール後カウントダウンあり (クリックで即リスタート⚡に変更)'
                  : '現在: 即リスタート⚡ (クリックでカウントダウン⏱️ありに変更)'
              }
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                !config.goalCountdown
                  ? 'bg-cyan-950/70 border-cyan-700/80 text-cyan-300 hover:border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                  : 'bg-amber-950/70 border-amber-700/80 text-amber-300 hover:border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
              }`}
            >
              <span>{!config.goalCountdown ? '⚡ 即リスタート' : '⏱️ 毎回カウント'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'サウンドをオン' : 'サウンドをオフ'}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          <button
            onClick={onTogglePause}
            aria-label={isPaused ? '再開' : '一時停止'}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
          </button>
          <button
            onClick={onRestart}
            aria-label="リスタート"
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>
    </header>
  );
}
