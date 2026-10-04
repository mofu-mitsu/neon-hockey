'use client';

import React from 'react';
import { X, MousePointer, Smartphone, Keyboard, Users, Sparkles, Target, Zap } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export default function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-y-auto max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-100">
              ネオンホッケーの遊び方 &amp; ルール
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs text-slate-300">
          {/* Controls */}
          <div>
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5" />
              <span>基本操作（どの端末でも快適プレイ！）</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                  <MousePointer className="w-3.5 h-3.5 text-cyan-400" /> マウス操作
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  自陣側（コート下半分）でカーソルを動かすとマレットが素早く追従します。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                  <Smartphone className="w-3.5 h-3.5 text-pink-400" /> スマホ・タッチ
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  コート下部を指でタッチ＆ドラッグしてマレットを直感的に操作できます。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                  <Keyboard className="w-3.5 h-3.5 text-amber-400" /> キーボード
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  【矢印キー】または【W/A/S/Dキー】でマレットを自由に移動できます。
                </p>
              </div>
            </div>
          </div>

          {/* Mode Highlights */}
          <div>
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>注目のゲームモード</span>
            </h4>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-cyan-300 mb-0.5">
                  2 VS 2 タッグバトル（協力モード）
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  あなたとお気に入りのNPCがコンビを結成！味方NPCは逆サイドをカバーし、パスを出したりゴール前に立ちはだかります。試合中にはリアルタイムで掛け合いボイスが表示されます！
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-rose-300 mb-0.5">
                  DOUBLE PUCK（ダブルパック・カオス）
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  パックが2個同時にコートを跳ね回ります。パック同士が空中で正面衝突する特殊物理演算も搭載！
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-amber-300 mb-0.5">
                  🎱 NEON BILLIARDS（ネオン・ビリヤード）
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  白玉を引いて狙い撃ち、カラフルな球を連鎖させて6つのポケットへ叩き込め！1vs1なら交互、2vs2なら自分→敵1→味方→敵2の4名交代制で本格ビリヤードバトル！
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-cyan-300 mb-0.5">
                  🥌 NEON CURLING（ネオン・カーリング）
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  氷上リンクにストーンを滑らせて奥の同心円ハウス（🎯）の中心を狙え！滑走中長押しスウィープや相手ストーンを弾き飛ばすテイクアウトで勝負！
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-pink-300 mb-0.5">
                  🌈 NEON MULTI BALL（マルチボール・パニック）
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  中央のジェネレーターから大量のカラーボールが湧き出す！押し寄せるネオンボールを相手ゴールへどんどん押し込んで連続得点を狙え！
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-emerald-300 mb-0.5">
                  TARGET BREAK（ターゲット破壊）
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  コート上にランダムに出現する六角形ターゲットにパックを当てると粉砕ボーナス獲得！
                </p>
              </div>
            </div>
          </div>

          {/* Character AI */}
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-200 leading-relaxed">
            💡 <strong className="text-cyan-300">キャラクターAIの個性：</strong>
            みりんてゃは超攻撃的に前に飛び出し、ももかはパワースマッシュ、ゆたかくんは鉄壁の守備、さえちゃんは脱力フェイントなど、キャラクターごとに全く異なる戦術で動きます！
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
