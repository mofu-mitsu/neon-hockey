'use client';

import React, { useState } from 'react';
import { GameMode, MatchConfig, Character } from '@/lib/types';
import { CHARACTERS, GET_CHARACTER_BY_ID } from '@/lib/characters';
import CharacterCard from './CharacterCard';
import { User, Users, Swords, ArrowLeft, Play, Sparkles } from 'lucide-react';

interface MatchSetupModalProps {
  teamFormat: '1v1' | '2v2';
  mode: GameMode;
  initialConfig?: MatchConfig;
  onBack: () => void;
  onStartMatch: (config: MatchConfig) => void;
}

export default function MatchSetupModal({
  teamFormat,
  mode,
  initialConfig,
  onBack,
  onStartMatch,
}: MatchSetupModalProps) {
  // Allow toggling 1v1 or 2v2 right in setup
  const [currentFormat, setCurrentFormat] = useState<'1v1' | '2v2'>(
    initialConfig?.teamFormat || (mode === '1v1' ? '1v1' : (mode === '2v2' ? '2v2' : teamFormat))
  );

  // Load saved player name or default to 'あなた'
  const [playerName, setPlayerName] = useState<string>(() => {
    if (initialConfig?.playerName) return initialConfig.playerName;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neon_hockey_player_name') || 'あなた';
    }
    return 'あなた';
  });

  const [playerColor, setPlayerColor] = useState<string>(initialConfig?.playerColor || '#06b6d4');
  const [targetScore, setTargetScore] = useState<number>(initialConfig?.targetScore || (currentFormat === '2v2' ? 7 : 5));

  // Goal countdown preference (immediate restart vs 3-2-1 countdown after each goal)
  const [goalCountdown, setGoalCountdown] = useState<boolean>(() => {
    if (initialConfig?.goalCountdown !== undefined) return initialConfig.goalCountdown;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neon_hockey_goal_countdown') === 'true';
    }
    return false; // Default: instant restart (tempo mode)
  });

  // Character selections from initialConfig or localStorage
  const [allyId, setAllyId] = useState<string>(() => {
    if (initialConfig?.allyId) return initialConfig.allyId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neon_hockey_selected_allyId') || 'mirin';
    }
    return 'mirin';
  });
  const [opponent1Id, setOpponent1Id] = useState<string>(() => {
    if (initialConfig?.opponent1Id) return initialConfig.opponent1Id;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neon_hockey_selected_opponent1Id') || 'yutaka';
    }
    return 'yutaka';
  });
  const [opponent2Id, setOpponent2Id] = useState<string>(() => {
    if (initialConfig?.opponent2Id) return initialConfig.opponent2Id;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('neon_hockey_selected_opponent2Id') || 'yuma';
    }
    return 'yuma';
  });

  // Recent Rivals History list
  const [recentRivals, setRecentRivals] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('neon_hockey_recent_rivals');
        if (raw) return JSON.parse(raw);
      } catch {
        // Fallback
      }
    }
    return ['yutaka', 'yuma', 'mirin', 'hirotsugu', 'asahi'];
  });

  // Active selection slot: 'ally' | 'opp1' | 'opp2'
  const [activeSlot, setActiveSlot] = useState<'ally' | 'opp1' | 'opp2'>('opp1');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'college' | 'highschool'>('college');

  const is2v2 = currentFormat === '2v2';

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPlayerName(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('neon_hockey_player_name', val);
    }
  };

  const handleStart = () => {
    // Save selections & update recent rivals history
    if (typeof window !== 'undefined') {
      localStorage.setItem('neon_hockey_selected_allyId', allyId);
      localStorage.setItem('neon_hockey_selected_opponent1Id', opponent1Id);
      if (opponent2Id) localStorage.setItem('neon_hockey_selected_opponent2Id', opponent2Id);

      const toAdd = [opponent1Id];
      if (opponent2Id) toAdd.push(opponent2Id);
      if (allyId) toAdd.push(allyId);
      const updated = Array.from(new Set([...toAdd, ...recentRivals])).filter(Boolean).slice(0, 6);
      localStorage.setItem('neon_hockey_recent_rivals', JSON.stringify(updated));
    }

    const finalConfig: MatchConfig = {
      teamFormat: is2v2 ? '2v2' : '1v1',
      mode,
      targetScore,
      timeLimitSeconds: mode === 'speed_rush' ? 60 : 0,
      playerName: playerName.trim() || 'あなた',
      playerColor,
      allyId: is2v2 ? allyId : undefined,
      opponent1Id,
      opponent2Id: is2v2 ? opponent2Id : undefined,
      difficulty: 'normal',
      goalCountdown,
    };
    onStartMatch(finalConfig);
  };

  const filteredCharacters = CHARACTERS.filter((c) => {
    if (categoryFilter === 'all') return true;
    return c.category === categoryFilter;
  });

  const allyChar = GET_CHARACTER_BY_ID(allyId);
  const opp1Char = GET_CHARACTER_BY_ID(opponent1Id);
  const opp2Char = GET_CHARACTER_BY_ID(opponent2Id);

  const colors = [
    { name: 'シアン', value: '#06b6d4' },
    { name: 'ローズ', value: '#f43f5e' },
    { name: 'エメラルド', value: '#10b981' },
    { name: 'アンバー', value: '#f59e0b' },
    { name: 'パープル', value: '#a855f7' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>モード選択に戻る</span>
        </button>

        {/* 1vs1 / 2vs2 Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              setCurrentFormat('1v1');
              setTargetScore(5);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              currentFormat === '1v1'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1 VS 1 シングルス
          </button>
          <button
            onClick={() => {
              setCurrentFormat('2v2');
              setTargetScore(7);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              currentFormat === '2v2'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2 VS 2 タッグバトル
          </button>
        </div>

        <div className="text-right">
          <span className="text-xs uppercase font-mono text-cyan-400 font-bold tracking-widest">
            {mode.toUpperCase()} SETUP
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player & Team Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Player Profile Settings */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <User className="w-4 h-4 text-cyan-400" />
              <span>プレイヤー情報</span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                プレイヤー名（未入力時は「あなた」になります）
              </label>
              <input
                type="text"
                value={playerName}
                onChange={handleNameChange}
                placeholder="あなた"
                maxLength={12}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                マレットのネオンカラー
              </label>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setPlayerColor(c.value)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      playerColor === c.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {mode !== 'speed_rush' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  勝利目標スコア
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 7, 10].map((score) => (
                    <button
                      key={score}
                      onClick={() => setTargetScore(score)}
                      className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                        targetScore === score
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {score}点
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Goal Restart Tempo Setting */}
            {mode !== 'billiards' && mode !== 'curling' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>ゴール後のテンポ設定</span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {!goalCountdown ? '⚡ 即リスタート（テンポ◎）' : '⏱️ 毎回カウントダウン'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGoalCountdown(false);
                      if (typeof window !== 'undefined') localStorage.setItem('neon_hockey_goal_countdown', 'false');
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                      !goalCountdown
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">⚡</span>
                    <div>
                      <div className="leading-tight">即リスタート</div>
                      <div className="text-[10px] text-slate-400 font-normal">テンポ崩さず爽快</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoalCountdown(true);
                      if (typeof window !== 'undefined') localStorage.setItem('neon_hockey_goal_countdown', 'true');
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                      goalCountdown
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">⏱️</span>
                    <div>
                      <div className="leading-tight">毎回カウント</div>
                      <div className="text-[10px] text-slate-400 font-normal">3-2-1で仕切り直し</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Teams Summary & Selection Tabs */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {is2v2 ? 'チーム編成' : '対戦カード'}
            </div>

            {/* In 2v2: Ally Selection Slot */}
            {is2v2 && (
              <div>
                <div className="text-xs text-slate-400 mb-1">【味方NPC】</div>
                <div
                  onClick={() => setActiveSlot('ally')}
                  className={`cursor-pointer rounded-xl transition-all ${
                    activeSlot === 'ally'
                      ? 'ring-2 ring-cyan-400 shadow-md'
                      : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  <CharacterCard character={allyChar} compact roleLabel="味方タッグ" />
                </div>
              </div>
            )}

            {/* Opponent 1 Selection Slot */}
            <div>
              <div className="text-xs text-slate-400 mb-1">
                {is2v2 ? '【対戦相手 1】' : '【対戦相手】'}
              </div>
              <div
                onClick={() => setActiveSlot('opp1')}
                className={`cursor-pointer rounded-xl transition-all ${
                  activeSlot === 'opp1'
                    ? 'ring-2 ring-rose-400 shadow-md'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                <CharacterCard character={opp1Char} compact roleLabel="ライバル" />
              </div>
            </div>

            {/* Opponent 2 Selection Slot (if 2v2) */}
            {is2v2 && (
              <div>
                <div className="text-xs text-slate-400 mb-1">【対戦相手 2】</div>
                <div
                  onClick={() => setActiveSlot('opp2')}
                  className={`cursor-pointer rounded-xl transition-all ${
                    activeSlot === 'opp2'
                      ? 'ring-2 ring-rose-400 shadow-md'
                      : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  <CharacterCard character={opp2Char} compact roleLabel="ライバル" />
                </div>
              </div>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-slate-950 font-black text-base shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ネオンアリーナで試合開始！</span>
          </button>
        </div>

        {/* Right Column: Character Selection Browser (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Target Slot Status Banner */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">現在選択中の枠:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                activeSlot === 'ally'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {activeSlot === 'ally' ? '味方NPC' : activeSlot === 'opp1' ? '対戦相手 1' : '対戦相手 2'}
              </span>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setCategoryFilter('college')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  categoryFilter === 'college'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                大学生 (16名)
              </button>
              <button
                onClick={() => setCategoryFilter('highschool')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  categoryFilter === 'highschool'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                高校生 (みりん・ももか)
              </button>
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全員
              </button>
            </div>
          </div>

          {/* Quick Selection: Recent Rivals History */}
          {recentRivals.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap px-1 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 shrink-0 px-1">
                ⏱️ 直前の履歴から選択:
              </span>
              {recentRivals.map((rId) => {
                const char = GET_CHARACTER_BY_ID(rId);
                const isSelected =
                  (activeSlot === 'ally' && allyId === rId) ||
                  (activeSlot === 'opp1' && opponent1Id === rId) ||
                  (activeSlot === 'opp2' && opponent2Id === rId);

                return (
                  <button
                    key={rId}
                    type="button"
                    onClick={() => {
                      if (activeSlot === 'ally') {
                        setAllyId(rId);
                        if (typeof window !== 'undefined') localStorage.setItem('neon_hockey_selected_allyId', rId);
                      } else if (activeSlot === 'opp1') {
                        setOpponent1Id(rId);
                        if (typeof window !== 'undefined') localStorage.setItem('neon_hockey_selected_opponent1Id', rId);
                      } else if (activeSlot === 'opp2') {
                        setOpponent2Id(rId);
                        if (typeof window !== 'undefined') localStorage.setItem('neon_hockey_selected_opponent2Id', rId);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <span className="text-xs">{char.avatarEmoji.slice(0, 2)}</span>
                    <span>{char.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Character Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredCharacters.map((char) => {
              const isSelected =
                (activeSlot === 'ally' && allyId === char.id) ||
                (activeSlot === 'opp1' && opponent1Id === char.id) ||
                (activeSlot === 'opp2' && opponent2Id === char.id);

              return (
                <CharacterCard
                  key={char.id}
                  character={char}
                  isSelected={isSelected}
                  onSelect={() => {
                    if (activeSlot === 'ally') {
                      setAllyId(char.id);
                      if (typeof window !== 'undefined') localStorage.setItem('neon_hockey_selected_allyId', char.id);
                    } else if (activeSlot === 'opp1') {
                      setOpponent1Id(char.id);
                      if (typeof window !== 'undefined') localStorage.setItem('neon_hockey_selected_opponent1Id', char.id);
                    } else if (activeSlot === 'opp2') {
                      setOpponent2Id(char.id);
                      if (typeof window !== 'undefined') localStorage.setItem('neon_hockey_selected_opponent2Id', char.id);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
