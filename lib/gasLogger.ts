import { MatchConfig, MatchStats } from './types';
import { GET_CHARACTER_BY_ID } from './characters';

/**
 * Google Apps Script (GAS) Web App endpoint URL.
 * Automatically posts match result records to Mitsuki's Google Sheet.
 */
export const GAS_WEBAPP_URL =
  process.env.NEXT_PUBLIC_GAS_WEBAPP_URL ||
  'https://script.google.com/macros/s/AKfycbzOthWOpS9dQYCArlPU6PiGQAabOYfPtfJL7p17mDfexVQZ1YSQNFAmOq2TgP20iBKw/exec';

export interface MatchLogPayload {
  timestamp: string;
  mode: string;
  teamFormat: string;
  result: 'VICTORY' | 'DEFEAT' | 'DRAW';
  playerGoals: number;
  opponentGoals: number;
  playerName: string;
  allyName: string;
  opponent1Name: string;
  opponent2Name: string;
  matchDurationSec: number;
  longestRally: number;
  superSmashes: number;
  targetsHit: number;
  device: string;
}

/**
 * Silently logs match completion data to Google Sheets via GAS Web App.
 * Uses text/plain and no-cors mode to avoid preflight/CORS issues with Google Script redirects.
 * Does NOT display any telemetry or notification in the UI.
 */
export function logMatchToGAS(
  config: MatchConfig,
  stats: MatchStats,
  won: boolean
) {
  if (!GAS_WEBAPP_URL) {
    // Silently return if no URL has been configured yet
    return;
  }

  try {
    const isDraw = stats.playerGoals === stats.opponentGoals;
    const result: 'VICTORY' | 'DEFEAT' | 'DRAW' = isDraw
      ? 'DRAW'
      : won
      ? 'VICTORY'
      : 'DEFEAT';

    const is2v2 = config.teamFormat === '2v2' || config.mode === '2v2';
    const allyName = is2v2 && config.allyId ? GET_CHARACTER_BY_ID(config.allyId).name : '—';
    const opp1Name = config.opponent1Id ? GET_CHARACTER_BY_ID(config.opponent1Id).name : '—';
    const opp2Name = is2v2 && config.opponent2Id ? GET_CHARACTER_BY_ID(config.opponent2Id).name : '—';

    const isMobile =
      typeof window !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

    const payload: MatchLogPayload = {
      timestamp: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      mode: config.mode,
      teamFormat: is2v2 ? '2vs2' : '1vs1',
      result,
      playerGoals: stats.playerGoals,
      opponentGoals: stats.opponentGoals,
      playerName: config.playerName || 'あなた',
      allyName,
      opponent1Name: opp1Name,
      opponent2Name: opp2Name,
      matchDurationSec: stats.matchDurationSec,
      longestRally: stats.longestRally,
      superSmashes: stats.superSmashes,
      targetsHit: stats.targetsHit,
      device: isMobile ? 'Mobile' : 'PC',
    };

    const body = JSON.stringify(payload);

    // Prefer non-blocking background transmission (fetch with text/plain, no-cors)
    if (typeof fetch !== 'undefined') {
      fetch(GAS_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body,
      }).catch(() => {
        // Fallback to GET beacon if POST fails
        try {
          const enc = encodeURIComponent(body);
          const img = new Image();
          img.src = `${GAS_WEBAPP_URL}?payload=${enc}`;
        } catch {
          // ignore
        }
      });
    } else if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'text/plain' });
      navigator.sendBeacon(GAS_WEBAPP_URL, blob);
    }
  } catch {
    // Silently ignore any runtime exception
  }
}
