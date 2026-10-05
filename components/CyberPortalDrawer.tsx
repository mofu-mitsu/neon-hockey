'use client';

import React, { useEffect } from 'react';
import {
  X,
  Home,
  GraduationCap,
  Sparkles,
  Swords,
  Crosshair,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Gamepad2,
  Layers,
  Crown,
} from 'lucide-react';

interface CyberPortalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRoster: () => void;
  onOpenHowToPlay: () => void;
}

interface PortalItem {
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  desc: string;
}

const PORTAL_LINKS: PortalItem[] = [
  {
    title: 'ポータル ホーム',
    subtitle: 'Webゲーム・コンテンツ総合トップ',
    badge: 'HOME',
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    url: 'https://mofu-mitsu.github.io/',
    icon: Home,
    accentColor: '#38bdf8',
    desc: '全作品やプロジェクトが集う総合ホーム',
  },
  {
    title: 'とりの丘学園 公式サイト',
    subtitle: 'キャラクター紹介＆公式ポータル',
    badge: 'CHARACTERS',
    badgeColor: 'bg-pink-950 text-pink-300 border-pink-700',
    url: 'https://mofu-mitsu.github.io/Torinooka_portal/',
    icon: GraduationCap,
    accentColor: '#ec4899',
    desc: '個性豊かな生徒たちの詳しいプロフィールや設定資料を掲載！',
  },
  {
    title: '大富豪',
    subtitle: '定番トランプバトルゲーム',
    badge: 'CARD GAME',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-700',
    url: 'https://daifugo-mofu.vercel.app/',
    icon: Crown,
    accentColor: '#f59e0b',
    desc: '革命、都落ち、階段、8切り搭載の本格大富豪！',
  },
  {
    title: 'とりの丘人狼',
    subtitle: '心理戦＆推理ブラウザゲーム',
    badge: 'WEREWOLF',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-700',
    url: 'https://mofu-mitsu.github.io/Torinooka-Werewolf/',
    icon: Swords,
    accentColor: '#a855f7',
    desc: '欺瞞と真実が交差する白熱の心理トークバトル！',
  },
  {
    title: 'PairPalette（ペアパレット）',
    subtitle: 'サイバー陣取りパズル',
    badge: 'TERRITORY',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    url: 'https://mofu-mitsu.github.io/PairPalette/',
    icon: Layers,
    accentColor: '#10b981',
    desc: 'エリアを鮮やかに塗り広げる戦略的陣取りゲーム！',
  },
  {
    title: 'Psycho-Shooter（サイコシューター）',
    subtitle: 'ハイスピードサイバーシューティング',
    badge: 'SHOOTING',
    badgeColor: 'bg-rose-950 text-rose-300 border-rose-700',
    url: 'https://mofu-mitsu.github.io/Psycho-Shooter/',
    icon: Crosshair,
    accentColor: '#f43f5e',
    desc: '弾幕を掻い潜りハイスコアを叩き出す本格STG！',
  },
];

export default function CyberPortalDrawer({
  isOpen,
  onClose,
  onOpenRoster,
  onOpenHowToPlay,
}: CyberPortalDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-sm sm:max-w-md h-full bg-[#080d1e] border-l border-cyan-800/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-900/40 bg-[#060914] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider text-slate-100 flex items-center gap-1.5">
                <span>PORTAL MENU</span>
                <span className="text-[10px] font-mono text-cyan-400">/ 関連リンク</span>
              </h2>
              <p className="text-[11px] text-slate-400">とりの丘学園＆おすすめWebゲーム集</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* In-app fast shortcuts */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2">
          <button
            onClick={() => {
              onClose();
              onOpenRoster();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>全18キャラ図鑑</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenHowToPlay();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>遊び方ルール</span>
          </button>
        </div>

        {/* Scrollable Link List */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-2.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1">
            ✦ シリーズ作品・関連ポータル ✦
          </div>

          {PORTAL_LINKS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/60 transition-all duration-200 shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${item.accentColor}18`,
                        borderColor: `${item.accentColor}50`,
                        color: item.accentColor,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0 mt-1 transition-colors" />
                </div>
                <p className="text-[11px] text-slate-300 mt-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                  {item.desc}
                </p>
              </a>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#050814] text-center text-xs text-slate-500 font-mono">
          <p>NEON HOCKEY: CHARACTER ARENA</p>
          <p className="text-[10px] text-slate-600 mt-0.5">© とりの丘学園プロジェクト</p>
        </div>
      </div>
    </div>
  );
}
