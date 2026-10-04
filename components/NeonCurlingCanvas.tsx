'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { MatchConfig, MatchStats, InGameSpeech, Particle, Character } from '@/lib/types';
import { GET_CHARACTER_BY_ID } from '@/lib/characters';
import { sound } from '@/lib/audio';

interface NeonCurlingCanvasProps {
  config: MatchConfig;
  isPaused: boolean;
  onGoalScored: (playerScore: number, opponentScore: number, lastScorer: 'player' | 'opponent') => void;
  onMatchComplete: (stats: MatchStats, won: boolean) => void;
  onSpeech: (speech: InGameSpeech) => void;
}

const ARENA_WIDTH = 600;
const ARENA_HEIGHT = 900;
const STONE_RADIUS = 26;
const HOUSE_X = ARENA_WIDTH / 2;
const HOUSE_Y = 220; // Target house center at top

interface CurlingParticipant {
  id: string;
  name: string;
  isPlayerTeam: boolean;
  isHuman: boolean;
  character?: Character;
  color: string;
}

interface DeliveredStone {
  id: string;
  throwerId: string;
  throwerName: string;
  isPlayerTeam: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  stopped: boolean;
}

export default function NeonCurlingCanvas({
  config,
  isPaused,
  onGoalScored,
  onMatchComplete,
  onSpeech,
}: NeonCurlingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  const is2v2 = config.teamFormat === '2v2' || config.mode === '2v2';

  // Build Turn Order:
  // 1v1: Player (自分) -> Opponent 1 (敵) (repeated 4 times = 8 stones)
  // 2v2: Player (自分) -> Opponent 1 (敵1) -> Ally (味方) -> Opponent 2 (敵2) (repeated 2 times = 8 stones)
  const participants = useMemo<CurlingParticipant[]>(() => {
    const list: CurlingParticipant[] = [];
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

  const TOTAL_STONES = 8;
  const [currentShotNumber, setCurrentShotNumber] = useState(0);
  const shotNumRef = useRef(0);
  useEffect(() => {
    shotNumRef.current = currentShotNumber;
  }, [currentShotNumber]);

  const activeParticipant = participants[currentShotNumber % participants.length];

  // Game state refs
  const scoresRef = useRef({ player: 0, opponent: 0 });
  const onSpeechRef = useRef(onSpeech);
  useEffect(() => {
    onSpeechRef.current = onSpeech;
  }, [onSpeech]);

  // Stones on Ice & Active Throw Stone
  const stonesOnIceRef = useRef<DeliveredStone[]>([]);
  const activeStoneRef = useRef<DeliveredStone | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const bannerRef = useRef<{ text: string; color: string; timer: number } | null>(null);

  // Turn State Machine
  const turnStateRef = useRef<'AIMING' | 'SLIDING' | 'EVALUATING' | 'MATCH_OVER'>('AIMING');
  const isSweepingRef = useRef(false);
  const slideCooldownFramesRef = useRef(0);
  const aiThrowTimerRef = useRef<number | null>(null);
  const matchOverTriggeredRef = useRef(false);

  // Drag Aiming for Human
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
    startX: ARENA_WIDTH / 2,
    startY: 810,
    currX: ARENA_WIDTH / 2,
    currY: 810,
    power: 0.5,
    angle: -Math.PI / 2,
  });

  const statsRef = useRef({
    totalShots: 0,
    stonesInHouse: 0,
    startTime: 0,
  });

  // Trigger speech helper
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

  // Emit Sparks helper
  const emitSparks = (x: number, y: number, color: string, count = 15, mult = 1) => {
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

  // Reset / Spawn Stone for active thrower
  const spawnStoneForTurn = useCallback(
    (participant: CurlingParticipant) => {
      activeStoneRef.current = {
        id: `stone-${Date.now()}`,
        throwerId: participant.id,
        throwerName: participant.name,
        isPlayerTeam: participant.isPlayerTeam,
        x: ARENA_WIDTH / 2,
        y: 810,
        vx: 0,
        vy: 0,
        color: participant.isPlayerTeam ? (config.playerColor || '#06b6d4') : '#f43f5e',
        stopped: false,
      };
      turnStateRef.current = 'AIMING';
      isSweepingRef.current = false;
      slideCooldownFramesRef.current = 0;
    },
    [config.playerColor]
  );

  // Initial mount
  useEffect(() => {
    stonesOnIceRef.current = [];
    spawnStoneForTurn(participants[0]);
    scoresRef.current = { player: 0, opponent: 0 };
    statsRef.current = { totalShots: 0, stonesInHouse: 0, startTime: Date.now() };
    matchOverTriggeredRef.current = false;
  }, [participants, spawnStoneForTurn]);

  // Complete End & Tally Score
  const evaluateEndScore = useCallback(() => {
    if (matchOverTriggeredRef.current) return;
    matchOverTriggeredRef.current = true;
    turnStateRef.current = 'EVALUATING';

    // Collect all stones currently inside the house (dist < 155)
    const inHouse = stonesOnIceRef.current
      .map((s) => ({
        ...s,
        dist: Math.hypot(s.x - HOUSE_X, s.y - HOUSE_Y),
      }))
      .filter((s) => s.dist <= 155)
      .sort((a, b) => a.dist - b.dist);

    statsRef.current.stonesInHouse = inHouse.length;

    let pointsAwarded = 0;
    let winnerIsPlayer = false;

    if (inHouse.length === 0) {
      bannerRef.current = { text: 'BLANK END (両チーム ハウス外)', color: '#94a3b8', timer: 100 };
    } else {
      const winner = inHouse[0];
      winnerIsPlayer = winner.isPlayerTeam;

      // Count consecutive stones closer than opponent's best stone
      for (const s of inHouse) {
        if (s.isPlayerTeam === winnerIsPlayer) {
          pointsAwarded += 1;
        } else {
          break;
        }
      }

      if (winnerIsPlayer) {
        const next = scoresRef.current.player + pointsAwarded;
        scoresRef.current.player = next;
        setPlayerScore(next);
        bannerRef.current = {
          text: `🎯 YOU WIN THE END! +${pointsAwarded} PT!`,
          color: '#06b6d4',
          timer: 110,
        };
        onGoalScored(next, scoresRef.current.opponent, 'player');
        if (is2v2 && config.allyId) triggerSpeech(config.allyId, 'goalScored');
        triggerSpeech(config.opponent1Id, 'goalConceded');
      } else {
        const next = scoresRef.current.opponent + pointsAwarded;
        scoresRef.current.opponent = next;
        setOpponentScore(next);
        bannerRef.current = {
          text: `🎯 OPPONENT WINS END! +${pointsAwarded} PT!`,
          color: '#f43f5e',
          timer: 110,
        };
        onGoalScored(scoresRef.current.player, next, 'opponent');
        triggerSpeech(config.opponent1Id, 'goalScored');
      }
    }

    // Match completion transition without flicker
    setTimeout(() => {
      const pFinal = scoresRef.current.player;
      const oFinal = scoresRef.current.opponent;
      const won = pFinal >= oFinal;
      const matchDurationSec = Math.max(1, Math.floor((Date.now() - statsRef.current.startTime) / 1000));

      onMatchComplete(
        {
          playerGoals: pFinal,
          opponentGoals: oFinal,
          totalShots: statsRef.current.totalShots,
          superSmashes: 0,
          targetsHit: statsRef.current.stonesInHouse,
          longestRally: 0,
          currentRally: 0,
          matchDurationSec,
          mvpName: won ? (config.playerName || 'あなた') : GET_CHARACTER_BY_ID(config.opponent1Id).name,
          mvpColor: won ? (config.playerColor || '#06b6d4') : GET_CHARACTER_BY_ID(config.opponent1Id).themeColor,
        },
        won
      );
    }, 2200);
  }, [config, is2v2, onGoalScored, onMatchComplete, triggerSpeech]);

  // Turn Advance
  const advanceTurn = useCallback(() => {
    if (activeStoneRef.current) {
      activeStoneRef.current.stopped = true;
      stonesOnIceRef.current.push(activeStoneRef.current);
      activeStoneRef.current = null;
    }

    const nextShot = shotNumRef.current + 1;
    setCurrentShotNumber(nextShot);

    if (nextShot >= TOTAL_STONES) {
      evaluateEndScore();
    } else {
      const nextParticipant = participants[nextShot % participants.length];
      spawnStoneForTurn(nextParticipant);
    }
  }, [TOTAL_STONES, evaluateEndScore, participants, spawnStoneForTurn]);

  // AI Turn Delivery
  useEffect(() => {
    if (isPaused || turnStateRef.current !== 'AIMING' || matchOverTriggeredRef.current) return;
    const active = participants[currentShotNumber % participants.length];
    if (!active || active.isHuman || !activeStoneRef.current) return;

    aiThrowTimerRef.current = window.setTimeout(() => {
      if (turnStateRef.current !== 'AIMING' || !activeStoneRef.current) return;
      const stone = activeStoneRef.current;

      // Check if player has stones in house to takeout
      const playerStonesInHouse = stonesOnIceRef.current.filter(
        (s) => s.isPlayerTeam && Math.hypot(s.x - HOUSE_X, s.y - HOUSE_Y) < 140
      );

      let targetX = HOUSE_X + (Math.random() - 0.5) * 35;
      let targetY = HOUSE_Y + (Math.random() - 0.5) * 35;
      let power = 9.4 + (Math.random() - 0.5) * 0.7; // Smooth draw weight

      // Takeout strategy (knock player's stone out)
      if (playerStonesInHouse.length > 0 && Math.random() < 0.65) {
        const closest = playerStonesInHouse[0];
        targetX = closest.x;
        targetY = closest.y;
        power = 12.0; // Heavy takeout power
      }

      const dx = targetX - stone.x;
      const dy = targetY - stone.y;
      const angle = Math.atan2(dy, dx);

      stone.vx = Math.cos(angle) * power;
      stone.vy = Math.sin(angle) * power;

      turnStateRef.current = 'SLIDING';
      slideCooldownFramesRef.current = 40;
      statsRef.current.totalShots += 1;
      sound.playHit(0.85);
      emitSparks(stone.x, stone.y, active.color, 16);

      if (active.character && Math.random() < 0.4) {
        triggerSpeech(active.character.id, 'start');
      }
    }, 1300);

    return () => {
      if (aiThrowTimerRef.current) clearTimeout(aiThrowTimerRef.current);
    };
  }, [currentShotNumber, participants, isPaused, triggerSpeech]);

  // Main Canvas & Physics Loop
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

      const baseFriction = isSweepingRef.current ? 0.9965 : 0.9935; // Sweeping extends glide!
      let anyStoneMoving = false;

      // 1. Move Active Delivered Stone
      const active = activeStoneRef.current;
      if (active && turnStateRef.current === 'SLIDING') {
        active.vx *= baseFriction;
        active.vy *= baseFriction;

        if (Math.hypot(active.vx, active.vy) < 0.05) {
          active.vx = 0;
          active.vy = 0;
          active.stopped = true;
        } else {
          anyStoneMoving = true;
        }

        active.x += active.vx;
        active.y += active.vy;

        // Ice boundary wall bounces
        const rail = 24;
        if (active.x - STONE_RADIUS <= rail) {
          active.x = rail + STONE_RADIUS;
          active.vx = Math.abs(active.vx) * 0.75;
          sound.playWall();
        } else if (active.x + STONE_RADIUS >= ARENA_WIDTH - rail) {
          active.x = ARENA_WIDTH - rail - STONE_RADIUS;
          active.vx = -Math.abs(active.vx) * 0.75;
          sound.playWall();
        }
        if (active.y - STONE_RADIUS <= rail) {
          active.y = rail + STONE_RADIUS;
          active.vy = Math.abs(active.vy) * 0.75;
          sound.playWall();
        }

        // Collisions with Settled Stones on Ice (Takeouts!)
        stonesOnIceRef.current.forEach((settled) => {
          const dx = settled.x - active.x;
          const dy = settled.y - active.y;
          const dist = Math.hypot(dx, dy);
          const minDist = STONE_RADIUS * 2;

          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            settled.x = active.x + nx * minDist;
            settled.y = active.y + ny * minDist;

            const p = 2 * (nx * (active.vx - settled.vx) + ny * (active.vy - settled.vy)) / 2;
            active.vx -= p * nx * 0.93;
            active.vy -= p * ny * 0.93;
            settled.vx += p * nx * 0.93;
            settled.vy += p * ny * 0.93;

            settled.stopped = false;
            sound.playHit(0.9);
            emitSparks(settled.x, settled.y, '#ffffff', 14);
          }
        });
      }

      // 2. Move Settled Stones impacted by collisions
      stonesOnIceRef.current.forEach((st) => {
        if (st.stopped) return;

        st.vx *= 0.993;
        st.vy *= 0.993;
        if (Math.hypot(st.vx, st.vy) < 0.05) {
          st.vx = 0;
          st.vy = 0;
          st.stopped = true;
        } else {
          anyStoneMoving = true;
        }

        st.x += st.vx;
        st.y += st.vy;

        // Side wall bounce
        const rail = 24;
        if (st.x - STONE_RADIUS <= rail) {
          st.x = rail + STONE_RADIUS;
          st.vx = Math.abs(st.vx) * 0.75;
          sound.playWall();
        } else if (st.x + STONE_RADIUS >= ARENA_WIDTH - rail) {
          st.x = ARENA_WIDTH - rail - STONE_RADIUS;
          st.vx = -Math.abs(st.vx) * 0.75;
          sound.playWall();
        }
        if (st.y - STONE_RADIUS <= rail) {
          st.y = rail + STONE_RADIUS;
          st.vy = Math.abs(st.vy) * 0.75;
          sound.playWall();
        }
      });

      if (slideCooldownFramesRef.current > 0) {
        slideCooldownFramesRef.current -= 1;
      }

      // Turn transition after stone has completely stopped
      if (
        turnStateRef.current === 'SLIDING' &&
        slideCooldownFramesRef.current <= 0 &&
        !anyStoneMoving &&
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

      if (bannerRef.current) {
        if (turnStateRef.current !== 'EVALUATING') {
          bannerRef.current.timer -= 1;
          if (bannerRef.current.timer <= 0) bannerRef.current = null;
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // 1. Crystal Cyber Ice Rink Backdrop
      const iceGrad = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
      iceGrad.addColorStop(0, '#0a1d37');
      iceGrad.addColorStop(0.5, '#061327');
      iceGrad.addColorStop(1, '#08172e');
      ctx.fillStyle = iceGrad;
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // Pebble ice sheen grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < ARENA_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_HEIGHT);
        ctx.stroke();
      }

      // Centerline & Tee line (Crosshair through the house)
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ARENA_WIDTH / 2, 0);
      ctx.lineTo(ARENA_WIDTH / 2, ARENA_HEIGHT);
      ctx.stroke();

      // Tee line (horizontal across house center)
      ctx.beginPath();
      ctx.moveTo(20, HOUSE_Y);
      ctx.lineTo(ARENA_WIDTH - 20, HOUSE_Y);
      ctx.stroke();

      // Hog line (horizontal delivery line)
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(20, 720);
      ctx.lineTo(ARENA_WIDTH - 20, 720);
      ctx.stroke();
      ctx.restore();

      // 2. THE TARGET HOUSE (🎯 巨大な同心円ハウス！)
      // 12-ft Blue Ring (radius 155)
      ctx.save();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.28)';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(HOUSE_X, HOUSE_Y, 155, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 8-ft White Ring (radius 105)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(HOUSE_X, HOUSE_Y, 105, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4-ft Red Ring (radius 60)
      ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(HOUSE_X, HOUSE_Y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center "Button" 🎯 (radius 20)
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(HOUSE_X, HOUSE_Y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Find closest stone to Button ("SHOT ROCK")
      const allStones = [...stonesOnIceRef.current];
      if (activeStoneRef.current && turnStateRef.current === 'SLIDING') {
        allStones.push(activeStoneRef.current);
      }

      let closestStoneId: string | null = null;
      let minButtonDist = Infinity;

      allStones.forEach((st) => {
        const d = Math.hypot(st.x - HOUSE_X, st.y - HOUSE_Y);
        if (d < minButtonDist && d <= 155) {
          minButtonDist = d;
          closestStoneId = st.id;
        }
      });

      // 4. Render All Stones (🪨 本格的な立体グラナイト・カーリングストーン！)
      const drawStone = (s: DeliveredStone, isShotRock: boolean) => {
        ctx.save();

        // Drop shadow under stone on ice
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(s.x + 3, s.y + 4, STONE_RADIUS, STONE_RADIUS * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Granite Body: 3D Radial Sphere
        const bodyGrad = ctx.createRadialGradient(
          s.x - STONE_RADIUS * 0.3,
          s.y - STONE_RADIUS * 0.3,
          STONE_RADIUS * 0.1,
          s.x,
          s.y,
          STONE_RADIUS
        );
        bodyGrad.addColorStop(0, '#94a3b8');
        bodyGrad.addColorStop(0.5, '#475569');
        bodyGrad.addColorStop(1, '#1e293b');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, STONE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Metallic Striking Band Rim
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Team Colored Top Plate (Red vs Cyan/Blue)
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(s.x, s.y, STONE_RADIUS * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Chrome Gooseneck Handle with Grip
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(s.x - 6, s.y - 14, 12, 28, 5);
        ctx.fill();

        // Handle grip inlay
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.roundRect(s.x - 3, s.y - 9, 6, 18, 3);
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Shot Rock Crown Halo
        if (isShotRock) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.arc(s.x, s.y, STONE_RADIUS + 8, 0, Math.PI * 2);
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#fbbf24';
          ctx.textAlign = 'center';
          ctx.fillText('★ SHOT ROCK (得点圏 No.1)', s.x, s.y - STONE_RADIUS - 12);
        }
        ctx.restore();
      };

      // Settled stones
      stonesOnIceRef.current.forEach((st) => {
        drawStone(st, closestStoneId === st.id);
      });

      // Active throw stone
      if (activeStoneRef.current) {
        drawStone(activeStoneRef.current, closestStoneId === activeStoneRef.current.id);
      }

      // 5. Aiming Line & Power Gauge for Human Player
      const active = participants[currentShotNumber % participants.length];
      if (active.isHuman && turnStateRef.current === 'AIMING' && activeStoneRef.current) {
        const st = activeStoneRef.current;
        const drag = dragRef.current;

        const aimAngle = drag.active ? drag.angle : Math.atan2(HOUSE_Y - st.y, HOUSE_X - st.x);
        const aimDist = 280 + drag.power * 260;

        // Dotted Laser Aim
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(st.x + Math.cos(aimAngle) * aimDist, st.y + Math.sin(aimAngle) * aimDist);
        ctx.stroke();
        ctx.restore();

        // Power gauge bar next to delivery line
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(ARENA_WIDTH / 2 - 80, 848, 160, 16, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.roundRect(ARENA_WIDTH / 2 - 78, 850, 156 * drag.power, 12, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('POWER', ARENA_WIDTH / 2, 859);
        ctx.restore();
      }

      // 6. Sweeping prompt while stone is sliding
      if (turnStateRef.current === 'SLIDING' && active.isHuman) {
        ctx.save();
        ctx.font = '900 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = isSweepingRef.current ? '#38bdf8' : '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = isSweepingRef.current ? 18 : 6;
        ctx.fillText(
          isSweepingRef.current ? '🧹 SWEEPING!! (加速中・距離延長)' : '長押しでスウィープ (減速防止！)',
          ARENA_WIDTH / 2,
          755
        );
        ctx.restore();
      }

      // 7. Particles (Sparks & Ice sweep chips)
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

      // 8. Turn Banner Header (No flickering!)
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = active.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(80, 16, ARENA_WIDTH - 160, 44, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const roleStr = active.isHuman ? '【あなた】' : active.isPlayerTeam ? '【味方】' : '【相手】';
      const shotDisplay = Math.min(TOTAL_STONES, currentShotNumber + 1);
      ctx.fillText(`🥌 ${roleStr} ${active.name} の投球 [${shotDisplay} / ${TOTAL_STONES}]`, ARENA_WIDTH / 2, 38);
      ctx.restore();

      // 9. Large Outcome Banner
      if (bannerRef.current) {
        ctx.save();
        ctx.font = '900 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = bannerRef.current.color;
        ctx.shadowColor = bannerRef.current.color;
        ctx.shadowBlur = 24;
        ctx.fillText(bannerRef.current.text, ARENA_WIDTH / 2, HOUSE_Y + 190);
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
  }, [currentShotNumber, isPaused, participants, TOTAL_STONES, advanceTurn]);

  // Pointer & Sweeping Handlers
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
    const active = participants[currentShotNumber % participants.length];

    // While stone is sliding: sweeping!
    if (turnStateRef.current === 'SLIDING' && active.isHuman) {
      isSweepingRef.current = true;
      sound.playHit(0.5);
      return;
    }

    if (!active.isHuman || turnStateRef.current !== 'AIMING' || !activeStoneRef.current) return;
    const coords = getCoords(e);
    dragRef.current = {
      active: true,
      startX: coords.x,
      startY: coords.y,
      currX: coords.x,
      currY: coords.y,
      power: 0.45,
      angle: Math.atan2(HOUSE_Y - activeStoneRef.current.y, HOUSE_X - activeStoneRef.current.x),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCoords(e);
    if (dragRef.current.active && activeStoneRef.current) {
      const stone = activeStoneRef.current;
      const dx = coords.x - stone.x;
      const dy = coords.y - stone.y;

      let angle = Math.atan2(dy, dx);
      if (dy > 0) {
        // If pulled backwards, shoot forward
        angle = Math.atan2(-dy, -dx);
      }
      dragRef.current.angle = angle;
      const dist = Math.hypot(dx, dy);
      dragRef.current.power = Math.min(1.0, Math.max(0.2, dist / 160));
    }
  };

  const handlePointerUp = () => {
    if (isSweepingRef.current) {
      isSweepingRef.current = false;
      return;
    }

    if (!dragRef.current.active) return;
    dragRef.current.active = false;

    const active = participants[currentShotNumber % participants.length];
    if (!active.isHuman || turnStateRef.current !== 'AIMING' || !activeStoneRef.current) return;

    const stone = activeStoneRef.current;
    let angle = dragRef.current.angle;
    if (!angle || Math.sin(angle) > -0.1) {
      angle = Math.atan2(HOUSE_Y - stone.y, HOUSE_X - stone.x);
    }

    const speed = 7.2 + dragRef.current.power * 5.0;
    stone.vx = Math.cos(angle) * speed;
    stone.vy = Math.sin(angle) * speed;

    turnStateRef.current = 'SLIDING';
    slideCooldownFramesRef.current = 40;
    statsRef.current.totalShots += 1;
    sound.playHit(0.9);
    emitSparks(stone.x, stone.y, '#ffffff', 16);
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full select-none touch-none px-1 sm:px-2">
      {/* 2:3 Aspect Ratio Strict Container */}
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
          className="w-full h-full object-contain rounded-3xl border-2 border-cyan-500/80 shadow-[0_0_35px_rgba(6,182,212,0.25)] bg-slate-950 cursor-crosshair block"
        />
      </div>

      {/* Information Header & Controls Guide */}
      <div className="mt-2.5 flex items-center justify-between gap-3 max-w-[500px] w-full px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span>🎯 ハウス（同心円）の中心を狙え！</span>
        </div>
        <div className="text-right text-[11px] text-cyan-400 font-semibold">
          ドラッグで投球 · 滑走中は長押しでスウィープ！
        </div>
      </div>
    </div>
  );
}
