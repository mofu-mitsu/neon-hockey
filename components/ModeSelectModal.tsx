'use client';

import React from 'react';
import { GameMode, TeamFormat } from '@/lib/types';
import {
  Users,
  Swords,
  Flame,
  Sparkles,
  Timer,
  Target,
  CircleDot,
  Compass,
  Zap,
} from 'lucide-react';

interface ModeSelectModalProps {
  selectedTeamFormat: TeamFormat;
  onSelectTeamFormat: (format: TeamFormat) => void;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onNext: () => void;
  onOpenRoster: () => void;
}

interface ModeInfo {
  id: GameMode;
  title: string;
  subtitle: string;
  desc: string;
  category: 'standard' | 'bonus' | 'chaos';
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badge: string;
}

const MODES: ModeInfo[] = [
  {
    id: 'classic',
    title: 'CLASSIC HOCKEY',
    subtitle: '王道エアホッケー',
    desc: '洗練された物理挙動とネオンライトが織りなす王道エアホッケー。相手のAI性格に応じた独特の戦術を読み切ろう。',
    category: 'standard',
    icon: Swords,
    accentColor: '#38bdf8',
    badge: 'スタンダード',
  },
  {
    id: 'double_puck',
    title: 'DOUBLE PUCK',
    subtitle: 'マルチパック極限バトル',
    desc: '2つのパックが同時にコートを飛び交う！パック同士の激突も発生する超絶反射神経カオスゲーム。',
    category: 'chaos',
    icon: Flame,
    accentColor: '#f43f5e',
    badge: 'カオス・超高速',
  },
  {
    id: 'bumpers',
    title: 'NEON BUMPERS',
    subtitle: 'バンパー反射ギミック戦',
    desc: '中央エリアにネオンバンパーを設置！パックが衝突するとビョイーンと加速して想定外の軌道へ跳ねる！',
    category: 'standard',
    icon: Sparkles,
    accentColor: '#a855f7',
    badge: 'ギミック満載',
  },
  {
    id: 'speed_rush',
    title: 'SPEED RUSH 60s',
    subtitle: '60秒タイムアタック',
    desc: '制限時間60秒！何点奪えるかを競う電撃戦。手軽にサクッと爽快感を味わいたいときにぴったり。',
    category: 'standard',
    icon: Timer,
    accentColor: '#eab308',
    badge: '手軽にプレイ',
  },
  {
    id: 'target_break',
    title: 'TARGET BREAK',
    subtitle: '浮遊コア破壊ボーナス',
    desc: 'コート上に出現するネオンターゲットを撃ち抜け！命中させるとボーナス得点獲得！',
    category: 'standard',
    icon: Target,
    accentColor: '#10b981',
    badge: '精密ショット',
  },
  {
    id: 'billiards',
    title: '🎱 NEON BILLIARDS',
    subtitle: 'ネオン・ビリヤード',
    desc: '白玉を引いて狙い撃ち、カラフルなボールを連鎖させて6つのポケットへ叩き込め！交互ショット（2vs2なら4名交代制）の本格ネオン・ビリヤード！',
    category: 'bonus',
    icon: CircleDot,
    accentColor: '#f59e0b',
    badge: '新登場 BONUS',
  },
  {
    id: 'curling',
    title: '🥌 NEON CURLING',
    subtitle: 'ネオン・カーリング',
    desc: '低摩擦の氷上リンクにストーンを滑らせ、奥の同心円ハウス（🎯）の中心を狙え！相手ストーンの弾き出しやスウィープが熱い本格カーリング！',
    category: 'bonus',
    icon: Compass,
    accentColor: '#06b6d4',
    badge: '新登場 BONUS',
  },
  {
    id: 'multi_ball',
    title: '🌈 MULTI BALL CHAOS',
    subtitle: '大量カラーボール・パニック',
    desc: '中央のネオンジェネレーターから大量のカラーボールが湧き出す！次々に押し寄せる球を相手ゴールへ押し込みまくれ！',
    category: 'chaos',
    icon: Zap,
    accentColor: '#ec4899',
    badge: '新登場 CHAOS',
  },
];

