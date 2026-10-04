'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MatchConfig, Mallet, Puck, Bumper, TargetNode, Particle, InGameSpeech, MatchStats, BilliardPocket, BilliardBall } from '@/lib/types';
import { GET_CHARACTER_BY_ID } from '@/lib/characters';
import { sound } from '@/lib/audio';

interface NeonArenaCanvasProps {
  config: MatchConfig;
  isPaused: boolean;
  onGoalScored: (playerScore: number, opponentScore: number, lastScorer: 'player' | 'opponent') => void;
  onMatchComplete: (stats: MatchStats, won: boolean) => void;
  onSpeech: (speech: InGameSpeech) => void;
}

const ARENA_WIDTH = 600;
const ARENA_HEIGHT = 900;
const GOAL_WIDTH = 220;
const GOAL_LEFT = (ARENA_WIDTH - GOAL_WIDTH) / 2; // 190
const GOAL_RIGHT = GOAL_LEFT + GOAL_WIDTH;       // 410
const MALLET_RADIUS = 40; // Enlarged mallet (diameter 80px)
const PUCK_RADIUS = 22;   // Enlarged puck (diameter 44px)
const MAX_PUCK_SPEED = 22;

export default function NeonArenaCanvas({
  config,
  isPaused,
  onGoalScored,
  onMatchComplete,
  onSpeech,
}: NeonArenaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Match score state
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [remainingTime, setRemainingTime] = useState(config.timeLimitSeconds || 60);

  // Stable references
  const scoresRef = useRef({ player: 0, opponent: 0 });
  const onSpeechRef = useRef(onSpeech);
  useEffect(() => {
    onSpeechRef.current = onSpeech;
  }, [onSpeech]);

  // Game entities refs
  const malletsRef = useRef<Mallet[]>([]);
  const pucksRef = useRef<Puck[]>([]);
  const bumpersRef = useRef<Bumper[]>([]);
  const targetsRef = useRef<TargetNode[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const goalCooldownRef = useRef<number>(0);
  const goalBannerRef = useRef<{ text: string; color: string; timer: number } | null>(null);
  const rallyRef = useRef<number>(0);
  const lastSmashSpeechTimeRef = useRef<number>(0);

  // Multi-Ball specific state refs & match over state
  const multiBallTimerRef = useRef<number>(0);
  const cornerTrapCounterRef = useRef<Record<string, number>>({});
  const matchOverTriggeredRef = useRef<boolean>(false);

  // Countdown state: 3 -> 2 -> 1 -> GO!
  const countdownRef = useRef<{ step: number; timer: number; active: boolean; label: string }>({
    step: 3,
    timer: 45,
    active: true,
    label: '3',
  });

  // Track match performance statistics
  const statsRef = useRef<{
    totalShots: number;
    superSmashes: number;
    targetsHit: number;
    longestRally: number;
    startTime: number;
  }>({
    totalShots: 0,
    superSmashes: 0,
    targetsHit: 0,
    longestRally: 0,
    startTime: 0,
  });

  // Image cache for mallets
  const imagesCacheRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const idsToPreload = [config.opponent1Id];
    if (config.opponent2Id) idsToPreload.push(config.opponent2Id);
    if (config.allyId) idsToPreload.push(config.allyId);

    idsToPreload.forEach((id) => {
      if (!imagesCacheRef.current[id]) {
        const img = new Image();
        img.src = `/characters/${id}.png`;
        imagesCacheRef.current[id] = img;
      }
    });
  }, [config.opponent1Id, config.opponent2Id, config.allyId]);

  // Pointer position tracker
  const pointerPosRef = useRef<{ x: number; y: number; active: boolean }>({
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT * 0.82,
    active: false,
  });

  // Keyboard navigation
  const keysDownRef = useRef<Record<string, boolean>>({});

  // Trigger character speech
  const triggerSpeech = useCallback(
    (charId: string, type: 'start' | 'goalScored' | 'goalConceded' | 'allyPass' | 'allySave' | 'intenseRally' | 'smash') => {
      const char = GET_CHARACTER_BY_ID(charId);
      const quotes = char.quotes[type];
      if (!quotes || quotes.length === 0) return;

      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      onSpeechRef.current({
        id: `speech-${Date.now()}-${Math.random()}`,
        character: char,
        text: randomQuote,
        timeRemaining: 3400,
        isAlly: charId === config.allyId,
      });
    },
    [config.allyId]
  );

  // Particle emission helper
  const emitSparks = (x: number, y: number, color: string, count: number = 10, speedMult: number = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1.5) * speedMult;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 15,
      });
    }
  };

  // Match Completion Handler without flicker or race conditions
  const triggerMatchEnd = useCallback(
    (won: boolean, pFinal: number, oFinal: number) => {
      if (matchOverTriggeredRef.current) return;
      matchOverTriggeredRef.current = true;
      countdownRef.current.active = false;
      goalCooldownRef.current = 9999;
      goalBannerRef.current = {
        text: won ? 'VICTORY! MATCH FINISHED!' : 'MATCH FINISHED!',
        color: won ? '#06b6d4' : '#f43f5e',
        timer: 300,
      };
      pucksRef.current.forEach((p) => {
        p.vx = 0;
        p.vy = 0;
      });

      const matchDurationSec = Math.max(1, Math.floor((Date.now() - (statsRef.current.startTime || Date.now())) / 1000));
      setTimeout(() => {
        onMatchComplete(
          {
            playerGoals: pFinal,
            opponentGoals: oFinal,
            totalShots: statsRef.current.totalShots,
            superSmashes: statsRef.current.superSmashes,
            targetsHit: statsRef.current.targetsHit,
            longestRally: statsRef.current.longestRally,
            currentRally: rallyRef.current,
            matchDurationSec,
            mvpName: won ? (config.playerName || 'あなた') : GET_CHARACTER_BY_ID(config.opponent1Id).name,
            mvpColor: won ? (config.playerColor || '#06b6d4') : GET_CHARACTER_BY_ID(config.opponent1Id).themeColor,
          },
          won
        );
      }, 850);
    },
    [config, onMatchComplete]
  );

  // Initialize Game Board
  const initBoard = useCallback(() => {
    const is2v2 = config.teamFormat === '2v2' || config.mode === '2v2';
    const isDoublePuck = config.mode === 'double_puck';
    const hasBumpers = config.mode === 'bumpers';
    const hasTargets = config.mode === 'target_break';
    const isMultiBall = config.mode === 'multi_ball';

    // 1. Initialize Mallets (Enlarged diameter 80px)
    const mallets: Mallet[] = [];

    // Player mallet (Bottom)
    mallets.push({
      id: 'player',
      isPlayer: true,
      isTeamPlayer: true,
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT * 0.82,
      prevX: ARENA_WIDTH / 2,
      prevY: ARENA_HEIGHT * 0.82,
      vx: 0,
      vy: 0,
      radius: MALLET_RADIUS,
      mass: 5,
      color: config.playerColor || '#06b6d4',
    });

    // Ally Mallet (if 2v2)
    if (is2v2 && config.allyId) {
      const allyChar = GET_CHARACTER_BY_ID(config.allyId);
      mallets.push({
        id: 'ally',
        isPlayer: false,
        isTeamPlayer: true,
        character: allyChar,
        x: ARENA_WIDTH * 0.28,
        y: ARENA_HEIGHT * 0.65,
        prevX: ARENA_WIDTH * 0.28,
        prevY: ARENA_HEIGHT * 0.65,
        vx: 0,
        vy: 0,
        radius: MALLET_RADIUS,
        mass: 5,
        color: allyChar.themeColor,
      });
    }

    // Opponent 1
    const opp1Char = GET_CHARACTER_BY_ID(config.opponent1Id);
    mallets.push({
      id: 'opponent1',
      isPlayer: false,
      isTeamPlayer: false,
      character: opp1Char,
      x: is2v2 ? ARENA_WIDTH * 0.35 : ARENA_WIDTH / 2,
      y: is2v2 ? ARENA_HEIGHT * 0.26 : ARENA_HEIGHT * 0.18,
      prevX: is2v2 ? ARENA_WIDTH * 0.35 : ARENA_WIDTH / 2,
      prevY: is2v2 ? ARENA_HEIGHT * 0.26 : ARENA_HEIGHT * 0.18,
      vx: 0,
      vy: 0,
      radius: MALLET_RADIUS,
      mass: 5,
      color: opp1Char.themeColor,
    });

    // Opponent 2 (if 2v2)
    if (is2v2 && config.opponent2Id) {
      const opp2Char = GET_CHARACTER_BY_ID(config.opponent2Id);
      mallets.push({
        id: 'opponent2',
        isPlayer: false,
        isTeamPlayer: false,
        character: opp2Char,
        x: ARENA_WIDTH * 0.65,
        y: ARENA_HEIGHT * 0.18,
        prevX: ARENA_WIDTH * 0.65,
        prevY: ARENA_HEIGHT * 0.18,
        vx: 0,
        vy: 0,
        radius: MALLET_RADIUS,
        mass: 5,
        color: opp2Char.themeColor,
      });
    }

    malletsRef.current = mallets;

    // 2. Initialize Pucks
    const pucks: Puck[] = [];

    // Main puck
    pucks.push({
      id: 'puck-1',
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      prevX: ARENA_WIDTH / 2,
      prevY: ARENA_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: PUCK_RADIUS,
      trail: [],
      color: '#38bdf8',
    });

    if (isDoublePuck) {
      pucks.push({
        id: 'puck-2',
        x: ARENA_WIDTH / 2 + 50,
        y: ARENA_HEIGHT / 2 + 30,
        prevX: ARENA_WIDTH / 2 + 50,
        prevY: ARENA_HEIGHT / 2 + 30,
        vx: 0,
        vy: 0,
        radius: PUCK_RADIUS,
        trail: [],
        color: '#f43f5e',
      });
    }

    // Multi-ball mode: start with 5 colorful neon balls
    if (isMultiBall) {
      const ballColors = ['#f43f5e', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
      ballColors.forEach((col, idx) => {
        const offsetAngle = (idx * Math.PI * 2) / ballColors.length;
        pucks.push({
          id: `multi-${idx + 2}`,
          x: ARENA_WIDTH / 2 + Math.cos(offsetAngle) * 60,
          y: ARENA_HEIGHT / 2 + Math.sin(offsetAngle) * 60,
          prevX: ARENA_WIDTH / 2 + Math.cos(offsetAngle) * 60,
          prevY: ARENA_HEIGHT / 2 + Math.sin(offsetAngle) * 60,
          vx: 0,
          vy: 0,
          radius: 18,
          trail: [],
          color: col,
        });
      });
    }

    pucksRef.current = pucks;

    // 3. Initialize Bumpers
    if (hasBumpers) {
      bumpersRef.current = [
        { id: 'b1', x: ARENA_WIDTH * 0.28, y: ARENA_HEIGHT * 0.5, radius: 26, pulseTimer: 0, color: '#ec4899' },
        { id: 'b2', x: ARENA_WIDTH * 0.72, y: ARENA_HEIGHT * 0.5, radius: 26, pulseTimer: 0, color: '#a855f7' },
        { id: 'b3', x: ARENA_WIDTH * 0.5, y: ARENA_HEIGHT * 0.38, radius: 22, pulseTimer: 0, color: '#f59e0b' },
        { id: 'b4', x: ARENA_WIDTH * 0.5, y: ARENA_HEIGHT * 0.62, radius: 22, pulseTimer: 0, color: '#10b981' },
      ];
    } else {
      bumpersRef.current = [];
    }

    // 4. Initialize Targets
    if (hasTargets) {
      targetsRef.current = [
        { id: 't1', x: ARENA_WIDTH * 0.3, y: ARENA_HEIGHT * 0.45, radius: 22, points: 1, color: '#eab308', active: true, pulsePhase: 0 },
        { id: 't2', x: ARENA_WIDTH * 0.7, y: ARENA_HEIGHT * 0.55, radius: 22, points: 1, color: '#06b6d4', active: true, pulsePhase: Math.PI },
      ];
    } else {
      targetsRef.current = [];
    }

    particlesRef.current = [];
    rallyRef.current = 0;
    scoresRef.current = { player: 0, opponent: 0 };
    statsRef.current.startTime = Date.now();
    goalCooldownRef.current = 0;
    goalBannerRef.current = null;
    multiBallTimerRef.current = 0;
    cornerTrapCounterRef.current = {};
    matchOverTriggeredRef.current = false;

    // Start with 3-2-1 countdown!
    countdownRef.current = {
      step: 3,
      timer: 45,
      active: true,
      label: '3',
    };
    sound.playCountdown(false);

    // Initial match start dialogue
    setTimeout(() => {
      triggerSpeech(config.opponent1Id, 'start');
      if (is2v2 && config.allyId) {
        setTimeout(() => {
          if (config.allyId) triggerSpeech(config.allyId, 'start');
        }, 1200);
      }
    }, 600);
  }, [config, triggerSpeech]);

  // Run board initialization on mount or mode change
  useEffect(() => {
    initBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mode, config.teamFormat, config.opponent1Id, config.opponent2Id, config.allyId]);

  // Speed rush timer countdown
  useEffect(() => {
    if (config.mode !== 'speed_rush' || isPaused) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const pScore = scoresRef.current.player;
          const oScore = scoresRef.current.opponent;
          triggerMatchEnd(pScore > oScore, pScore, oScore);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [config.mode, isPaused, triggerMatchEnd]);

  // Main Canvas Animation and Physics Loop
  useEffect(() => {
    let animationFrameId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = ARENA_WIDTH * dpr;
    canvas.height = ARENA_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const is2v2 = config.teamFormat === '2v2' || config.mode === '2v2';
    const isMultiBall = config.mode === 'multi_ball';

    const handleGoal = (scorer: 'player' | 'opponent', puck: Puck) => {
      if (matchOverTriggeredRef.current) return;

      const isPlayer = scorer === 'player';
      const nextPlayerScore = isPlayer ? scoresRef.current.player + 1 : scoresRef.current.player;
      const nextOpponentScore = !isPlayer ? scoresRef.current.opponent + 1 : scoresRef.current.opponent;

      scoresRef.current = { player: nextPlayerScore, opponent: nextOpponentScore };
      setPlayerScore(nextPlayerScore);
      setOpponentScore(nextOpponentScore);
      onGoalScored(nextPlayerScore, nextOpponentScore, scorer);

      const target = config.targetScore || 7;
      const isSpeedRush = config.mode === 'speed_rush';

      if (!isSpeedRush && (nextPlayerScore >= target || nextOpponentScore >= target)) {
        const won = nextPlayerScore >= target;
        sound.playGoal();
        emitSparks(ARENA_WIDTH / 2, isPlayer ? 25 : ARENA_HEIGHT - 25, won ? '#06b6d4' : '#f43f5e', 50, 3.5);
        if (won) {
          if (is2v2 && config.allyId) triggerSpeech(config.allyId, 'goalScored');
          triggerSpeech(config.opponent1Id, 'goalConceded');
        } else {
          triggerSpeech(config.opponent1Id, 'goalScored');
          if (is2v2 && config.allyId) triggerSpeech(config.allyId, 'goalConceded');
        }
        triggerMatchEnd(won, nextPlayerScore, nextOpponentScore);
        return;
      }

      goalCooldownRef.current = 80;
      sound.playGoal();

      goalBannerRef.current = {
        text: isPlayer ? 'GOAL FOR YOU!' : 'GOAL FOR OPPONENT!',
        color: isPlayer ? '#06b6d4' : '#f43f5e',
        timer: 65,
      };

      if (isPlayer) {
        emitSparks(ARENA_WIDTH / 2, 25, '#06b6d4', 45, 3);
        if (is2v2 && config.allyId) triggerSpeech(config.allyId, 'goalScored');
        triggerSpeech(config.opponent1Id, 'goalConceded');
      } else {
        emitSparks(ARENA_WIDTH / 2, ARENA_HEIGHT - 25, '#f43f5e', 45, 3);
        triggerSpeech(config.opponent1Id, 'goalScored');
        if (is2v2 && config.allyId) triggerSpeech(config.allyId, 'goalConceded');
      }

      // Smooth puck reset to center
      puck.x = ARENA_WIDTH / 2;
      puck.y = ARENA_HEIGHT / 2;
      puck.vx = 0;
      puck.vy = 0;
      puck.trail = [];
      puck.isSuperCharged = false;
      rallyRef.current = 0;

      // Puck reset or restart according to goalCountdown setting
      if (config.goalCountdown) {
        // Option: Countdown after every goal (deliberate pace)
        setTimeout(() => {
          if (matchOverTriggeredRef.current) return;
          countdownRef.current = {
            step: 2,
            timer: 35,
            active: true,
            label: 'READY',
          };
          sound.playCountdown(false);
        }, 700);
      } else {
        // Option: Rapid instant restart (High-tempo rally mode - default!)
        setTimeout(() => {
          if (matchOverTriggeredRef.current) return;
          puck.x = ARENA_WIDTH / 2;
          puck.y = ARENA_HEIGHT / 2;
          puck.vx = (Math.random() - 0.5) * 3;
          puck.vy = scorer === 'player' ? -4.5 : 4.5;
          goalCooldownRef.current = 0;
          sound.playHit(0.85);
          emitSparks(puck.x, puck.y, '#38bdf8', 14);
        }, 700);
      }
    };

    const updatePhysics = (dt: number) => {
      if (isPaused || matchOverTriggeredRef.current) return;

      // Handle Countdown Transition
      if (countdownRef.current.active) {
        countdownRef.current.timer -= dt;
        if (countdownRef.current.timer <= 0) {
          if (countdownRef.current.step === 3) {
            sound.playCountdown(false);
            countdownRef.current.step = 2;
            countdownRef.current.label = '2';
            countdownRef.current.timer = 35;
          } else if (countdownRef.current.step === 2) {
            sound.playCountdown(false);
            countdownRef.current.step = 1;
            countdownRef.current.label = '1';
            countdownRef.current.timer = 35;
          } else if (countdownRef.current.step === 1) {
            sound.playCountdown(true);
            countdownRef.current.step = 0;
            countdownRef.current.label = 'GO!';
            countdownRef.current.timer = 25;
            // Launch pucks
            pucksRef.current.forEach((puck, idx) => {
              puck.vx = (Math.random() - 0.5) * 3;
              puck.vy = (idx === 0 ? 1 : -1) * 4.5;
            });
          } else {
            countdownRef.current.active = false;
          }
        }
      }

      if (goalCooldownRef.current > 0) {
        goalCooldownRef.current -= dt;
      }
      if (goalBannerRef.current) {
        if (!matchOverTriggeredRef.current) {
          goalBannerRef.current.timer -= dt;
          if (goalBannerRef.current.timer <= 0) {
            goalBannerRef.current = null;
          }
        }
      }

      // 1. Update Player Mallet
      const playerMallet = malletsRef.current.find((m) => m.isPlayer);
      if (playerMallet) {
        playerMallet.prevX = playerMallet.x;
        playerMallet.prevY = playerMallet.y;

        let targetX = playerMallet.x;
        let targetY = playerMallet.y;

        // Pointer controls
        if (pointerPosRef.current.active) {
          targetX = pointerPosRef.current.x;
          targetY = pointerPosRef.current.y;
        }

        // Keyboard controls
        const keySpeed = 10;
        if (keysDownRef.current['ArrowLeft'] || keysDownRef.current['KeyA']) targetX -= keySpeed;
        if (keysDownRef.current['ArrowRight'] || keysDownRef.current['KeyD']) targetX += keySpeed;
        if (keysDownRef.current['ArrowUp'] || keysDownRef.current['KeyW']) targetY -= keySpeed;
        if (keysDownRef.current['ArrowDown'] || keysDownRef.current['KeyS']) targetY += keySpeed;

        // Constrain player mallet to bottom half
        targetX = Math.max(MALLET_RADIUS, Math.min(ARENA_WIDTH - MALLET_RADIUS, targetX));
        targetY = Math.max(ARENA_HEIGHT * 0.5 + MALLET_RADIUS, Math.min(ARENA_HEIGHT - MALLET_RADIUS, targetY));

        playerMallet.x += (targetX - playerMallet.x) * 0.45;
        playerMallet.y += (targetY - playerMallet.y) * 0.45;

        playerMallet.vx = playerMallet.x - playerMallet.prevX;
        playerMallet.vy = playerMallet.y - playerMallet.prevY;
      }

      // 2. Update AI Mallets (Anti-Corner Trapping Intelligent AI)
      malletsRef.current.forEach((mallet) => {
        if (mallet.isPlayer || !mallet.character) return;

        mallet.prevX = mallet.x;
        mallet.prevY = mallet.y;

        const char = mallet.character;
        const ai = char.aiParameters;
        const stats = char.stats;

        // Find primary target puck or ball
        let targetPuck = pucksRef.current[0];
        if (pucksRef.current.length > 1) {
          let bestDist = Infinity;
          pucksRef.current.forEach((p) => {
            const d = Math.hypot(p.x - mallet.x, p.y - mallet.y);
            if (d < bestDist) {
              bestDist = d;
              targetPuck = p;
            }
          });
        }

        let minY = MALLET_RADIUS;
        let maxY = ARENA_HEIGHT * 0.5 - MALLET_RADIUS;
        let minX = MALLET_RADIUS;
        let maxX = ARENA_WIDTH - MALLET_RADIUS;

        if (mallet.isTeamPlayer) {
          minY = ARENA_HEIGHT * 0.5 + MALLET_RADIUS;
          maxY = ARENA_HEIGHT - MALLET_RADIUS;
          if (is2v2) {
            const playerX = playerMallet ? playerMallet.x : ARENA_WIDTH / 2;
            if (playerX > ARENA_WIDTH / 2) {
              maxX = ARENA_WIDTH * 0.65;
            } else {
              minX = ARENA_WIDTH * 0.35;
            }
          }
        } else if (is2v2) {
          if (mallet.id === 'opponent1') {
            maxX = ARENA_WIDTH * 0.62;
          } else {
            minX = ARENA_WIDTH * 0.38;
          }
        }

        let desiredX = mallet.x;
        let desiredY = mallet.y;

        const isPuckInMyHalf = mallet.isTeamPlayer
          ? targetPuck.y > ARENA_HEIGHT * 0.48
          : targetPuck.y < ARENA_HEIGHT * 0.52;

        // Check if puck is near corner or walls
        const isNearRightWall = targetPuck.x > ARENA_WIDTH - 85;
        const isNearLeftWall = targetPuck.x < 85;
        const isNearTopCorner = targetPuck.y < 160 && (isNearRightWall || isNearLeftWall);

        if (isPuckInMyHalf) {
          // ANTI-CORNER TRAP: When puck is in corner or stuck on wall, DO NOT smash it into wall!
          if (isNearTopCorner && !mallet.isTeamPlayer) {
            // Step back toward center to give puck room to slide out into open arena
            desiredX = ARENA_WIDTH * 0.42;
            desiredY = ARENA_HEIGHT * 0.16;
          } else if (isNearRightWall && !mallet.isTeamPlayer) {
            // Position mallet toward center and slightly behind to deflect ball forward-left, NEVER hit rightward into the wall
            desiredX = Math.min(targetPuck.x - 45, ARENA_WIDTH * 0.58);
            desiredY = Math.max(ARENA_HEIGHT * 0.12, targetPuck.y - 35);
          } else if (isNearLeftWall && !mallet.isTeamPlayer) {
            // Position mallet toward center and slightly behind to deflect ball forward-right
            desiredX = Math.max(targetPuck.x + 45, ARENA_WIDTH * 0.42);
            desiredY = Math.max(ARENA_HEIGHT * 0.12, targetPuck.y - 35);
          } else {
            const shouldSmash = Math.random() < ai.smashProbability;
            if (shouldSmash) {
              const aimOffset = (Math.random() - 0.5) * ai.aimSpread * 80;
              desiredX = targetPuck.x + aimOffset;
              desiredY = targetPuck.y;
            } else {
              desiredX = targetPuck.x * 0.82 + (ARENA_WIDTH / 2) * 0.18;
              desiredY = mallet.isTeamPlayer ? ARENA_HEIGHT * 0.72 : ARENA_HEIGHT * 0.22;
            }
          }
        } else {
          desiredX = ARENA_WIDTH / 2;
          if (is2v2) {
            desiredX = mallet.id.includes('1') ? ARENA_WIDTH * 0.35 : ARENA_WIDTH * 0.65;
          }
          desiredY = mallet.isTeamPlayer
            ? ARENA_HEIGHT * (1 - ai.defenseLineY)
            : ARENA_HEIGHT * ai.defenseLineY;
        }

        desiredX = Math.max(minX, Math.min(maxX, desiredX));
        desiredY = Math.max(minY, Math.min(maxY, desiredY));

        const moveSpeed = (stats.speed / 100) * 0.24;
        mallet.x += (desiredX - mallet.x) * moveSpeed;
        mallet.y += (desiredY - mallet.y) * moveSpeed;

        mallet.vx = mallet.x - mallet.prevX;
        mallet.vy = mallet.y - mallet.prevY;
      });

      // 3. Multi-Ball Frenzy Spawner
      if (isMultiBall && !countdownRef.current.active && goalCooldownRef.current <= 0) {
        multiBallTimerRef.current += dt;
        if (multiBallTimerRef.current >= 180 && pucksRef.current.length < 8) {
          multiBallTimerRef.current = 0;
          const colors = ['#f43f5e', '#38bdf8', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];
          const newColor = colors[pucksRef.current.length % colors.length];
          const angle = Math.random() * Math.PI * 2;
          pucksRef.current.push({
            id: `spawned-${Date.now()}`,
            x: ARENA_WIDTH / 2,
            y: ARENA_HEIGHT / 2,
            prevX: ARENA_WIDTH / 2,
            prevY: ARENA_HEIGHT / 2,
            vx: Math.cos(angle) * 4.5,
            vy: Math.sin(angle) * 4.5,
            radius: 19,
            trail: [],
            color: newColor,
          });
          sound.playMultiSpawn();
          emitSparks(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, newColor, 15);
        }
      }

      // 4. Update Pucks Physics
      const friction = 0.995;
      pucksRef.current.forEach((puck, pIdx) => {
        if (countdownRef.current.active || (goalCooldownRef.current > 0 && puck.vx === 0 && puck.vy === 0)) {
          return;
        }

        puck.prevX = puck.x;
        puck.prevY = puck.y;

        puck.vx *= friction;
        puck.vy *= friction;

        // Cap max speed
        const currentSpeed = Math.hypot(puck.vx, puck.vy);
        if (currentSpeed > MAX_PUCK_SPEED) {
          puck.vx = (puck.vx / currentSpeed) * MAX_PUCK_SPEED;
          puck.vy = (puck.vy / currentSpeed) * MAX_PUCK_SPEED;
        }

        // Motion trail
        if (currentSpeed > 4) {
          puck.trail.push({ x: puck.x, y: puck.y, alpha: 1 });
          if (puck.trail.length > 8) puck.trail.shift();
        } else if (puck.trail.length > 0) {
          puck.trail.shift();
        }

        puck.x += puck.vx;
        puck.y += puck.vy;

        // Left & Right boundary wall bounce
        if (puck.x - puck.radius <= 0) {
          puck.x = puck.radius;
          puck.vx = Math.abs(puck.vx) * 0.95;
          sound.playWall();
          emitSparks(puck.x, puck.y, puck.color, 8);
        } else if (puck.x + puck.radius >= ARENA_WIDTH) {
          puck.x = ARENA_WIDTH - puck.radius;
          puck.vx = -Math.abs(puck.vx) * 0.95;
          sound.playWall();
          emitSparks(puck.x, puck.y, puck.color, 8);
        }

        // Corner Goal Posts deflection check
        const isWithinGoalX = puck.x >= GOAL_LEFT && puck.x <= GOAL_RIGHT;
        const checkPostCollision = (px: number, py: number) => {
          const dist = Math.hypot(puck.x - px, puck.y - py);
          if (dist < puck.radius + 8 && dist > 0) {
            const nx = (puck.x - px) / dist;
            const ny = (puck.y - py) / dist;
            puck.x = px + nx * (puck.radius + 8);
            puck.y = py + ny * (puck.radius + 8);
            const dot = puck.vx * nx + puck.vy * ny;
            if (dot < 0) {
              puck.vx -= 1.8 * dot * nx;
              puck.vy -= 1.8 * dot * ny;
              sound.playWall();
              emitSparks(puck.x, puck.y, '#ffffff', 10);
            }
          }
        };

        checkPostCollision(GOAL_LEFT, 0);
        checkPostCollision(GOAL_RIGHT, 0);
        checkPostCollision(GOAL_LEFT, ARENA_HEIGHT);
        checkPostCollision(GOAL_RIGHT, ARENA_HEIGHT);

        // Anti-corner trap impulse check & smooth center deflection
        const inCorner =
          (puck.x < 65 || puck.x > ARENA_WIDTH - 65) && (puck.y < 85 || puck.y > ARENA_HEIGHT - 85);
        if (inCorner) {
          const key = `puck-${pIdx}`;
          cornerTrapCounterRef.current[key] = (cornerTrapCounterRef.current[key] || 0) + 1;
          if (cornerTrapCounterRef.current[key] > 6) {
            // Kick puck smoothly toward center open court!
            puck.vx = puck.x > ARENA_WIDTH / 2 ? -7.0 : 7.0;
            puck.vy = puck.y > ARENA_HEIGHT / 2 ? -6.0 : 6.0;
            cornerTrapCounterRef.current[key] = 0;
            emitSparks(puck.x, puck.y, '#38bdf8', 12);
          }
        } else {
          const key = `puck-${pIdx}`;
          cornerTrapCounterRef.current[key] = 0;
        }

        // Top Wall
        if (puck.y - puck.radius <= 0) {
          if (!isWithinGoalX) {
            puck.y = puck.radius;
            puck.vy = Math.abs(puck.vy) * 0.95;
            sound.playWall();
            emitSparks(puck.x, puck.y, puck.color, 8);
          } else if (puck.y < -puck.radius * 0.4 && goalCooldownRef.current <= 0) {
            // GOAL FOR PLAYER SIDE!
            handleGoal('player', puck);
          }
        }

        // Bottom Wall
        if (puck.y + puck.radius >= ARENA_HEIGHT) {
          if (!isWithinGoalX) {
            puck.y = ARENA_HEIGHT - puck.radius;
            puck.vy = -Math.abs(puck.vy) * 0.95;
            sound.playWall();
            emitSparks(puck.x, puck.y, puck.color, 8);
          } else if (puck.y > ARENA_HEIGHT + puck.radius * 0.4 && goalCooldownRef.current <= 0) {
            // GOAL FOR OPPONENT SIDE!
            handleGoal('opponent', puck);
          }
        }

        // Mallet to Puck collisions
        malletsRef.current.forEach((mallet) => {
          const dx = puck.x - mallet.x;
          const dy = puck.y - mallet.y;
          const dist = Math.hypot(dx, dy);
          const minDist = mallet.radius + puck.radius;

          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            // Separate cleanly
            puck.x = mallet.x + nx * minDist;
            puck.y = mallet.y + ny * minDist;

            const dvx = puck.vx - mallet.vx;
            const dvy = puck.vy - mallet.vy;
            const velAlongNormal = dvx * nx + dvy * ny;

            if (velAlongNormal < 0) {
              const charPower = mallet.character ? mallet.character.stats.power : 85;
              const charCurve = mallet.character ? mallet.character.stats.curve : 70;
              const restitution = 1.06 + (charPower / 100) * 0.22;

              const impulse = -(1 + restitution) * velAlongNormal;
              puck.vx += nx * impulse + mallet.vx * 0.45;
              puck.vy += ny * impulse + mallet.vy * 0.45;

              // Spin / curve
              const curveAngle = (charCurve / 100) * 0.15;
              puck.vx += (Math.random() - 0.5) * curveAngle * 5;

              const hitSpeed = Math.hypot(puck.vx, puck.vy);
              sound.playHit(hitSpeed / MAX_PUCK_SPEED);
              emitSparks(puck.x, puck.y, mallet.color, Math.min(24, Math.floor(hitSpeed * 1.3)));

              statsRef.current.totalShots += 1;
              rallyRef.current += 1;
              if (rallyRef.current > statsRef.current.longestRally) {
                statsRef.current.longestRally = rallyRef.current;
              }

              // Super Smash
              if (hitSpeed > 17) {
                puck.isSuperCharged = true;
                statsRef.current.superSmashes += 1;
                sound.playSmash();
                emitSparks(puck.x, puck.y, '#f59e0b', 26, 1.8);

                if (mallet.character && Date.now() - lastSmashSpeechTimeRef.current > 6000) {
                  lastSmashSpeechTimeRef.current = Date.now();
                  triggerSpeech(mallet.character.id, 'smash');
                }
              }

              // Intense rally speech
              if (rallyRef.current === 8 && mallet.character) {
                triggerSpeech(mallet.character.id, 'intenseRally');
              }
            }
          }
        });
      });

      // Bumpers Collisions
      bumpersRef.current.forEach((b) => {
        pucksRef.current.forEach((puck) => {
          const dx = puck.x - b.x;
          const dy = puck.y - b.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b.radius + puck.radius;

          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            puck.x = b.x + nx * minDist;
            puck.y = b.y + ny * minDist;
            const dot = puck.vx * nx + puck.vy * ny;
            if (dot < 0) {
              puck.vx -= 2.2 * dot * nx;
              puck.vy -= 2.2 * dot * ny;
              b.pulseTimer = 12;
              sound.playBumper();
              emitSparks(b.x, b.y, b.color, 14, 1.4);
            }
          }
        });
        if (b.pulseTimer > 0) b.pulseTimer -= 1;
      });

      // 8. Target Break Collisions
      targetsRef.current.forEach((target) => {
        if (!target.active) return;
        pucksRef.current.forEach((puck) => {
          const dist = Math.hypot(puck.x - target.x, puck.y - target.y);
          if (dist < puck.radius + target.radius) {
            target.active = false;
            sound.playTargetBreak();
            emitSparks(target.x, target.y, target.color, 24, 2);
            statsRef.current.targetsHit += 1;

            const isPlayerScorer = puck.vy < 0 || puck.y > ARENA_HEIGHT * 0.45;
            if (isPlayerScorer) {
              const next = scoresRef.current.player + target.points;
              scoresRef.current.player = next;
              setPlayerScore(next);
              onGoalScored(next, scoresRef.current.opponent, 'player');
            } else {
              const next = scoresRef.current.opponent + target.points;
              scoresRef.current.opponent = next;
              setOpponentScore(next);
              onGoalScored(scoresRef.current.player, next, 'opponent');
            }

            setTimeout(() => {
              target.x = ARENA_WIDTH * (0.2 + Math.random() * 0.6);
              target.y = ARENA_HEIGHT * (0.35 + Math.random() * 0.3);
              target.active = true;
            }, 4000);
          }
        });
      });

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }
    };

    // Render Canvas Frame
    const render = () => {
      ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // 1. Rich Cyber Neon Arena Backdrop Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
      bgGrad.addColorStop(0, '#1c1038');
      bgGrad.addColorStop(0.25, '#12122b');
      bgGrad.addColorStop(0.5, '#090d20');
      bgGrad.addColorStop(0.75, '#09182c');
      bgGrad.addColorStop(1, '#06263b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // Ambient radial lighting behind goals
      const topGlow = ctx.createRadialGradient(ARENA_WIDTH / 2, 0, 10, ARENA_WIDTH / 2, 0, 260);
      topGlow.addColorStop(0, 'rgba(244, 63, 94, 0.24)');
      topGlow.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, ARENA_WIDTH, 260);

      const botGlow = ctx.createRadialGradient(ARENA_WIDTH / 2, ARENA_HEIGHT, 10, ARENA_WIDTH / 2, ARENA_HEIGHT, 260);
      botGlow.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      botGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = botGlow;
      ctx.fillRect(0, ARENA_HEIGHT - 260, ARENA_WIDTH, 260);

      // Cyber Grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < ARENA_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < ARENA_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_WIDTH, y);
        ctx.stroke();
      }

      // Outer Arena Border with Neon Glow
      ctx.save();
      ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, ARENA_WIDTH - 12, ARENA_HEIGHT - 12);
      ctx.restore();

      // Center Line & Center Circle
      ctx.save();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, ARENA_HEIGHT / 2);
      ctx.lineTo(ARENA_WIDTH - 10, ARENA_HEIGHT / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(244, 63, 94, 0.5)';
      ctx.beginPath();
      ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Glowing Goals
      ctx.save();
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
      ctx.fillRect(GOAL_LEFT, 0, GOAL_WIDTH, 14);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.strokeRect(GOAL_LEFT, 0, GOAL_WIDTH, 14);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.fillRect(GOAL_LEFT, ARENA_HEIGHT - 14, GOAL_WIDTH, 14);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(GOAL_LEFT, ARENA_HEIGHT - 14, GOAL_WIDTH, 14);
      ctx.restore();

      // 3. Bumpers
      bumpersRef.current.forEach((b) => {
        ctx.save();
        const pulse = b.pulseTimer > 0 ? 8 : 0;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 14 + pulse;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      // 4. Targets
      targetsRef.current.forEach((t) => {
        if (!t.active) return;
        ctx.save();
        t.pulsePhase += 0.05;
        const scale = 1 + Math.sin(t.pulsePhase) * 0.08;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 3;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const hx = t.x + Math.cos(angle) * t.radius * scale;
          const hy = t.y + Math.sin(angle) * t.radius * scale;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.restore();
      });

      // 5. Particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 7. Pucks & Trail
      pucksRef.current.forEach((puck) => {
        puck.trail.forEach((pt) => {
          ctx.save();
          ctx.globalAlpha = pt.alpha * 0.45;
          ctx.fillStyle = puck.color;
          ctx.shadowColor = puck.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, puck.radius * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.save();
        ctx.shadowColor = puck.isSuperCharged ? '#f59e0b' : puck.color;
        ctx.shadowBlur = puck.isSuperCharged ? 24 : 14;

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 3.5;
        ctx.strokeStyle = puck.isSuperCharged ? '#fbbf24' : puck.color;
        ctx.stroke();

        ctx.fillStyle = puck.isSuperCharged ? '#fef08a' : '#ffffff';
        ctx.beginPath();
        ctx.arc(puck.x, puck.y, puck.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 8. Mallets
      malletsRef.current.forEach((m) => {
        ctx.save();
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 18;

        // Outer rim
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = m.color;
        ctx.lineWidth = 4.5;
        ctx.stroke();

        // Inner knob / image / text
        const cachedImg = m.character ? imagesCacheRef.current[m.character.id] : null;

        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 1 && cachedImg.naturalHeight > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.radius * 0.72, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(cachedImg, m.x - m.radius * 0.72, m.y - m.radius * 0.72, m.radius * 1.44, m.radius * 1.44);
          ctx.restore();

          // Border for inner avatar
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.radius * 0.72, 0, Math.PI * 2);
          ctx.strokeStyle = m.color;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.radius * 0.55, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (m.isPlayer) {
            ctx.fillText('YOU', m.x, m.y);
          } else if (m.character) {
            ctx.fillText(m.character.name.charAt(0), m.x, m.y);
          }
        }
        ctx.restore();
      });

      // 9. Countdown Display Overlay
      if (countdownRef.current.active) {
        ctx.save();
        ctx.font = '900 84px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 28;
        ctx.fillText(countdownRef.current.label, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
        ctx.restore();
      }

      // 10. Goal / Score Banner Overlay
      if (goalBannerRef.current) {
        ctx.save();
        ctx.font = '900 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = goalBannerRef.current.color;
        ctx.shadowColor = goalBannerRef.current.color;
        ctx.shadowBlur = 24;
        ctx.fillText(goalBannerRef.current.text, ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 50);
        ctx.restore();
      }
    };

    // Animation Loop
    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / (1000 / 60), 2.5);
      lastTimeRef.current = timestamp;

      updatePhysics(dt);
      render();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [config, isPaused, onGoalScored, triggerSpeech, triggerMatchEnd]);

  // Pointer, Mouse & Touch Events
  const updatePointerCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;

    pointerPosRef.current.x = (clientX - rect.left) * scaleX;
    pointerPosRef.current.y = (clientY - rect.top) * scaleY;
    pointerPosRef.current.active = true;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updatePointerCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If pointer is mouse or pen: always track without needing click!
    if (e.pointerType !== 'touch') {
      updatePointerCoords(e.clientX, e.clientY);
    } else if (pointerPosRef.current.active) {
      updatePointerCoords(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updatePointerCoords(e.clientX, e.clientY);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updatePointerCoords(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      updatePointerCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      updatePointerCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    pointerPosRef.current.active = false;
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full select-none touch-none px-1 sm:px-2">
      <div
        className="relative flex items-center justify-center max-w-full"
        style={{
          aspectRatio: '2 / 3',
          height: 'min(calc(100dvh - 130px), 760px)',
          maxWidth: 'min(100%, calc(min(calc(100dvh - 130px), 760px) * 2 / 3))',
          width: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerEnter={handleMouseEnter}
          className="w-full h-full object-contain rounded-3xl border-2 border-slate-800 shadow-[0_0_35px_rgba(6,182,212,0.2)] bg-slate-950 cursor-crosshair block"
        />
      </div>
    </div>
  );
}
