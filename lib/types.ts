export type TeamFormat = '1v1' | '2v2';

export type GameMode = 
  | '1v1'           // Standard 1 vs 1 duel (Classic)
  | '2v2'           // 2 vs 2 Tag Team (Player + Ally NPC vs 2 Opponent NPCs)
  | 'classic'       // Classic single puck match
  | 'double_puck'   // 2 pucks simultaneously on court
  | 'bumpers'       // Center glowing bumpers with shock rebounds
  | 'speed_rush'    // 60-second score rush
  | 'target_break'  // Spawn targets on court to hit for points
  | 'billiards'     // 🎱 NEON BILLIARDS: Pot colorful balls into neon pockets
  | 'curling'       // 🥌 NEON CURLING: Slide stones closest to the center house
  | 'multi_ball';   // 🌈 NEON MULTI BALL: Massive flurry of colorful neon balls from center

export type GameState = 'TITLE' | 'SETUP' | 'ROSTER' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'HOWTOPLAY';

export interface CharacterStats {
  speed: number;   // 50 - 100
  power: number;   // 50 - 100
  defense: number; // 50 - 100
  curve: number;   // 50 - 100
}

export interface CharacterQuotes {
  start: string[];
  goalScored: string[];
  goalConceded: string[];
  allyPass?: string[];
  allySave?: string[];
  intenseRally?: string[];
  smash?: string[];
  victory?: string[];
  defeat?: string[];
  billiards?: string[];
  curling?: string[];
}

export interface Character {
  id: string;
  name: string;
  fullName: string;
  reading: string;
  nickname: string;
  category: 'highschool' | 'college';
  gender: 'female' | 'male';
  grade: string; // '高校2年生', '高校1年生', '大学生'
  dialect?: string;
  mbti: string;
  socionics: string;
  enneagram: string;
  motif: string;
  themeColor: string;
  accentColor: string;
  avatarEmoji: string;
  imagePath?: string;
  tagline: string;
  personality: string;
  playStyle: string;
  stats: CharacterStats;
  aiParameters: {
    aggression: number;       // 0.2 to 0.95 (how far forward they push)
    reactionSpeed: number;    // lower = faster reaction
    smashProbability: number; // 0.1 to 0.9
    defenseLineY: number;     // 0.1 to 0.35 of field
    aimSpread: number;        // angle randomness (lower = sharper aim)
  };
  quotes: CharacterQuotes;
}

export interface MatchConfig {
  teamFormat: TeamFormat;   // '1v1' or '2v2'
  mode: GameMode;
  targetScore: number;
  timeLimitSeconds: number; // for speed_rush
  playerName: string;
  playerColor: string;
  allyId?: string;          // in 2v2 mode
  opponent1Id: string;
  opponent2Id?: string;     // in 2v2 mode
  difficulty: 'easy' | 'normal' | 'hard';
  goalCountdown?: boolean;  // false = immediate rapid restart (high tempo), true = countdown after each goal
}

export interface BilliardPocket {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface BilliardBall {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  number: number;
  points: number;
  potted: boolean;
  highlightColor?: string;
  shadowColor?: string;
  isStriped?: boolean;
  isEight?: boolean;
}

export interface CurlingStone {
  id: string;
  isPlayerTeam: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  stopped: boolean;
}

export interface Mallet {
  id: string;
  isPlayer: boolean;
  isTeamPlayer: boolean; // true = player's side (bottom), false = opponent side (top)
  character?: Character;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  color: string;
  targetX?: number;
  targetY?: number;
}

export interface Puck {
  id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number; alpha: number }[];
  color: string;
  isSuperCharged?: boolean;
}

export interface Bumper {
  id: string;
  x: number;
  y: number;
  radius: number;
  pulseTimer: number;
  color: string;
}

export interface TargetNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  points: number;
  color: string;
  active: boolean;
  pulsePhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface InGameSpeech {
  id: string;
  character: Character;
  text: string;
  timeRemaining: number; // ms
  isAlly: boolean;
}

export interface MatchStats {
  playerGoals: number;
  opponentGoals: number;
  totalShots: number;
  superSmashes: number;
  targetsHit: number;
  longestRally: number;
  currentRally: number;
  matchDurationSec: number;
  mvpName: string;
  mvpColor: string;
}
