'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { MatchConfig, MatchStats, InGameSpeech, BilliardPocket, BilliardBall, Particle, Character } from '@/lib/types';
import { GET_CHARACTER_BY_ID } from '@/lib/characters';
import { sound } from '@/lib/audio';

interface NeonBilliardsCanvasProps {
  config: MatchConfig;
  isPaused: boolean;
  onGoalScored: (playerScore: number, opponentScore: number, lastScorer: 'player' | 'opponent') => void;
  onMatchComplete: (stats: MatchStats, won: boolean) => void;
  onSpeech: (speech: InGameSpeech) => void;
}

const ARENA_WIDTH = 600;
const ARENA_HEIGHT = 900;
const BALL_RADIUS = 21;
const CUE_RADIUS = 22;

interface TurnParticipant {
  id: string;
  name: string;
  isPlayerTeam: boolean;
  isHuman: boolean;
  character?: Character;
  color: string;
}

export default function NeonBilliardsCanvas({
  config,
  isPaused,
  onGoalScored,
  onMatchComplete,
  onSpeech,
}: NeonBilliardsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [remainingBallsCount, setRemainingBallsCount] = useState(9);

  const is2v2 = config.teamFormat === '2v2' || config.mode === '2v2';

  // Build Turn Order:
  // 1v1: Player (自分) -> Opponent 1 (敵)
  // 2v2: Player (自分) -> Opponent 1 (敵1) -> Ally (味方) -> Opponent 2 (敵2)
  const participants = useMemo<TurnParticipant[]>(() => {
    const list: TurnParticipant[] = [];
    // 1. Player
    list.push({
      id: 'player',
      name: config.playerName || 'あなた',
      isPlayerTeam: true,
      isHuman: true,
      color: config.playerColor || '#06b6d4',
    });

    // 2. Opponent 1
    const opp1 = GET_CHARACTER_BY_ID(config.opponent1Id);
    list.push({
      id: opp1.id,
      name: opp1.name,
      isPlayerTeam: false,
      isHuman: false,
      character: opp1,
      color: opp1.themeColor,
    });

    if (is2v2) {
      // 3. Ally
      if (config.allyId) {
        const ally = GET_CHARACTER_BY_ID(config.allyId);
        list.push({
          id: ally.id,
          name: ally.name,
          isPlayerTeam: true,
          isHuman: false,
          character: ally,
          color: ally.themeColor,
        });
      }
      // 4. Opponent 2
      if (config.opponent2Id) {
        const opp2 = GET_CHARACTER_BY_ID(config.opponent2Id);
        list.push({
          id: opp2.id,
          name: opp2.name,
          isPlayerTeam: false,
          isHuman: false,
          character: opp2,
          color: opp2.themeColor,
        });
      }
    }

    return list;
  }, [config, is2v2]);

  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const turnIndexRef = useRef(0);
  useEffect(() => {
    turnIndexRef.current = currentTurnIndex;
  }, [currentTurnIndex]);

  const activeParticipant = participants[currentTurnIndex] || participants[0];

  // Game state refs
  const scoresRef = useRef({ player: 0, opponent: 0 });
  const onSpeechRef = useRef(onSpeech);
  useEffect(() => {
    onSpeechRef.current = onSpeech;
  }, [onSpeech]);

  // White Cue Ball
  const cueBallRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
  }>({
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT * 0.74,
    vx: 0,
    vy: 0,
    radius: CUE_RADIUS,
  });

  // 6 Pockets
  const pocketsRef = useRef<BilliardPocket[]>([
    { id: 'tl', x: 44, y: 44, radius: 36 },
    { id: 'tr', x: ARENA_WIDTH - 44, y: 44, radius: 36 },
    { id: 'ml', x: 26, y: ARENA_HEIGHT / 2, radius: 34 },
    { id: 'mr', x: ARENA_WIDTH - 26, y: ARENA_HEIGHT / 2, radius: 34 },
    { id: 'bl', x: 44, y: ARENA_HEIGHT - 44, radius: 36 },
    { id: 'br', x: ARENA_WIDTH - 44, y: ARENA_HEIGHT - 44, radius: 36 },
  ]);

  // Colored Target Balls
  const ballsRef = useRef<BilliardBall[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bannerRef = useRef<{ text: string; color: string; timer: number } | null>(null);

  // Turn Execution State
  const turnStateRef = useRef<'AIMING' | 'ROLLING' | 'MATCH_OVER'>('AIMING');
  const shotCooldownFramesRef = useRef(0);
  const matchOverTriggeredRef = useRef(false);

  // Dragging & Aiming
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    currX: number;
    currY: number;
    power: number;
    angle: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0,
    power: 0,
    angle: -Math.PI / 2,
  });

  // Current hover position for aiming
  const hoverPosRef = useRef<{ x: number; y: number }>({
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT * 0.35,
  });

  const aiShootingTimerRef = useRef<number | null>(null);

  // Match statistics
  const statsRef = useRef({
    totalShots: 0,
    ballsPotted: 0,
    startTime: 0,
  });

  // Speech Helper
  const triggerSpeech = useCallback(
    (charId: string, type: 'start' | 'goalScored' | 'goalConceded') => {
      const char = GET_CHARACTER_BY_ID(charId);
      const quotes = char.quotes[type];
      if (!quotes || quotes.length === 0) return;
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      onSpeechRef.current({
        id: `speech-${Date.now()}-${Math.random()}`,
        character: char,
        text: quote,
        timeRemaining: 3200,
        isAlly: charId === config.allyId,
      });
    },
    [config.allyId]
  );

  // Particle Emitter
  const emitSparks = (x: number, y: number, color: string, count = 16, mult = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1.5) * mult;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 16,
      });
    }
  };

  // Initialize Pyramid Rack of 9 Colorful Billiard Balls
  const initBalls = useCallback(() => {
    const startX = ARENA_WIDTH / 2;
    const startY = ARENA_HEIGHT * 0.28;
    const spacing = BALL_RADIUS * 2 + 3;

    // Classic Diamond/Pyramid Rack Formation with Authentic Pool Colors
    const ballDefs: {
      num: number;
      color: string;
      highlight: string;
      shadow: string;
      pts: number;
      x: number;
      y: number;
      isEight?: boolean;
      isStriped?: boolean;
    }[] = [
      // Row 1 (Apex): #1 Solid Yellow
      { num: 1, color: '#facc15', highlight: '#fef08a', shadow: '#a16207', pts: 1, x: startX, y: startY - spacing },
      // Row 2: #2 Solid Blue, #3 Solid Red
      { num: 2, color: '#2563eb', highlight: '#93c5fd', shadow: '#1e3a8a', pts: 1, x: startX - spacing / 2, y: startY - spacing * 0.15 },
      { num: 3, color: '#dc2626', highlight: '#fca5a5', shadow: '#7f1d1d', pts: 1, x: startX + spacing / 2, y: startY - spacing * 0.15 },
      // Row 3: #4 Solid Purple, 🎱 #8 Iconic Center 8-Ball (3 PTS!), #5 Solid Orange
      { num: 4, color: '#9333ea', highlight: '#d8b4fe', shadow: '#581c87', pts: 1, x: startX - spacing, y: startY + spacing * 0.7 },
      { num: 8, color: '#09090b', highlight: '#64748b', shadow: '#020617', pts: 3, x: startX, y: startY + spacing * 0.7, isEight: true }, // 🎱 8-Ball!
      { num: 5, color: '#ea580c', highlight: '#fdba74', shadow: '#7c2d12', pts: 1, x: startX + spacing, y: startY + spacing * 0.7 },
      // Row 4: #6 Solid Green, #7 Solid Maroon
      { num: 6, color: '#16a34a', highlight: '#86efac', shadow: '#14532d', pts: 1, x: startX - spacing / 2, y: startY + spacing * 1.55 },
      { num: 7, color: '#be185d', highlight: '#f472b6', shadow: '#700735', pts: 1, x: startX + spacing / 2, y: startY + spacing * 1.55 },
      // Row 5 (Tail): #9 Striped Gold (2 PTS!)
      { num: 9, color: '#f59e0b', highlight: '#fef3c7', shadow: '#92400e', pts: 2, x: startX, y: startY + spacing * 2.4, isStriped: true },
    ];

    ballsRef.current = ballDefs.map((b) => ({
      id: `billiard-${b.num}`,
      x: b.x,
      y: b.y,
      prevX: b.x,
      prevY: b.y,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: b.color,
      highlightColor: b.highlight,
      shadowColor: b.shadow,
      number: b.num,
      points: b.pts,
      isEight: b.isEight,
      isStriped: b.isStriped,
      potted: false,
    }));

    cueBallRef.current = {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT * 0.74,
      vx: 0,
      vy: 0,
      radius: CUE_RADIUS,
    };

    scoresRef.current = { player: 0, opponent: 0 };
    statsRef.current = { totalShots: 0, ballsPotted: 0, startTime: Date.now() };
    turnStateRef.current = 'AIMING';
    shotCooldownFramesRef.current = 0;
    matchOverTriggeredRef.current = false;
  }, []);

  useEffect(() => {
    initBalls();
  }, [initBalls]);

  // Turn Advance
  const advanceTurn = useCallback(() => {
    turnStateRef.current = 'AIMING';
    shotCooldownFramesRef.current = 0;
    const nextIdx = (turnIndexRef.current + 1) % participants.length;
    setCurrentTurnIndex(nextIdx);
  }, [participants.length]);

  // Check Match End Trigger
  const checkMatchEnd = useCallback(
    (pScore: number, oScore: number) => {
      if (matchOverTriggeredRef.current) return;
      const target = config.targetScore || 6;
      const allPotted = ballsRef.current.every((b) => b.potted);

      if (pScore >= target || oScore >= target || allPotted) {
        matchOverTriggeredRef.current = true;
        turnStateRef.current = 'MATCH_OVER';

        const won = pScore > oScore || (pScore === oScore && pScore >= target);
        bannerRef.current = {
          text: won ? 'VICTORY! RACK CLEARED!' : 'MATCH FINISHED!',
          color: won ? '#38bdf8' : '#f43f5e',
          timer: 120,
        };

        const matchDurationSec = Math.max(1, Math.floor((Date.now() - statsRef.current.startTime) / 1000));
        setTimeout(() => {
          onMatchComplete(
            {
              playerGoals: pScore,
              opponentGoals: oScore,
              totalShots: statsRef.current.totalShots,
              superSmashes: 0,
              targetsHit: statsRef.current.ballsPotted,
              longestRally: 0,
              currentRally: 0,
              matchDurationSec,
              mvpName: won ? (config.playerName || 'あなた') : GET_CHARACTER_BY_ID(config.opponent1Id).name,
              mvpColor: won ? (config.playerColor || '#06b6d4') : GET_CHARACTER_BY_ID(config.opponent1Id).themeColor,
            },
            won
          );
        }, 1600);
      }
    },
    [config, onMatchComplete]
  );

  // AI Turn Handling
  useEffect(() => {
    if (isPaused || turnStateRef.current !== 'AIMING' || matchOverTriggeredRef.current) return;
    const active = participants[currentTurnIndex];
    if (!active || active.isHuman) return;

    aiShootingTimerRef.current = window.setTimeout(() => {
      if (turnStateRef.current !== 'AIMING') return;

      const remaining = ballsRef.current.filter((b) => !b.potted);
      if (remaining.length === 0) return;

      const cue = cueBallRef.current;

      // Prioritize 8-ball if score is close, or easiest target ball
      let targetBall = remaining.find((b) => b.number === 8) || remaining[0];
      let bestScore = -Infinity;

      remaining.forEach((b) => {
        const dist = Math.hypot(b.x - cue.x, b.y - cue.y);
        // Find nearest pocket to target ball
        let minPocketDist = Infinity;
        pocketsRef.current.forEach((p) => {
          const pd = Math.hypot(b.x - p.x, b.y - p.y);
          if (pd < minPocketDist) minPocketDist = pd;
        });

        const score = (b.number === 8 ? 350 : 200) - dist * 0.4 - minPocketDist * 0.5;
        if (score > bestScore) {
          bestScore = score;
          targetBall = b;
        }
      });

      const dx = targetBall.x - cue.x;
      const dy = targetBall.y - cue.y;
      const spread = active.character ? active.character.aiParameters.aimSpread * 0.06 : 0.02;
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * spread;

      const power = 13 + Math.random() * 4.5;
      cue.vx = Math.cos(angle) * power;
      cue.vy = Math.sin(angle) * power;

      turnStateRef.current = 'ROLLING';
      shotCooldownFramesRef.current = 40;
      statsRef.current.totalShots += 1;
      sound.playHit(0.9);
      emitSparks(cue.x, cue.y, active.color, 16);

      if (active.character && Math.random() < 0.4) {
        triggerSpeech(active.character.id, 'start');
      }
    }, 1200);

    return () => {
      if (aiShootingTimerRef.current) clearTimeout(aiShootingTimerRef.current);
    };
  }, [currentTurnIndex, participants, isPaused, triggerSpeech]);

  // Main Canvas Animation and Physics Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = ARENA_WIDTH * dpr;
    canvas.height = ARENA_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const update = () => {
      if (isPaused) return;

      const cue = cueBallRef.current;
      const friction = 0.986; // Crisp billiard felt roll

      let anyMoving = Math.hypot(cue.vx, cue.vy) > 0.06;

      // 1. Cue Ball Physics
      cue.vx *= friction;
      cue.vy *= friction;
      if (Math.hypot(cue.vx, cue.vy) < 0.06) {
        cue.vx = 0;
        cue.vy = 0;
      }
      cue.x += cue.vx;
      cue.y += cue.vy;

      // Cushion Bounces for Cue Ball
      const railMargin = 22;
      if (cue.x - cue.radius <= railMargin) {
        cue.x = railMargin + cue.radius;
        cue.vx = Math.abs(cue.vx) * 0.9;
        sound.playWall();
      } else if (cue.x + cue.radius >= ARENA_WIDTH - railMargin) {
        cue.x = ARENA_WIDTH - railMargin - cue.radius;
        cue.vx = -Math.abs(cue.vx) * 0.9;
        sound.playWall();
      }
      if (cue.y - cue.radius <= railMargin) {
        cue.y = railMargin + cue.radius;
        cue.vy = Math.abs(cue.vy) * 0.9;
        sound.playWall();
      } else if (cue.y + cue.radius >= ARENA_HEIGHT - railMargin) {
        cue.y = ARENA_HEIGHT - railMargin - cue.radius;
        cue.vy = -Math.abs(cue.vy) * 0.9;
        sound.playWall();
      }

      // Check Cue Ball Scratch into Pocket
      pocketsRef.current.forEach((pocket) => {
        const d = Math.hypot(cue.x - pocket.x, cue.y - pocket.y);
        if (d < pocket.radius + 2) {
          // Scratch!
          cue.x = ARENA_WIDTH / 2;
          cue.y = ARENA_HEIGHT * 0.74;
          cue.vx = 0;
          cue.vy = 0;
          sound.playLose();
          emitSparks(pocket.x, pocket.y, '#ffffff', 20);
          bannerRef.current = { text: 'SCRATCH! (手球ファウル -1PT)', color: '#f43f5e', timer: 70 };

          const active = participants[turnIndexRef.current] || participants[0];
          if (active.isPlayerTeam) {
            const next = Math.max(0, scoresRef.current.player - 1);
            scoresRef.current.player = next;
            setPlayerScore(next);
            onGoalScored(next, scoresRef.current.opponent, 'opponent');
          } else {
            const next = Math.max(0, scoresRef.current.opponent - 1);
            scoresRef.current.opponent = next;
            setOpponentScore(next);
            onGoalScored(scoresRef.current.player, next, 'player');
          }
        }
      });

      // 2. Colored Balls Physics & Collisions
      ballsRef.current.forEach((b1, idx) => {
        if (b1.potted) return;

        b1.vx *= friction;
        b1.vy *= friction;
        if (Math.hypot(b1.vx, b1.vy) < 0.06) {
          b1.vx = 0;
          b1.vy = 0;
        } else {
          anyMoving = true;
        }

        b1.x += b1.vx;
        b1.y += b1.vy;

        // Cushion bounce
        if (b1.x - b1.radius <= railMargin) {
          b1.x = railMargin + b1.radius;
          b1.vx = Math.abs(b1.vx) * 0.9;
          sound.playWall();
        } else if (b1.x + b1.radius >= ARENA_WIDTH - railMargin) {
          b1.x = ARENA_WIDTH - railMargin - b1.radius;
          b1.vx = -Math.abs(b1.vx) * 0.9;
          sound.playWall();
        }
        if (b1.y - b1.radius <= railMargin) {
          b1.y = railMargin + b1.radius;
          b1.vy = Math.abs(b1.vy) * 0.9;
          sound.playWall();
        } else if (b1.y + b1.radius >= ARENA_HEIGHT - railMargin) {
          b1.y = ARENA_HEIGHT - railMargin - b1.radius;
          b1.vy = -Math.abs(b1.vy) * 0.9;
          sound.playWall();
        }

        // Cue ball to Ball collision
        const cdx = b1.x - cue.x;
        const cdy = b1.y - cue.y;
        const cdist = Math.hypot(cdx, cdy);
        const cminDist = cue.radius + b1.radius;

        if (cdist < cminDist && cdist > 0) {
          const nx = cdx / cdist;
          const ny = cdy / cdist;
          b1.x = cue.x + nx * cminDist;
          b1.y = cue.y + ny * cminDist;

          const p = 2 * (nx * (cue.vx - b1.vx) + ny * (cue.vy - b1.vy)) / 2;
          cue.vx -= p * nx * 0.94;
          cue.vy -= p * ny * 0.94;
          b1.vx += p * nx * 0.94;
          b1.vy += p * ny * 0.94;

          sound.playHit(0.85);
          emitSparks(b1.x, b1.y, '#ffffff', 8);
        }

        // Ball to Ball collisions (Combo / Chain Reactions!)
        for (let j = idx + 1; j < ballsRef.current.length; j++) {
          const b2 = ballsRef.current[j];
          if (b2.potted) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.radius + b2.radius;

          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            b2.x = b1.x + nx * minDist;
            b2.y = b1.y + ny * minDist;

            const p = 2 * (nx * (b1.vx - b2.vx) + ny * (b1.vy - b2.vy)) / 2;
            b1.vx -= p * nx * 0.94;
            b1.vy -= p * ny * 0.94;
            b2.vx += p * nx * 0.94;
            b2.vy += p * ny * 0.94;

            sound.playHit(0.65);
            emitSparks(b2.x, b2.y, b2.color, 6);
          }
        }

        // Pocket Drop Detection
        pocketsRef.current.forEach((pocket) => {
          const dist = Math.hypot(b1.x - pocket.x, b1.y - pocket.y);
          if (dist < pocket.radius + 4) {
            b1.potted = true;
            sound.playPocket();
            emitSparks(pocket.x, pocket.y, b1.color, 24, 2);
            statsRef.current.ballsPotted += 1;

            const remaining = ballsRef.current.filter((b) => !b.potted).length;
            setRemainingBallsCount(remaining);

            const active = participants[turnIndexRef.current] || participants[0];
            const pts = b1.points || 1;

            const isEightBall = b1.number === 8;
            bannerRef.current = {
              text: isEightBall
                ? `🎱 8-BALL POCKETED!! +${pts} PTS!`
                : `POCKET! #${b1.number} +${pts} PT!`,
              color: isEightBall ? '#c084fc' : b1.color,
              timer: 75,
            };

            let nextPScore = scoresRef.current.player;
            let nextOScore = scoresRef.current.opponent;

            if (active.isPlayerTeam) {
              nextPScore += pts;
              scoresRef.current.player = nextPScore;
              setPlayerScore(nextPScore);
              onGoalScored(nextPScore, nextOScore, 'player');
              if (active.character) triggerSpeech(active.character.id, 'goalScored');
            } else {
              nextOScore += pts;
              scoresRef.current.opponent = nextOScore;
              setOpponentScore(nextOScore);
              onGoalScored(nextPScore, nextOScore, 'opponent');
              if (active.character) triggerSpeech(active.character.id, 'goalScored');
            }

            checkMatchEnd(nextPScore, nextOScore);
          }
        });
      });

      // Decrement shot cooldown
      if (shotCooldownFramesRef.current > 0) {
        shotCooldownFramesRef.current -= 1;
      }

      // Turn transition after all balls come to rest
      if (
        turnStateRef.current === 'ROLLING' &&
        shotCooldownFramesRef.current <= 0 &&
        !anyMoving &&
        !matchOverTriggeredRef.current
      ) {
        advanceTurn();
      }

      // Particles
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

      // Banner timer (keep banner visible on MATCH_OVER to prevent flicker)
      if (bannerRef.current) {
        if (turnStateRef.current !== 'MATCH_OVER') {
          bannerRef.current.timer -= 1;
          if (bannerRef.current.timer <= 0) bannerRef.current = null;
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // 1. Rich Emerald Neon Felt Table Backdrop
      const feltGrad = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
      feltGrad.addColorStop(0, '#04271f');
      feltGrad.addColorStop(0.5, '#021814');
      feltGrad.addColorStop(1, '#04271f');
      ctx.fillStyle = feltGrad;
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // Subtle Cyber Baize Grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < ARENA_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < ARENA_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_WIDTH, y);
        ctx.stroke();
      }

      // Wooden Mahogany Outer Cushion & Glowing Neon Edge
      ctx.save();
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 18;
      ctx.strokeRect(9, 9, ARENA_WIDTH - 18, ARENA_HEIGHT - 18);

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, ARENA_WIDTH - 40, ARENA_HEIGHT - 40);
      ctx.restore();

      // Baulk line (Head string) & D-arc
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22, ARENA_HEIGHT * 0.74);
      ctx.lineTo(ARENA_WIDTH - 22, ARENA_HEIGHT * 0.74);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT * 0.74, 55, 0, Math.PI);
      ctx.stroke();
      ctx.restore();

      // 2. The 6 Neon Pockets
      pocketsRef.current.forEach((pocket) => {
        ctx.save();
        ctx.fillStyle = '#020617';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocket.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 3. Render Colored Billiard Balls with 3D Sphere Shading!
      ballsRef.current.forEach((b) => {
        if (b.potted) return;
        ctx.save();

        const isEight = b.number === 8;

        // Shadow under ball
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(b.x + 3, b.y + 4, b.radius, b.radius * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Sphere Radial Gradient
        const ballGrad = ctx.createRadialGradient(
          b.x - b.radius * 0.35,
          b.y - b.radius * 0.35,
          b.radius * 0.1,
          b.x,
          b.y,
          b.radius
        );

        if (isEight) {
          ballGrad.addColorStop(0, '#64748b');
          ballGrad.addColorStop(0.25, '#1e293b');
          ballGrad.addColorStop(0.7, '#09090b');
          ballGrad.addColorStop(1, '#020617');
        } else if (b.isStriped) {
          // White base sphere for striped ball
          ballGrad.addColorStop(0, '#ffffff');
          ballGrad.addColorStop(0.5, '#f8fafc');
          ballGrad.addColorStop(1, '#94a3b8');
        } else {
          ballGrad.addColorStop(0, '#ffffff');
          ballGrad.addColorStop(0.2, b.highlightColor || b.color);
          ballGrad.addColorStop(0.65, b.color);
          ballGrad.addColorStop(1, b.shadowColor || '#0f172a');
        }

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // If striped ball: draw the central color stripe
        if (b.isStriped) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius - 1, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x - b.radius, b.y - b.radius * 0.48, b.radius * 2, b.radius * 0.96);
          ctx.restore();
        }

        // Glowing outer neon ring
        ctx.strokeStyle = isEight ? '#c084fc' : b.color;
        ctx.lineWidth = isEight ? 3 : 1.8;
        ctx.shadowColor = isEight ? '#d8b4fe' : b.color;
        ctx.shadowBlur = isEight ? 18 : 10;
        ctx.stroke();

        // Special gold pulsing halo for the iconic 8-ball
        if (isEight) {
          ctx.save();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 4]);
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // White Center Number Badge Circle
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.54, 0, Math.PI * 2);
        ctx.fill();

        // Number Text (Bold & crisp!)
        ctx.fillStyle = '#09090b';
        ctx.font = isEight ? '900 13px sans-serif' : 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(b.number), b.x, b.y + 0.5);

        ctx.restore();
      });

      // 4. White Cue Ball (手球 ⚪) with Glossy 3D Finish
      const cue = cueBallRef.current;
      ctx.save();
      // Cue ball shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cue.x + 3, cue.y + 4, cue.radius, cue.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cue Ball Sphere Radial Gradient
      const cueGrad = ctx.createRadialGradient(
        cue.x - cue.radius * 0.35,
        cue.y - cue.radius * 0.35,
        cue.radius * 0.1,
        cue.x,
        cue.y,
        cue.radius
      );
      cueGrad.addColorStop(0, '#ffffff');
      cueGrad.addColorStop(0.7, '#f1f5f9');
      cueGrad.addColorStop(1, '#94a3b8');

      ctx.fillStyle = cueGrad;
      ctx.beginPath();
      ctx.arc(cue.x, cue.y, cue.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();

      // 5. Aiming Line, Trajectory Laser & Billiards Cue Stick
      const active = participants[turnIndexRef.current] || participants[0];
      if (active.isHuman && turnStateRef.current === 'AIMING') {
        const hover = hoverPosRef.current;
        const dx = hover.x - cue.x;
        const dy = hover.y - cue.y;
        const angle = Math.atan2(dy, dx);

        // A. Trajectory Aiming Laser Line
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(cue.x + Math.cos(angle) * 350, cue.y + Math.sin(angle) * 350);
        ctx.stroke();

        // Ghost cue ball impact indicator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cue.x + Math.cos(angle) * 120, cue.y + Math.sin(angle) * 120, cue.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // B. Realistic Billiards Cue Stick (木目調のキュー)
        const pullDistance = dragRef.current.active ? dragRef.current.power * 65 : 12;
        const cueLength = 220;
        const cueBackAngle = angle + Math.PI;

        const stickTipX = cue.x + Math.cos(cueBackAngle) * (cue.radius + 6 + pullDistance);
        const stickTipY = cue.y + Math.sin(cueBackAngle) * (cue.radius + 6 + pullDistance);
        const stickButtX = stickTipX + Math.cos(cueBackAngle) * cueLength;
        const stickButtY = stickTipY + Math.sin(cueBackAngle) * cueLength;

        ctx.save();
        ctx.strokeStyle = '#d97706'; // Maple wood cue
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(stickTipX, stickTipY);
        ctx.lineTo(stickButtX, stickButtY);
        ctx.stroke();

        // White Tip Chalk
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(stickTipX, stickTipY);
        ctx.lineTo(stickTipX + Math.cos(cueBackAngle) * 8, stickTipY + Math.sin(cueBackAngle) * 8);
        ctx.stroke();

        // Power arc indicator around cue
        if (dragRef.current.active) {
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(cue.x, cue.y, cue.radius + 14, angle - 0.4, angle + 0.4);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 6. Particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 7. Active Turn Header Banner
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = active.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(100, 16, ARENA_WIDTH - 200, 44, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const roleStr = active.isHuman ? '【あなた】' : active.isPlayerTeam ? '【味方】' : '【相手】';
      ctx.fillText(`${roleStr} ${active.name} のショット 🎱`, ARENA_WIDTH / 2, 38);
      ctx.restore();

      // 8. Large Score / Goal Announcement Banner
      if (bannerRef.current) {
        ctx.save();
        ctx.font = '900 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = bannerRef.current.color;
        ctx.shadowColor = bannerRef.current.color;
        ctx.shadowBlur = 24;
        ctx.fillText(bannerRef.current.text, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
        ctx.restore();
      }
    };

    const loop = () => {
      update();
      render();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, participants, advanceTurn, onGoalScored, checkMatchEnd, triggerSpeech]);

  // Pointer & Drag Handlers for Human Player
  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const active = participants[turnIndexRef.current] || participants[0];
    if (!active.isHuman || turnStateRef.current !== 'AIMING' || matchOverTriggeredRef.current) return;

    const coords = getCoords(e);
    dragRef.current = {
      active: true,
      startX: coords.x,
      startY: coords.y,
      currX: coords.x,
      currY: coords.y,
      power: 0.2,
      angle: Math.atan2(coords.y - cueBallRef.current.y, coords.x - cueBallRef.current.x),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCoords(e);
    hoverPosRef.current = coords;

    if (dragRef.current.active) {
      dragRef.current.currX = coords.x;
      dragRef.current.currY = coords.y;

      const cue = cueBallRef.current;
      const dx = coords.x - dragRef.current.startX;
      const dy = coords.y - dragRef.current.startY;
      const dist = Math.hypot(dx, dy);

      dragRef.current.power = Math.min(1.0, Math.max(0.15, dist / 110));
      dragRef.current.angle = Math.atan2(coords.y - cue.y, coords.x - cue.x);
    }
  };

  const handlePointerUp = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;

    const active = participants[turnIndexRef.current] || participants[0];
    if (!active.isHuman || turnStateRef.current !== 'AIMING' || matchOverTriggeredRef.current) return;

    const cue = cueBallRef.current;
    const hover = hoverPosRef.current;
    const dx = hover.x - cue.x;
    const dy = hover.y - cue.y;
    const angle = Math.atan2(dy, dx);

    const speed = 7.5 + dragRef.current.power * 16.5;
    cue.vx = Math.cos(angle) * speed;
    cue.vy = Math.sin(angle) * speed;

    turnStateRef.current = 'ROLLING';
    shotCooldownFramesRef.current = 40;
    statsRef.current.totalShots += 1;
    sound.playHit(0.95);
    emitSparks(cue.x, cue.y, '#ffffff', 18);
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full select-none touch-none px-1 sm:px-2">
      {/* 2:3 Aspect Ratio Container */}
      <div
        className="relative flex items-center justify-center max-w-full"
        style={{
          aspectRatio: '2 / 3',
          height: 'min(calc(100dvh - 170px), 760px)',
          maxWidth: 'min(100%, calc(min(calc(100dvh - 170px), 760px) * 2 / 3))',
          width: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full object-contain rounded-3xl border-2 border-emerald-600/80 shadow-[0_0_35px_rgba(16,185,129,0.25)] bg-slate-950 cursor-crosshair block"
        />
      </div>

      {/* Information Header & Controls Guide */}
      <div className="mt-2.5 flex items-center justify-between gap-3 max-w-[500px] w-full px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span>🎱 残りボール:</span>
          <span className="font-bold text-amber-400 font-mono text-sm">{remainingBallsCount}個</span>
          <span className="text-[10px] text-slate-500">(8番=3点)</span>
        </div>
        <div className="text-right text-[11px] text-slate-400">
          <span className="text-cyan-400 font-semibold">カーソル/ドラッグで狙ってショット！</span>
        </div>
      </div>
    </div>
  );
}
