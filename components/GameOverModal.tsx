'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { MatchStats, MatchConfig, Character } from '@/lib/types';
import { GET_CHARACTER_BY_ID } from '@/lib/characters';
import {
  Trophy,
  RotateCcw,
  ArrowLeft,
  Zap,
  Target,
  Flame,
  Clock,
  Share2,
  Download,
  Image as ImageIcon,
  Check,
  Sparkles,
  X,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import CharacterAvatar from './CharacterAvatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCachedCharacterImage, getCachedCharacterBlobUrl } from '@/lib/imageCache';

interface GameOverModalProps {
  config: MatchConfig;
  stats: MatchStats;
  won: boolean;
  onRematch: () => void;
  onReturnToSetup: () => void;
}

// Helper to safely load character PNG image without CORS issues for same-origin assets
function loadCharacterImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new window.Image();
    // Only set crossOrigin for external absolute URLs, not for local /characters/*.png or blob:
    if (!src.startsWith('/') && !src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (img.naturalWidth > 1) {
        resolve(img);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
    if (img.complete && img.naturalWidth > 1) {
      resolve(img);
    }
  });
}

// Generate high-resolution result card image on HTML5 Canvas (async to load character PNGs!)
async function drawResultCardCanvas(
  config: MatchConfig,
  stats: MatchStats,
  won: boolean,
  dialogueList: { char: Character; role: 'ally' | 'opponent'; quote: string }[]
): Promise<string> {
  if (typeof document === 'undefined') return '';

  // 1. Pre-load all character PNGs in parallel using cache first
  const imagePromises = dialogueList.map(async (d) => {
    const cached = getCachedCharacterImage(d.char.id);
    if (cached && cached.naturalWidth > 1) {
      return { id: d.char.id, img: cached };
    }
    const blobUrl = getCachedCharacterBlobUrl(d.char.id);
    const src = blobUrl || d.char.imagePath || `/characters/${d.char.id}.png`;
    const img = await loadCharacterImage(src);
    return { id: d.char.id, img };
  });

  const loadedList = await Promise.all(imagePromises);
  const imageMap = new Map<string, HTMLImageElement | null>(
    loadedList.map((item) => [item.id, item.img])
  );

  const canvas = document.createElement('canvas');
  const W = 900;
  const H = 1260;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 2. Rich cyber neon gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, won ? '#141838' : '#280f24');
  bgGrad.addColorStop(0.3, '#0e1224');
  bgGrad.addColorStop(0.7, '#070b16');
  bgGrad.addColorStop(1, won ? '#062033' : '#1b0c16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 3. Ambient neon glow
  const glow = ctx.createRadialGradient(W / 2, 130, 20, W / 2, 130, 360);
  glow.addColorStop(0, won ? 'rgba(6, 182, 212, 0.28)' : 'rgba(244, 63, 94, 0.28)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 420);

  // 4. Glowing neon outer border
  ctx.save();
  ctx.strokeStyle = won ? '#06b6d4' : '#f43f5e';
  ctx.lineWidth = 4;
  ctx.shadowColor = won ? 'rgba(6, 182, 212, 0.8)' : 'rgba(244, 63, 94, 0.8)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.roundRect(24, 24, W - 48, H - 48, 24);
  ctx.stroke();
  ctx.restore();

  // 5. Header title
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('NEON HOCKEY: CHARACTER ARENA', W / 2, 75);

  ctx.font = '900 46px sans-serif';
  ctx.fillStyle = won ? '#38bdf8' : '#fb7185';
  ctx.shadowColor = won ? 'rgba(56, 189, 248, 0.8)' : 'rgba(251, 113, 133, 0.8)';
  ctx.shadowBlur = 18;
  ctx.fillText(won ? 'VICTORY MATCH!' : 'GAME OVER', W / 2, 128);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(
    won ? `${config.playerName || 'あなた'} チームの完全勝利！` : '激闘！次こそリベンジを果たそう！',
    W / 2,
    164
  );
  ctx.restore();

  // 6. Scoreboard Box
  ctx.save();
  const boxX = 60;
  const boxY = 195;
  const boxW = W - 120;
  const boxH = 175;
  ctx.fillStyle = 'rgba(5, 8, 18, 0.85)';
  ctx.strokeStyle = won ? 'rgba(6, 182, 212, 0.35)' : 'rgba(244, 63, 94, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 20);
  ctx.fill();
  ctx.stroke();

  // Mode label
  const is2v2 = config.teamFormat === '2v2' || config.mode === '2v2';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(is2v2 ? '— 2 VS 2 TAG MATCH —' : '— 1 VS 1 DUEL MATCH —', W / 2, boxY + 34);

  // Scores
  ctx.font = '900 78px monospace';
  ctx.fillStyle = '#06b6d4';
  ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillText(String(stats.playerGoals), W / 2 - 130, boxY + 115);

  ctx.fillStyle = '#64748b';
  ctx.shadowBlur = 0;
  ctx.font = 'bold 48px monospace';
  ctx.fillText(':', W / 2, boxY + 105);

  ctx.fillStyle = '#f43f5e';
  ctx.shadowColor = 'rgba(244, 63, 94, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillText(String(stats.opponentGoals), W / 2 + 130, boxY + 115);

  ctx.shadowBlur = 0;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'center';
  ctx.fillText(`${config.playerName || 'あなた'} チーム`, W / 2 - 130, boxY + 152);
  ctx.fillText('相手チーム', W / 2 + 130, boxY + 152);
  ctx.restore();

  // 7. Stats Grid
  const statsY = 395;
  const statBoxW = (W - 120 - 36) / 4;
  const statItems = [
    { label: '最長ラリー', val: `${stats.longestRally}回`, color: '#38bdf8' },
    { label: '強打スマッシュ', val: `${stats.superSmashes}回`, color: '#fb7185' },
    { label: 'ターゲット破壊', val: `${stats.targetsHit}回`, color: '#fbbf24' },
    { label: '試合時間', val: `${stats.matchDurationSec}秒`, color: '#34d399' },
  ];

  statItems.forEach((st, idx) => {
    const sx = 60 + idx * (statBoxW + 12);
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(sx, statsY, statBoxW, 76, 14);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText(st.label, sx + statBoxW / 2, statsY + 28);

    ctx.fillStyle = st.color;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(st.val, sx + statBoxW / 2, statsY + 58);
    ctx.restore();
  });

  // 8. Character Post-Match Dialogue
  const dialogueY = 505;
  ctx.save();
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('💬 キャラクターからの試合後コメント', 60, dialogueY);
  ctx.restore();

  let curY = dialogueY + 20;
  dialogueList.forEach((d) => {
    const cardH = 118;
    ctx.save();
    ctx.fillStyle = d.role === 'ally' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(244, 63, 94, 0.08)';
    ctx.strokeStyle = d.role === 'ally' ? 'rgba(6, 182, 212, 0.45)' : 'rgba(244, 63, 94, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(60, curY, W - 120, cardH, 18);
    ctx.fill();
    ctx.stroke();

    // Render character PNG avatar if available, or fallback to theme circle + emoji!
    const charImg = imageMap.get(d.char.id);
    const avX = 110;
    const avY = curY + 48;
    const avR = 30;

    if (charImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX, avY, avR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(charImg, avX - avR, avY - avR, avR * 2, avR * 2);
      ctx.restore();

      // Glowing border ring
      ctx.save();
      ctx.strokeStyle = d.char.accentColor || d.char.themeColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = d.char.themeColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(avX, avY, avR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = d.char.themeColor;
      ctx.beginPath();
      ctx.arc(avX, avY, avR, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.char.avatarEmoji.slice(0, 2), avX, avY + 9);
    }

    // Name & role
    ctx.textAlign = 'left';
    ctx.font = 'bold 23px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(d.char.name, 155, curY + 38);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = d.role === 'ally' ? '#38bdf8' : '#fb7185';
    ctx.fillText(d.role === 'ally' ? '[味方タッグ]' : '[対戦相手]', 155 + ctx.measureText(d.char.name).width + 12, curY + 36);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${d.char.fullName} (${d.char.grade})`, 155, curY + 62);

    ctx.font = 'italic 16px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    const quoteText = `「${d.quote}」`;
    ctx.fillText(quoteText, 155, curY + 92);

    ctx.restore();
    curY += cardH + 14;
  });

  // 9. Footer
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '14px monospace';
  ctx.fillStyle = '#64748b';
  const dateStr = new Date().toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });
  ctx.fillText(`${dateStr} · NEON HOCKEY: CHARACTER ARENA · #ネオンホッケー`, W / 2, H - 35);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

// Dedicated Modal for Long-Press Image Saving (Especially for mobile)
function LongPressSaveModal({
  imageSrc,
  onClose,
  onDownload,
}: {
  imageSrc: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-slate-100">リザルト画像の保存</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto overscroll-contain p-5 space-y-4 flex-1">
          {/* Mobile Instruction */}
          <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-200 flex items-start gap-2.5">
            <span className="text-base shrink-0">📱</span>
            <div className="leading-relaxed">
              <span className="font-bold text-white block mb-0.5">スマートフォンでの保存方法</span>
              下の画像を<strong className="text-cyan-300">長押し</strong>して、メニューから<strong className="text-cyan-300">「写真に追加」</strong>または<strong className="text-cyan-300">「画像を保存」</strong>を選択してください。
            </div>
          </div>

          {/* Rendered Image */}
          <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Neon Hockey Match Result"
              className="w-full h-auto object-contain select-auto pointer-events-auto"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              onClick={onDownload}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>ファイル直接ダウンロード (PC用)</span>
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GameOverModal({
  config,
  stats,
  won,
  onRematch,
  onReturnToSetup,
}: GameOverModalProps) {
  const isMobile = useIsMobile();
  const [shareToast, setShareToast] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    if (won) {
      sound.playWin();
    } else {
      sound.playLose();
    }
  }, [won]);

  const is2v2 = config.teamFormat === '2v2' || config.mode === '2v2';

  // Determine post-match dialogue based on match result (who won vs lost)
  const dialogueQuotes = useMemo(() => {
    const getQuote = (arr?: string[], seed = 0) => {
      if (!arr || arr.length === 0) return '…！';
      const hash = Math.abs(stats.playerGoals * 11 + stats.opponentGoals * 17 + stats.longestRally * 5 + seed);
      return arr[hash % arr.length];
    };

    const list: { char: Character; role: 'ally' | 'opponent'; quote: string }[] = [];

    // Ally character (if 2v2)
    if (is2v2 && config.allyId) {
      const ally = GET_CHARACTER_BY_ID(config.allyId);
      list.push({
        char: ally,
        role: 'ally',
        quote: won ? getQuote(ally.quotes.victory, 1) : getQuote(ally.quotes.defeat, 1),
      });
    }

    // Opponent 1
    if (config.opponent1Id) {
      const opp1 = GET_CHARACTER_BY_ID(config.opponent1Id);
      list.push({
        char: opp1,
        role: 'opponent',
        quote: won ? getQuote(opp1.quotes.defeat, 2) : getQuote(opp1.quotes.victory, 2),
      });
    }

    // Opponent 2 (if 2v2)
    if (is2v2 && config.opponent2Id) {
      const opp2 = GET_CHARACTER_BY_ID(config.opponent2Id);
      list.push({
        char: opp2,
        role: 'opponent',
        quote: won ? getQuote(opp2.quotes.defeat, 3) : getQuote(opp2.quotes.victory, 3),
      });
    }

    return list;
  }, [config, is2v2, stats, won]);

  // Handle Share Navigation
  const handleShare = async () => {
    const shareText = `【NEON HOCKEY】${won ? '見事勝利！🎉' : '熱戦終了！🔥'} スコア: ${stats.playerGoals} - ${stats.opponentGoals} (${is2v2 ? '2vs2タッグ' : '1vs1'})！ #ネオンホッケー`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'NEON HOCKEY: CHARACTER ARENA',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 3000);
      } catch (err) {
        console.error('Clipboard copy failed', err);
      }
    }
  };

  // Direct download handler
  const handleDirectDownload = (dataUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `neon-hockey-result-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Image Button Click (Async to properly render uploaded character PNGs!)
  const handleSaveImageClick = async () => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const dataUrl = await drawResultCardCanvas(config, stats, won, dialogueQuotes);
      setImageDataUrl(dataUrl);

      if (isMobile) {
        // Open long-press modal for mobile
        setSaveModalOpen(true);
      } else {
        // Directly download on PC
        handleDirectDownload(dataUrl);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
        <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-[0_0_60px_rgba(6,182,212,0.15)] overflow-hidden">
          {/* Top Glow Ribbon */}
          <div
            className={`h-1.5 w-full shrink-0 ${
              won
                ? 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                : 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)]'
            }`}
          />

          {/* Scrollable Modal Body */}
          <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:p-6 space-y-4 flex-1">
            {/* Victory / Defeat Header */}
            <div className="text-center">
              <div
                className="inline-flex p-3 rounded-2xl mb-2.5 shadow-lg border"
                style={{
                  backgroundColor: won ? 'rgba(6, 182, 212, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  borderColor: won ? 'rgba(6, 182, 212, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                  color: won ? '#38bdf8' : '#fb7185',
                }}
              >
                <Trophy className="w-8 h-8" />
              </div>

              <h2
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  won
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-300 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                }`}
              >
                {won ? 'VICTORY MATCH!' : 'GAME OVER'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                {won
                  ? `${config.playerName || 'あなた'}のチームが勝利しました！`
                  : '惜しい！次はリベンジを果たそう！'}
              </p>
            </div>

            {/* Final Scoreboard */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
              <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1 text-center">
                FINAL SCORE ({is2v2 ? '2 VS 2 TAG' : '1 VS 1 DUEL'})
              </div>
              <div className="flex items-center justify-center gap-6 text-4xl sm:text-5xl font-black font-mono">
                <div className="text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                  {stats.playerGoals}
                </div>
                <div className="text-slate-600 text-2xl font-normal">:</div>
                <div className="text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]">
                  {stats.opponentGoals}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 mt-2 px-3 border-t border-slate-800/80 pt-2 font-medium">
                <span className="text-cyan-300 font-bold">{config.playerName || 'あなた'} 側</span>
                <span className="font-mono text-slate-500 text-[10px]">VS</span>
                <span className="text-rose-300 font-bold">相手チーム</span>
              </div>
            </div>

            {/* Match Statistics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> 最長ラリー
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {stats.longestRally}回
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Flame className="w-3.5 h-3.5 text-rose-400" /> 強打スマッシュ
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {stats.superSmashes}回
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> ターゲット破壊
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {stats.targetsHit}回
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> 試合時間
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {stats.matchDurationSec}秒
                </span>
              </div>
            </div>

            {/* Character Post-Match Dialogue */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>試合後キャラクターコメント</span>
              </div>

              <div className="space-y-2">
                {dialogueQuotes.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-start gap-3 transition-all ${
                      item.role === 'ally'
                        ? 'bg-cyan-950/30 border-cyan-800/60 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                        : 'bg-rose-950/20 border-rose-900/60 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                    }`}
                  >
                    <CharacterAvatar character={item.char} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {/* Hiragana name prominently highlighted */}
                        <span className="text-sm font-black text-slate-100">
                          {item.char.name}
                        </span>
                        <span className="text-[11px] font-medium text-slate-300">
                          {item.char.fullName}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ml-auto ${
                            item.role === 'ally'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}
                        >
                          {item.role === 'ally' ? '味方' : '相手'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 italic leading-relaxed bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
                        「{item.quote}」
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Share & Save Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleShare}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700 hover:border-cyan-400 cursor-pointer"
              >
                {shareToast ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">コピー完了！</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span>結果を共有</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSaveImageClick}
                disabled={isGeneratingImage}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700 hover:border-cyan-400 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
                    <span>画像生成中...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 text-pink-400" />
                    <span>{isMobile ? '画像を保存' : '画像保存 (DL)'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Navigation Actions */}
            <div className="space-y-2 pt-1">
              <button
                onClick={onRematch}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>同じ編成でもう一度プレイ</span>
              </button>

              <button
                onClick={onReturnToSetup}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>モード・キャラクターを変更する</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Long-press Save Modal for mobile or preview */}
      {saveModalOpen && (
        <LongPressSaveModal
          imageSrc={imageDataUrl}
          onClose={() => setSaveModalOpen(false)}
          onDownload={() => handleDirectDownload(imageDataUrl)}
        />
      )}
    </>
  );
}
