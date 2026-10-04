'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { GameMode, TeamFormat, GameState, MatchConfig, MatchStats, InGameSpeech } from '@/lib/types';
import ModeSelectModal from '@/components/ModeSelectModal';
import MatchSetupModal from '@/components/MatchSetupModal';
import CharacterRosterModal from '@/components/CharacterRosterModal';
import HowToPlayModal from '@/components/HowToPlayModal';
import GameOverModal from '@/components/GameOverModal';
import NeonArenaCanvas from '@/components/NeonArenaCanvas';
import NeonBilliardsCanvas from '@/components/NeonBilliardsCanvas';
import NeonCurlingCanvas from '@/components/NeonCurlingCanvas';
import GameHUD from '@/components/GameHUD';
import SpeechOverlay from '@/components/SpeechOverlay';
import { preloadCharacterImages } from '@/lib/imageCache';
import { Sparkles, Trophy, BookOpen, RotateCcw, Play, Swords } from 'lucide-react';

export default function HomePage() {
  // Navigation & Game State Machine
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [selectedTeamFormat, setSelectedTeamFormat] = useState<TeamFormat>('2v2');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');

  // Preload all character PNG images on app start
  useEffect(() => {
    preloadCharacterImages();
  }, []);

  // Match Configuration with persistence
  const [matchConfig, setMatchConfig] = useState<MatchConfig>(() => {
    let savedAlly = 'mirin';
    let savedOpp1 = 'yutaka';
    let savedOpp2 = 'yuma';
    let savedPlayer = 'あなた';

    let savedGoalCountdown = false;

    if (typeof window !== 'undefined') {
      savedAlly = localStorage.getItem('neon_hockey_selected_allyId') || 'mirin';
      savedOpp1 = localStorage.getItem('neon_hockey_selected_opponent1Id') || 'yutaka';
      savedOpp2 = localStorage.getItem('neon_hockey_selected_opponent2Id') || 'yuma';
      savedPlayer = localStorage.getItem('neon_hockey_player_name') || 'あなた';
      savedGoalCountdown = localStorage.getItem('neon_hockey_goal_countdown') === 'true';
    }

    return {
      teamFormat: '2v2',
      mode: 'classic',
      targetScore: 7,
      timeLimitSeconds: 60,
      playerName: savedPlayer,
      playerColor: '#06b6d4',
      allyId: savedAlly,
      opponent1Id: savedOpp1,
      opponent2Id: savedOpp2,
      difficulty: 'normal',
      goalCountdown: savedGoalCountdown,
    };
  });

  // In-Game Real-time State
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState<InGameSpeech | null>(null);
  const speechTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Match Completion State
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [matchWon, setMatchWon] = useState(false);

  // Modals
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  // Handle Character In-game Speech (100% stable reference)
  const handleSpeech = useCallback((speech: InGameSpeech) => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    setCurrentSpeech(speech);
    speechTimeoutRef.current = setTimeout(() => {
      setCurrentSpeech(null);
    }, speech.timeRemaining || 3500);
  }, []);

  // Goal Scored Handler
  const handleGoalScored = (pScore: number, oScore: number) => {
    setPlayerScore(pScore);
    setOpponentScore(oScore);
  };

  // Match Completed Handler
  const handleMatchComplete = useCallback((stats: MatchStats, won: boolean) => {
    setMatchStats(stats);
    setMatchWon(won);
    setGameState('GAMEOVER');
  }, []);

  // Start Match
  const handleStartMatch = (config: MatchConfig) => {
    setMatchConfig(config);
    setPlayerScore(0);
    setOpponentScore(0);
    setIsPaused(false);
    setCurrentSpeech(null);
    setGameState('PLAYING');
  };

  // Rematch
  const handleRematch = () => {
    setPlayerScore(0);
    setOpponentScore(0);
    setIsPaused(false);
    setCurrentSpeech(null);
    setGameState('PLAYING');
  };

  // Toggle goal countdown tempo setting dynamically
  const handleToggleGoalCountdown = useCallback(() => {
    setMatchConfig((prev) => {
      const nextVal = !prev.goalCountdown;
      if (typeof window !== 'undefined') {
        localStorage.setItem('neon_hockey_goal_countdown', String(nextVal));
      }
      return { ...prev, goalCountdown: nextVal };
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#16113b] via-[#080b1d] to-[#02030a] text-slate-100 flex flex-col selection:bg-cyan-500/40 relative overflow-x-hidden cyber-grid">
      {/* Ambient cyber neon glow spots with enhanced vivid saturation */}
      <div className="fixed -top-32 -left-32 w-[32rem] h-[32rem] bg-cyan-400/20 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/4 -right-32 w-[30rem] h-[30rem] bg-fuchsia-500/20 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed -bottom-32 left-1/4 w-[36rem] h-[36rem] bg-violet-600/20 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-cyan-900/40 bg-[#060914]/85 backdrop-blur-md sticky top-0 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => setGameState('TITLE')}
          className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-pink-400 to-amber-300 hover:opacity-95 transition-opacity neon-glow-cyan"
        >
          NEON HOCKEY
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <button
            onClick={() => setGameState('TITLE')}
            className={`hover:text-cyan-300 transition-colors ${gameState === 'TITLE' ? 'text-cyan-400 font-bold' : ''}`}
          >
            モード選択
          </button>
          <button
            onClick={() => setIsRosterOpen(true)}
            className="hover:text-cyan-300 transition-colors"
          >
            キャラクター図鑑
          </button>
          <button
            onClick={() => setIsHowToPlayOpen(true)}
            className="hover:text-cyan-300 transition-colors"
          >
            遊び方 &amp; ルール
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3">
          {gameState === 'PLAYING' ? (
            <button
              onClick={() => setGameState('SETUP')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              設定へ戻る
            </button>
          ) : (
            <button
              onClick={() => setIsRosterOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-800/80 rounded-lg hover:bg-cyan-900/60 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>全18キャラ一覧</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center py-1 sm:py-3 px-2 sm:px-4 max-w-full overflow-x-hidden">
        {/* State 1: Mode Select (Title) */}
        {gameState === 'TITLE' && (
          <ModeSelectModal
            selectedTeamFormat={selectedTeamFormat}
            onSelectTeamFormat={setSelectedTeamFormat}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            onNext={() => {
              setMatchConfig((prev) => ({
                ...prev,
                teamFormat: selectedTeamFormat,
                mode: selectedMode,
                targetScore: selectedTeamFormat === '2v2' ? 7 : 5,
              }));
              setGameState('SETUP');
            }}
            onOpenRoster={() => setIsRosterOpen(true)}
          />
        )}

        {/* State 2: Match Setup */}
        {gameState === 'SETUP' && (
          <MatchSetupModal
            teamFormat={selectedTeamFormat}
            mode={selectedMode}
            initialConfig={matchConfig}
            onBack={() => setGameState('TITLE')}
            onStartMatch={handleStartMatch}
          />
        )}

        {/* State 3: Active Playing Match */}
        {gameState === 'PLAYING' && (
          <div className="w-full max-w-4xl flex flex-col items-center justify-center">
            {/* Live Character Speech Overlay */}
            <SpeechOverlay speech={currentSpeech} />

            {/* In-Game Top HUD */}
            <GameHUD
              config={matchConfig}
              playerScore={playerScore}
              opponentScore={opponentScore}
              isPaused={isPaused}
              onTogglePause={() => setIsPaused((p) => !p)}
              onRestart={() => {
                setPlayerScore(0);
                setOpponentScore(0);
              }}
              onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
              onToggleGoalCountdown={handleToggleGoalCountdown}
            />

            {/* Game Canvas (Hockey / Billiards / Curling) */}
            {matchConfig.mode === 'billiards' ? (
              <NeonBilliardsCanvas
                key={`billiards-${matchConfig.teamFormat}-${matchConfig.opponent1Id}-${matchConfig.allyId || 'none'}`}
                config={matchConfig}
                isPaused={isPaused}
                onGoalScored={handleGoalScored}
                onMatchComplete={handleMatchComplete}
                onSpeech={handleSpeech}
              />
            ) : matchConfig.mode === 'curling' ? (
              <NeonCurlingCanvas
                key={`curling-${matchConfig.teamFormat}-${matchConfig.opponent1Id}-${matchConfig.allyId || 'none'}`}
                config={matchConfig}
                isPaused={isPaused}
                onGoalScored={handleGoalScored}
                onMatchComplete={handleMatchComplete}
                onSpeech={handleSpeech}
              />
            ) : (
              <NeonArenaCanvas
                key={`${matchConfig.mode}-${matchConfig.teamFormat}-${matchConfig.opponent1Id}-${matchConfig.allyId || 'none'}`}
                config={matchConfig}
                isPaused={isPaused}
                onGoalScored={handleGoalScored}
                onMatchComplete={handleMatchComplete}
                onSpeech={handleSpeech}
              />
            )}

            {/* Pause Screen Overlay */}
            {isPaused && (
              <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xs w-full shadow-2xl space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 mb-1">一時停止中</h3>
                    <p className="text-xs text-slate-400">ゲームがポーズされています</p>
                  </div>

                  {/* Goal Restart Tempo Setting inside Pause Menu */}
                  {matchConfig.mode !== 'billiards' && matchConfig.mode !== 'curling' && (
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-left space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>ゴール後のテンポ</span>
                        <span className="text-[10px] text-cyan-400 font-mono">
                          {!matchConfig.goalCountdown ? '即リスタート' : '毎回カウント'}
                        </span>
                      </div>
                      <button
                        onClick={handleToggleGoalCountdown}
                        className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                          !matchConfig.goalCountdown
                            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                            : 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                        }`}
                      >
                        <span>{!matchConfig.goalCountdown ? '⚡ 即リスタート（テンポ◎）' : '⏱️ 毎回カウントダウン'}</span>
                        <span className="text-[10px] opacity-70">変更</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => setIsPaused(false)}
                      className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                    >
                      ゲームを再開
                    </button>
                    <button
                      onClick={() => setGameState('SETUP')}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                    >
                      対戦設定へ戻る
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* State 4: Game Over */}
        {gameState === 'GAMEOVER' && matchStats && (
          <GameOverModal
            config={matchConfig}
            stats={matchStats}
            won={matchWon}
            onRematch={handleRematch}
            onReturnToSetup={() => setGameState('SETUP')}
          />
        )}
      </main>

      {/* Character Roster Encyclopedia Modal */}
      {isRosterOpen && (
        <CharacterRosterModal onClose={() => setIsRosterOpen(false)} />
      )}

      {/* How To Play Modal */}
      {isHowToPlayOpen && (
        <HowToPlayModal onClose={() => setIsHowToPlayOpen(false)} />
      )}

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-slate-900 text-center text-xs text-slate-600">
        NEON HOCKEY: CHARACTER ARENA · Cyber Arcade Experience
      </footer>
    </div>
  );
}
