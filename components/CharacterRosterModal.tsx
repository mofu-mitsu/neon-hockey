'use client';

import React, { useState } from 'react';
import { CHARACTERS } from '@/lib/characters';
import { Character } from '@/lib/types';
import { sound } from '@/lib/audio';
import CharacterAvatar from './CharacterAvatar';
import { X, Volume2, Zap, Flame, Shield, Activity, Sparkles, MessageCircle, ImageIcon } from 'lucide-react';

interface CharacterRosterModalProps {
  onClose: () => void;
}

export default function CharacterRosterModal({ onClose }: CharacterRosterModalProps) {
  const [selectedChar, setSelectedChar] = useState<Character>(CHARACTERS[0]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'college' | 'highschool'>('college');
  const [styleFilter, setStyleFilter] = useState<'all' | 'attack' | 'defense' | 'trick'>('all');
  const [activeQuoteTab, setActiveQuoteTab] = useState<'all' | 'match' | 'ally' | 'climax'>('all');

  const filteredCharacters = CHARACTERS.filter((c) => {
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (styleFilter === 'attack' && c.stats.power < 85 && c.stats.speed < 85) return false;
    if (styleFilter === 'defense' && c.stats.defense < 80) return false;
    if (styleFilter === 'trick' && c.stats.curve < 85) return false;
    return true;
  });

  const handleTestSound = () => {
    sound.playGoal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                キャラクター図鑑（全18名）
              </h2>
              <p className="text-xs text-slate-400">
                各キャラクターのプレイスタイル、性格タイプ、セリフ集、イラスト設定
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="閉じる"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Column: Character List (5 cols) */}
          <div className="md:col-span-5 p-4 border-r border-slate-800 flex flex-col overflow-hidden">
            {/* Filter Controls */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                <button
                  onClick={() => setCategoryFilter('college')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    categoryFilter === 'college' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  大学生 (16名)
                </button>
                <button
                  onClick={() => setCategoryFilter('highschool')}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    categoryFilter === 'highschool' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  高校生 (2名)
                </button>
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    categoryFilter === 'all' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  全員
                </button>
              </div>

              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => setStyleFilter('all')}
                  className={`px-2.5 py-1 rounded-md border ${
                    styleFilter === 'all' ? 'border-cyan-400/60 bg-cyan-950/40 text-cyan-300' : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  全タイプ
                </button>
                <button
                  onClick={() => setStyleFilter('attack')}
                  className={`px-2.5 py-1 rounded-md border ${
                    styleFilter === 'attack' ? 'border-rose-400/60 bg-rose-950/40 text-rose-300' : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  攻撃型
                </button>
                <button
                  onClick={() => setStyleFilter('defense')}
                  className={`px-2.5 py-1 rounded-md border ${
                    styleFilter === 'defense' ? 'border-emerald-400/60 bg-emerald-950/40 text-emerald-300' : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  守備型
                </button>
                <button
                  onClick={() => setStyleFilter('trick')}
                  className={`px-2.5 py-1 rounded-md border ${
                    styleFilter === 'trick' ? 'border-amber-400/60 bg-amber-950/40 text-amber-300' : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  変化球型
                </button>
              </div>
            </div>

            {/* List Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredCharacters.map((char) => {
                const isSelected = selectedChar.id === char.id;
                return (
                  <div
                    key={char.id}
                    onClick={() => setSelectedChar(char)}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-400 shadow-md ring-1 ring-cyan-400/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <CharacterAvatar character={char} size="sm" showGlow={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-base font-black text-cyan-300 truncate">
                          {char.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          {char.fullName}
                        </span>
                        <span className="text-[10px] text-cyan-400 font-mono ml-auto">
                          {char.mbti}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {char.grade} · {char.motif}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Character In-depth Details (7 cols) */}
          <div className="md:col-span-7 p-6 overflow-y-auto space-y-6">
            {/* Header Badge & Profile */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <CharacterAvatar character={selectedChar} size="xl" />
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-200 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                      {selectedChar.name}
                    </h3>
                    <span className="text-sm font-bold text-slate-200">
                      {selectedChar.fullName}
                    </span>
                    {selectedChar.reading && (
                      <span className="text-xs text-slate-400">
                        （{selectedChar.reading}）
                      </span>
                    )}
                    {selectedChar.nickname !== selectedChar.name && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                        {selectedChar.nickname}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="text-slate-200 font-semibold">{selectedChar.grade}</span>
                    <span aria-hidden="true">·</span>
                    <span>モチーフ: {selectedChar.motif}</span>
                    {selectedChar.dialect && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-cyan-400 font-bold">{selectedChar.dialect}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Psychological Tags */}
              <div className="text-right shrink-0">
                <span className="px-3 py-1 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-300 font-mono text-xs font-bold">
                  {selectedChar.mbti}
                </span>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  {selectedChar.socionics} · {selectedChar.enneagram}
                </div>
              </div>
            </div>

            {/* Illustration Info Box */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>
                  イラスト対応ファイル名: <code className="text-cyan-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">{selectedChar.id}.png</code>
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                /public/characters/ に配置で即反映
              </span>
            </div>

            {/* Tagline */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm font-medium text-slate-200 italic shadow-inner">
              {selectedChar.tagline}
            </div>

            {/* Personality & Play style */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  キャラクター性格
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {selectedChar.personality}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  ホッケーAIプレイスタイル
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {selectedChar.playStyle}
                </p>
              </div>
            </div>

            {/* Stats Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                能力ステータス
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>スピード</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-cyan-300">
                    {selectedChar.stats.speed}
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${selectedChar.stats.speed}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>パワー</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-rose-300">
                    {selectedChar.stats.power}
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full"
                      style={{ width: `${selectedChar.stats.power}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>守備力</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-300">
                    {selectedChar.stats.defense}
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${selectedChar.stats.defense}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>変化球</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-300">
                    {selectedChar.stats.curve}
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${selectedChar.stats.curve}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* In-game dialogue quotes gallery (Expanded!) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                  <span>試合中のセリフ集（全シチュエーション）</span>
                </div>
                <button
                  onClick={handleTestSound}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>効果音テスト</span>
                </button>
              </div>

              {/* Quotes Categories */}
              <div className="space-y-3 text-xs">
                {/* 1. Start */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="font-bold text-cyan-400 mb-1.5 flex items-center gap-1.5">
                    <span>【試合開始時のセリフ】</span>
                    <span className="text-[10px] text-slate-500 font-normal">({selectedChar.quotes.start.length}種)</span>
                  </div>
                  <div className="space-y-1">
                    {selectedChar.quotes.start.map((q, i) => (
                      <p key={i} className="text-slate-300 pl-2 border-l border-cyan-500/40 leading-relaxed">
                        「{q}」
                      </p>
                    ))}
                  </div>
                </div>

                {/* 2. Goal Scored */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="font-bold text-rose-400 mb-1.5 flex items-center gap-1.5">
                    <span>【ゴールを決めた時】</span>
                    <span className="text-[10px] text-slate-500 font-normal">({selectedChar.quotes.goalScored.length}種)</span>
                  </div>
                  <div className="space-y-1">
                    {selectedChar.quotes.goalScored.map((q, i) => (
                      <p key={i} className="text-slate-300 pl-2 border-l border-rose-500/40 leading-relaxed">
                        「{q}」
                      </p>
                    ))}
                  </div>
                </div>

                {/* 3. Goal Conceded */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                    <span>【失点・奪われた時】</span>
                    <span className="text-[10px] text-slate-500 font-normal">({selectedChar.quotes.goalConceded.length}種)</span>
                  </div>
                  <div className="space-y-1">
                    {selectedChar.quotes.goalConceded.map((q, i) => (
                      <p key={i} className="text-slate-300 pl-2 border-l border-amber-500/40 leading-relaxed">
                        「{q}」
                      </p>
                    ))}
                  </div>
                </div>

                {/* 4. Ally Cooperation */}
                {selectedChar.quotes.allyPass && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                      <span>【2vs2 タッグ協力（パス・声掛け）】</span>
                      <span className="text-[10px] text-slate-500 font-normal">({selectedChar.quotes.allyPass.length}種)</span>
                    </div>
                    <div className="space-y-1">
                      {selectedChar.quotes.allyPass.map((q, i) => (
                        <p key={i} className="text-slate-300 pl-2 border-l border-emerald-500/40 leading-relaxed">
                          「{q}」
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Ally Save Praise */}
                {selectedChar.quotes.allySave && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="font-bold text-teal-400 mb-1.5 flex items-center gap-1.5">
                      <span>【味方のファインプレー称賛】</span>
                    </div>
                    <div className="space-y-1">
                      {selectedChar.quotes.allySave.map((q, i) => (
                        <p key={i} className="text-slate-300 pl-2 border-l border-teal-500/40 leading-relaxed">
                          「{q}」
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Rally & Smash */}
                {(selectedChar.quotes.intenseRally || selectedChar.quotes.smash) && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="font-bold text-purple-400 mb-1.5 flex items-center gap-1.5">
                      <span>【強打スマッシュ ＆ 白熱ラリー】</span>
                    </div>
                    <div className="space-y-1">
                      {selectedChar.quotes.smash?.map((q, i) => (
                        <p key={`s-${i}`} className="text-slate-300 pl-2 border-l border-purple-500/40 leading-relaxed">
                          ⚡「{q}」
                        </p>
                      ))}
                      {selectedChar.quotes.intenseRally?.map((q, i) => (
                        <p key={`r-${i}`} className="text-slate-300 pl-2 border-l border-purple-500/40 leading-relaxed">
                          🔥「{q}」
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Victory & Defeat */}
                {(selectedChar.quotes.victory || selectedChar.quotes.defeat) && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="font-bold text-sky-400 mb-1.5 flex items-center gap-1.5">
                      <span>【試合決着時（勝敗）】</span>
                    </div>
                    <div className="space-y-1">
                      {selectedChar.quotes.victory?.map((q, i) => (
                        <p key={`v-${i}`} className="text-slate-300 pl-2 border-l border-sky-500/40 leading-relaxed">
                          👑 勝利: 「{q}」
                        </p>
                      ))}
                      {selectedChar.quotes.defeat?.map((q, i) => (
                        <p key={`d-${i}`} className="text-slate-300 pl-2 border-l border-rose-500/40 leading-relaxed">
                          💧 敗北: 「{q}」
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. Special Modes: Billiards & Curling */}
                {(selectedChar.quotes.billiards || selectedChar.quotes.curling) && (
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                      <span>【特殊モード専用ボイス（ビリヤード ＆ カーリング）】</span>
                    </div>
                    <div className="space-y-2">
                      {selectedChar.quotes.billiards && selectedChar.quotes.billiards.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-amber-300/90 flex items-center gap-1">
                            🎱 ネオンビリヤード:
                          </p>
                          {selectedChar.quotes.billiards.map((q, i) => (
                            <p key={`bil-${i}`} className="text-slate-300 pl-2 border-l border-amber-500/40 leading-relaxed">
                              「{q}」
                            </p>
                          ))}
                        </div>
                      )}
                      {selectedChar.quotes.curling && selectedChar.quotes.curling.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-[11px] font-semibold text-cyan-300/90 flex items-center gap-1">
                            🥌 ネオンカーリング:
                          </p>
                          {selectedChar.quotes.curling.map((q, i) => (
                            <p key={`cur-${i}`} className="text-slate-300 pl-2 border-l border-cyan-500/40 leading-relaxed">
                              「{q}」
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