export default function ModeSelectModal({
  selectedTeamFormat,
  onSelectTeamFormat,
  selectedMode,
  onSelectMode,
  onNext,
  onOpenRoster,
}: ModeSelectModalProps) {
  const currentModeInfo = MODES.find((m) => m.id === selectedMode) || MODES[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-8">
      {/* Title & Introduction */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-mono tracking-widest mb-3">
          ✦ ARCADE ARENA SELECT ✦
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300 tracking-tight">
          NEON HOCKEY: ARENA
        </h1>
        <p className="text-slate-300 text-sm mt-2 max-w-xl mx-auto leading-relaxed">
          1vs1の真剣勝負から、NPCとチームを組む2vs2タッグ戦まで全モード対応！
          ビリヤードやカーリング、マルチボールなどの多彩なルールで遊ぼう！
        </p>
      </div>

      {/* STEP 1: Team Format Selection (1vs1 or 2vs2) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
          <span>STEP 1</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200">対戦チーム形式を選択</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1 vs 1 Single Match */}
          <div
            onClick={() => onSelectTeamFormat('1v1')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              selectedTeamFormat === '1v1'
                ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
                  <Swords className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-100">1 VS 1 SINGLE</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                      シングルス
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    プレイヤー vs 敵NPCの1対1真剣勝負。相手の戦術や隙をじっくり見極めて勝負！
                  </p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedTeamFormat === '1v1'
                    ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                    : 'border-slate-600'
                }`}
              >
                {selectedTeamFormat === '1v1' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
              </div>
            </div>
          </div>

          {/* 2 vs 2 Tag Team */}
          <div
            onClick={() => onSelectTeamFormat('2v2')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              selectedTeamFormat === '2v2'
                ? 'bg-slate-900/95 border-pink-400 shadow-[0_0_25px_rgba(244,63,94,0.3)] ring-1 ring-pink-400'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-pink-950/80 border border-pink-500/40 text-pink-400 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-100">2 VS 2 TAG TEAM</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-800">
                      おすすめ！タッグ協力
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    プレイヤー＋味方NPC vs 敵NPC2名！味方のリアルタイム掛け声や連係プレイが熱い！
                  </p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedTeamFormat === '2v2'
                    ? 'border-pink-400 bg-pink-400 text-slate-950'
                    : 'border-slate-600'
                }`}
              >
                {selectedTeamFormat === '2v2' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: Game Mode / Rule Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-pink-400 uppercase">
            <span>STEP 2</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200">ゲームルール・モードを選択（全8モード）</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            選択中形式: <strong className="text-cyan-300">{selectedTeamFormat === '2v2' ? '2vs2 タッグ' : '1vs1 シングルス'}</strong>
          </span>
        </div>

        {/* Mode Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {MODES.map((mode) => {
            const isSelected = selectedMode === mode.id || (mode.id === 'classic' && (selectedMode === '1v1' || selectedMode === '2v2'));
            const Icon = mode.icon;

            return (
              <div
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400 scale-[1.01]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md border"
                      style={{
                        backgroundColor: `${mode.accentColor}18`,
                        borderColor: `${mode.accentColor}40`,
                        color: mode.accentColor,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        backgroundColor: `${mode.accentColor}20`,
                        color: mode.accentColor,
                      }}
                    >
                      {mode.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 mb-0.5">
                    {mode.title}
                  </h3>
                  <div className="text-[11px] font-semibold text-slate-300 mb-1.5">
                    {mode.subtitle}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                    {mode.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono text-[10px]">
                    {selectedTeamFormat === '2v2' ? '2vs2対応' : '1vs1対応'}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: isSelected ? mode.accentColor : '#64748b' }}
                  >
                    {isSelected ? '✓ 選択中' : '選択'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
        <button
          onClick={onOpenRoster}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>キャラクター図鑑（全18名）を見る</span>
        </button>

        <button
          onClick={onNext}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            【{selectedTeamFormat === '2v2' ? '2vs2 タッグ' : '1vs1 シングルス'}】{currentModeInfo.subtitle} でキャラ選択へ
          </span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
