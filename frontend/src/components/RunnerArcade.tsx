import { useCallback, useEffect, useRef, useState } from 'react';
import { arcadeAudio } from '../utils/arcadeAudio';

const W = 820;
const H = 360;
const GROUND_Y = 304;
const GRAVITY = 0.82;
const JUMP = -13.2;
const DOUBLE_JUMP = -12.2;

interface Platform { x: number; y: number; w: number; h: number }
interface Enemy { x: number; y: number; w: number; h: number; dir: 1 | -1; minX: number; maxX: number; speed: number; alive: boolean }
interface Coin { x: number; y: number; taken: boolean }
interface Mushroom { x: number; y: number; w: number; h: number; vy: number; taken: boolean }
interface BonusBlock { x: number; y: number; w: number; h: number; hit: boolean; type: 'coin' | 'mushroom' }
interface Flagpole { x: number; y: number; w: number; h: number }
interface Cloud {
  x: number;
  y: number;
  baseY: number;
  w: number;
  h: number;
  speed: number;
  floatOffset: number;
  floatSpeed: number;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  isBig: boolean;
  isCrouching: boolean;
  grounded: boolean;
  jumpsLeft: number;
  invulnerableTimer: number;
  facing: 'left' | 'right';
  animFrame: number;
}

interface RunnerState {
  player: Player;
  platforms: Platform[];
  enemies: Enemy[];
  coins: Coin[];
  mushrooms: Mushroom[];
  bonusBlocks: BonusBlock[];
  clouds: Cloud[];
  flagpole: Flagpole;
  cameraX: number;
  phase: 'idle' | 'play' | 'over' | 'win';
  score: number;
  lives: number;
  worldLevel: number;
  generatedX: number;
  frame: number;
}

function hit(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function initLevel(worldLevel = 1): RunnerState {
  const initialState: RunnerState = {
    player: {
      x: 50,
      y: GROUND_Y - 32,
      vx: 0,
      vy: 0,
      w: 24,
      h: 32,
      isBig: false,
      isCrouching: false,
      grounded: true,
      jumpsLeft: 2,
      invulnerableTimer: 0,
      facing: 'right',
      animFrame: 0,
    },
    platforms: [],
    enemies: [],
    coins: [],
    mushrooms: [],
    bonusBlocks: [],
    clouds: [],
    flagpole: { x: 3200, y: GROUND_Y - 180, w: 30, h: 180 },
    cameraX: 0,
    phase: 'idle',
    score: 0,
    lives: 3,
    worldLevel,
    generatedX: 0,
    frame: 0,
  };

  generateChunk(initialState, 0, 3000);
  return initialState;
}

function generateChunk(state: RunnerState, startX: number, endX: number) {
  // Generazione nuvole posizionate in fasce del cielo che non disturbano HUD e blocchi
  let cloudX = startX + Math.random() * 80;
  while (cloudX < endX && cloudX < 3200) {
    // Genera a due altezze principali per un look bilanciato
    const baseY = Math.random() > 0.5 ? 55 + Math.random() * 25 : 180 + Math.random() * 30;
    state.clouds.push({
      x: cloudX,
      y: baseY,
      baseY,
      w: 56, // Dimensione fissa 8-bit ben proporzionata
      h: 24,
      speed: 0.2 + Math.random() * 0.3,
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.015 + Math.random() * 0.02,
    });
    cloudX += 180 + Math.random() * 160;
  }

  let x = Math.max(300, startX);
  while (x < endX) {
    const spacing = 200 + Math.random() * 150;
    x += spacing;

    if (x >= 3000) break;

    const platW = 110 + Math.random() * 110;
    const platY = 140 + Math.random() * 50;

    state.platforms.push({ x, y: platY, w: platW, h: 22 });

    if (Math.random() > 0.3) {
      const bType = Math.random() > 0.6 ? 'mushroom' : 'coin';
      state.bonusBlocks.push({ x: x + platW / 2 - 13, y: platY - 85, w: 26, h: 26, hit: false, type: bType });
    }

    if (Math.random() > 0.4) {
      state.coins.push({ x: x + 20, y: platY - 26, taken: false });
      state.coins.push({ x: x + 50, y: platY - 26, taken: false });
    }

    if (Math.random() > 0.35) {
      const onPlat = Math.random() > 0.5;
      const ey = onPlat ? platY - 24 : GROUND_Y - 24;
      const ex = onPlat ? x + 10 : x + 20;
      state.enemies.push({
        x: ex,
        y: ey,
        w: 24,
        h: 24,
        dir: -1,
        minX: ex - 40,
        maxX: ex + platW,
        speed: 1.1 + Math.random() * 0.5,
        alive: true,
      });
    }
  }
  state.generatedX = endX;
}

export default function RunnerArcade() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RunnerState>(initLevel(1));
  const frameRef = useRef<number>(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  const [phase, setPhase] = useState<'idle' | 'play' | 'over' | 'win'>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [worldLevel, setWorldLevel] = useState(1);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('mario-hs') ?? '0', 10));
  const [isMuted, setIsMuted] = useState(arcadeAudio.getMuted());

  const reset = useCallback(() => {
    arcadeAudio.stopMusic();
    cancelAnimationFrame(frameRef.current);
    stateRef.current = initLevel(1);
    setScore(0);
    setLives(3);
    setWorldLevel(1);
    setPhase('idle');
  }, []);

  const start = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const currLevel = stateRef.current.worldLevel || 1;
    stateRef.current = { ...initLevel(currLevel), phase: 'play' };
    setPhase('play');
    arcadeAudio.startChiptuneMusic();
  }, []);

  const nextLevel = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const nextLvl = stateRef.current.worldLevel + 1;
    const currentScore = stateRef.current.score;
    const currentLives = stateRef.current.lives;

    const nextState = initLevel(nextLvl);
    nextState.score = currentScore;
    nextState.lives = currentLives;
    nextState.phase = 'play';

    stateRef.current = nextState;
    setWorldLevel(nextLvl);
    setPhase('play');
    arcadeAudio.startChiptuneMusic();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current[e.key.toLowerCase()] = true;

      const p = stateRef.current.player;
      if ([' ', 'arrowup', 'w'].includes(e.key.toLowerCase()) && p.jumpsLeft > 0 && stateRef.current.phase === 'play') {
        p.vy = p.grounded ? JUMP : DOUBLE_JUMP;
        p.grounded = false;
        p.jumpsLeft -= 1;
        arcadeAudio.playJump();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'play') {
      arcadeAudio.stopMusic();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const endRun = (won: boolean) => {
      arcadeAudio.stopMusic();
      if (won) arcadeAudio.playPowerup();
      else arcadeAudio.playGameOver();
      const state = stateRef.current;
      state.phase = won ? 'win' : 'over';
      setPhase(state.phase);
      const high = Math.max(Math.floor(state.score), parseInt(localStorage.getItem('mario-hs') ?? '0', 10));
      localStorage.setItem('mario-hs', String(high));
      setBest(high);
      cancelAnimationFrame(frameRef.current);
    };

    const loop = () => {
      const state = stateRef.current;
      state.frame += 1;
      const p = state.player;

      if (p.invulnerableTimer > 0) p.invulnerableTimer--;

      const SPEED = 4.2;
      p.vx = 0;
      if (keysRef.current['arrowleft'] || keysRef.current['a']) {
        p.vx = -SPEED;
        p.facing = 'left';
      }
      if (keysRef.current['arrowright'] || keysRef.current['d']) {
        p.vx = SPEED;
        p.facing = 'right';
      }

      if (p.vx !== 0 && p.grounded) {
        p.animFrame += 0.25;
      } else {
        p.animFrame = 0;
      }

      p.isCrouching = false;
      if ((keysRef.current['arrowdown'] || keysRef.current['s']) && p.isBig && p.grounded) {
        p.isCrouching = true;
      }

      const targetH = p.isBig ? (p.isCrouching ? 32 : 52) : 32;
      if (p.h !== targetH) {
        p.y -= (targetH - p.h);
        p.h = targetH;
      }

      p.x += p.vx;
      p.x = Math.max(0, p.x);

      // Movimento orizzontale e galleggiamento nuvole
      state.clouds.forEach((cl) => {
        cl.x += cl.speed;
        cl.floatOffset += cl.floatSpeed;
        cl.y = cl.baseY + Math.sin(cl.floatOffset) * 3;
      });

      if (p.x + W * 1.5 > state.generatedX && state.generatedX < 3000) {
        generateChunk(state, state.generatedX, state.generatedX + 1000);
      }

      const allSolids = [...state.platforms, ...state.bonusBlocks];
      allSolids.forEach((b) => {
        if (hit(p.x, p.y, p.w, p.h, b.x, b.y, b.w, b.h)) {
          if (p.vx > 0) p.x = b.x - p.w;
          else if (p.vx < 0) p.x = b.x + b.w;
        }
      });

      const prevY = p.y;
      p.vy += GRAVITY;
      p.y += p.vy;
      p.grounded = false;

      if (p.y >= GROUND_Y - p.h) {
        p.y = GROUND_Y - p.h;
        p.vy = 0;
        p.grounded = true;
        p.jumpsLeft = 2;
      }

      allSolids.forEach((b) => {
        if (hit(p.x, p.y, p.w, p.h, b.x, b.y, b.w, b.h)) {
          if (p.vy >= 0 && prevY + p.h <= b.y + 10) {
            p.y = b.y - p.h;
            p.vy = 0;
            p.grounded = true;
            p.jumpsLeft = 2;
          } else if (p.vy < 0 && prevY >= b.y + b.h - 10) {
            p.y = b.y + b.h;
            p.vy = 1.5;

            if ('hit' in b && !b.hit) {
              const block = b as BonusBlock;
              block.hit = true;
              if (block.type === 'mushroom') {
                state.mushrooms.push({ x: block.x + 1, y: block.y - 24, w: 24, h: 24, vy: -3, taken: false });
              } else {
                state.coins.push({ x: block.x + block.w / 2, y: block.y - 20, taken: false });
              }
              state.score += 60;
            }
          }
        }
      });

      state.cameraX = Math.max(0, p.x - W / 3);

      state.enemies.forEach((e) => {
        if (!e.alive) return;
        e.x += e.dir * e.speed;
        if (e.x <= e.minX || e.x >= e.maxX) e.dir *= -1;

        if (hit(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) {
          if (p.vy > 0 && prevY + p.h <= e.y + 12) {
            e.alive = false;
            p.vy = JUMP * 0.55;
            state.score += 100;
          } else if (p.invulnerableTimer === 0) {
            if (p.isBig) {
              p.isBig = false;
              p.invulnerableTimer = 60;
            } else {
              state.lives -= 1;
              setLives(state.lives);
              p.invulnerableTimer = 90;
              if (state.lives <= 0) {
                endRun(false);
                return;
              }
            }
          }
        }
      });

      state.mushrooms.forEach((m) => {
        if (m.taken) return;
        m.x += 1.4;
        m.vy += GRAVITY;
        m.y += m.vy;

        if (m.y >= GROUND_Y - m.h) {
          m.y = GROUND_Y - m.h;
          m.vy = 0;
        }

        if (hit(p.x, p.y, p.w, p.h, m.x, m.y, m.w, m.h)) {
          m.taken = true;
          p.isBig = true;
          state.score += 200;
        }
      });

      state.coins.forEach((c) => {
        if (!c.taken && hit(p.x, p.y, p.w, p.h, c.x - 8, c.y - 8, 16, 16)) {
          c.taken = true;
          state.score += 50;
        }
      });

      const fp = state.flagpole;
      if (hit(p.x, p.y, p.w, p.h, fp.x, fp.y, fp.w, fp.h)) {
        state.score += 500;
        endRun(true);
        return;
      }

      setScore(Math.floor(state.score));

      // ─── RENDER CANVAS ───────────────────────────────────────────
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.translate(-state.cameraX, 0);

      ctx.fillStyle = '#5c94fc';
      ctx.fillRect(state.cameraX, 0, W, H);

      // ─── NUVOLE NES RETRO AUTENTICHE ─────────────────────────────
      state.clouds.forEach((cl) => {
        const cx = cl.x;
        const cy = cl.y;

        // Bordo / Ombra scura azzurra retro
        ctx.fillStyle = '#204890';
        ctx.fillRect(cx - 2, cy + 4, 60, 18);
        ctx.fillRect(cx + 10, cy - 4, 36, 10);
        ctx.fillRect(cx + 18, cy - 8, 20, 8);

        // Corpo Bianco Nuvola
        ctx.fillStyle = '#ffffff';
        // Pancia base
        ctx.fillRect(cx, cy + 6, 56, 14);
        // Cupola centrale
        ctx.fillRect(cx + 12, cy - 2, 32, 10);
        // Cima alta
        ctx.fillRect(cx + 20, cy - 6, 16, 6);
        // Cupola sinistra e destra
        ctx.fillRect(cx + 4, cy + 2, 14, 8);
        ctx.fillRect(cx + 38, cy + 2, 14, 8);

        // Dettaglio occhietto/ombra stile 8-bit NES (opzionale)
        ctx.fillStyle = '#80b0f8';
        ctx.fillRect(cx + 8, cy + 14, 12, 3);
        ctx.fillRect(cx + 36, cy + 14, 12, 3);
      });

      ctx.fillStyle = '#c84c0c';
      ctx.fillRect(0, GROUND_Y, 3500, H - GROUND_Y);
      ctx.fillStyle = '#00a800';
      ctx.fillRect(0, GROUND_Y, 3500, 8);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, GROUND_Y, 3500, 2);

      state.platforms.forEach((plat) => {
        ctx.fillStyle = '#c84c0c';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#000000';
        for (let bx = plat.x + 20; bx < plat.x + plat.w; bx += 24) {
          ctx.fillRect(bx, plat.y, 2, plat.h);
        }
      });

      state.bonusBlocks.forEach((b) => {
        if (b.hit) {
          ctx.fillStyle = '#8c5214';
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, b.y, b.w, b.h);
        } else {
          ctx.fillStyle = '#fc9838';
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 15px monospace';
          ctx.fillText('?', b.x + 7, b.y + 19);
        }
      });

      state.mushrooms.forEach((m) => {
        if (m.taken) return;
        ctx.fillStyle = '#e40058';
        ctx.fillRect(m.x, m.y, m.w, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(m.x + 4, m.y + 3, 5, 5);
        ctx.fillRect(m.x + 15, m.y + 3, 5, 5);
        ctx.fillStyle = '#fcbe94';
        ctx.fillRect(m.x + 4, m.y + 14, 16, 10);
        ctx.fillStyle = '#000000';
        ctx.fillRect(m.x + 7, m.y + 16, 3, 5);
        ctx.fillRect(m.x + 14, m.y + 16, 3, 5);
      });

      state.enemies.forEach((e) => {
        if (!e.alive) return;
        ctx.fillStyle = '#a81000';
        ctx.fillRect(e.x + 2, e.y, e.w - 4, 14);
        ctx.fillRect(e.x, e.y + 4, e.w, 10);
        ctx.fillStyle = '#fcbe94';
        ctx.fillRect(e.x + 4, e.y + 12, e.w - 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(e.x + 4, e.y + 8, 4, 7);
        ctx.fillRect(e.x + 15, e.y + 8, 4, 7);
        ctx.fillStyle = '#000000';
        ctx.fillRect(e.x + 6, e.y + 9, 2, 5);
        ctx.fillRect(e.x + 15, e.y + 9, 2, 5);
        ctx.fillRect(e.x - 1, e.y + e.h - 4, 8, 4);
        ctx.fillRect(e.x + e.w - 7, e.y + e.h - 4, 8, 4);
      });

      state.coins.forEach((c) => {
        if (c.taken) return;
        ctx.fillStyle = '#fce400';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c84c0c';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      ctx.fillStyle = '#00a800';
      ctx.fillRect(fp.x + 10, fp.y, 8, fp.h);
      ctx.fillStyle = '#fce400';
      ctx.fillRect(fp.x + 6, fp.y - 10, 16, 10);
      ctx.fillStyle = '#e40058';
      ctx.beginPath();
      ctx.moveTo(fp.x + 10, fp.y + 10);
      ctx.lineTo(fp.x - 30, fp.y + 25);
      ctx.lineTo(fp.x + 10, fp.y + 40);
      ctx.closePath();
      ctx.fill();

      // ─── MARIO ANATOMICO E DINAMICO ──────────────────────────────────
      // ─── PIXEL SPIDERMAN DINAMICO E ANATOMICO ──────────────────────────────────
      if (p.invulnerableTimer % 6 < 3) {
        ctx.save();
        const mx = p.x;
        const mw = p.w;
        const mh = p.h;
        const isRight = p.facing === 'right';

        const walkCycle = Math.floor(p.animFrame) % 4;
        const isMoving = p.vx !== 0 && p.grounded;
        const bobY = isMoving && (walkCycle === 1 || walkCycle === 3) ? -2 : 0;
        const my = p.y + bobY;

        let armFrontOffset = 0;
        let armBackOffset = 0;
        let armYOffset = 0;

        if (!p.grounded) {
          armYOffset = -8;
          armFrontOffset = isRight ? 6 : -6;
          armBackOffset = isRight ? -6 : 6;
        } else if (isMoving) {
          if (walkCycle === 1) {
            armFrontOffset = isRight ? -5 : 5;
            armBackOffset = isRight ? 5 : -5;
          } else if (walkCycle === 3) {
            armFrontOffset = isRight ? 5 : -5;
            armBackOffset = isRight ? -5 : 5;
          }
        }

        // Web shooting visual tracer when jumping
        if (!p.grounded) {
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(mx + mw / 2 + (isRight ? 10 : -10), my - 2);
          ctx.lineTo(mx + mw / 2 + (isRight ? 40 : -40), my - 70);
          ctx.stroke();
          ctx.restore();
        }

        // 1. MASK / HEAD (Spidey Red + Black web lines + Angular White Lenses)
        ctx.fillStyle = '#e62429';
        ctx.fillRect(mx + 3, my, 18, 12);
        ctx.fillStyle = '#000000';
        // Web lines on mask
        ctx.fillRect(mx + 11, my, 2, 12);
        ctx.fillRect(mx + 3, my + 6, 18, 1);
        
        // Large White Spider Lenses/Eyes
        ctx.fillStyle = '#ffffff';
        if (isRight) {
          ctx.fillRect(mx + 12, my + 3, 7, 5);
          ctx.fillRect(mx + 14, my + 2, 4, 1);
          ctx.fillStyle = '#000000';
          ctx.fillRect(mx + 11, my + 3, 1, 5);
          ctx.fillRect(mx + 19, my + 4, 1, 3);
        } else {
          ctx.fillRect(mx + 5, my + 3, 7, 5);
          ctx.fillRect(mx + 6, my + 2, 4, 1);
          ctx.fillStyle = '#000000';
          ctx.fillRect(mx + 12, my + 3, 1, 5);
          ctx.fillRect(mx + 4, my + 4, 1, 3);
        }

        // 2. TORSO & SUIT (Red Center with Spider Symbol, Blue Sides)
        ctx.fillStyle = '#0b5ed7'; // Blue sides
        ctx.fillRect(mx + 2, my + 12, 20, 10);
        ctx.fillStyle = '#e62429'; // Red chest
        ctx.fillRect(mx + 6, my + 12, 12, 10);
        // Black Spider Emblem on Chest
        ctx.fillStyle = '#000000';
        ctx.fillRect(mx + 11, my + 14, 2, 5);
        ctx.fillRect(mx + 9, my + 15, 6, 2);
        ctx.fillRect(mx + 8, my + 13, 2, 2);
        ctx.fillRect(mx + 14, my + 13, 2, 2);

        // 3. ARMS & WEB SHOOTER GLOVES
        ctx.fillStyle = '#e62429';
        ctx.fillRect(mx - 2 + armBackOffset, my + 12 + armYOffset, 5, 8);
        ctx.fillStyle = '#ffffff'; // White web shooter wrist
        ctx.fillRect(mx - 2 + armBackOffset, my + 18 + armYOffset, 5, 3);

        ctx.fillStyle = '#e62429';
        ctx.fillRect(mx + mw - 3 + armFrontOffset, my + 12 + armYOffset, 5, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx + mw - 3 + armFrontOffset, my + 18 + armYOffset, 5, 3);

        // 4. LEGS & RED BOOTS (Spidey Blue Tights + Red Boots)
        ctx.fillStyle = '#0b5ed7';
        if (!p.grounded) {
          ctx.fillRect(mx + 2, my + 22, 8, 5);
          ctx.fillRect(mx + 14, my + 22, 8, 5);
          ctx.fillStyle = '#e62429'; // Red Boots
          ctx.fillRect(mx, my + 27, 8, 5);
          ctx.fillRect(mx + 16, my + 27, 8, 5);
        } else if (isMoving) {
          ctx.fillRect(mx + 4, my + 22, 16, 5);
          ctx.fillStyle = '#e62429'; // Red Boots
          if (walkCycle === 0) {
            ctx.fillRect(mx + 2, my + mh - 5, 9, 5);
            ctx.fillRect(mx + 13, my + mh - 5, 9, 5);
          } else if (walkCycle === 1) {
            ctx.fillRect(mx - 2, my + mh - 5, 10, 5);
            ctx.fillRect(mx + mw - 6, my + mh - 5, 10, 5);
          } else if (walkCycle === 2) {
            ctx.fillRect(mx + 5, my + mh - 5, 14, 5);
          } else {
            ctx.fillRect(mx + mw - 6, my + mh - 5, 10, 5);
            ctx.fillRect(mx - 2, my + mh - 5, 10, 5);
          }
        } else {
          ctx.fillRect(mx + 4, my + 22, 16, 5);
          ctx.fillStyle = '#e62429'; // Red Boots
          ctx.fillRect(mx + 2, my + mh - 5, 9, 5);
          ctx.fillRect(mx + mw - 9, my + mh - 5, 9, 5);
        }

        ctx.restore();
      }

      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`SPIDEY`, 20, 24);
      ctx.fillText(`${String(Math.floor(state.score)).padStart(6, '0')}`, 20, 40);

      ctx.fillStyle = '#ff2a4b';
      ctx.fillText(`♥ × ${state.lives}`, 200, 24);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(`WORLD`, 360, 24);
      ctx.fillText(`1-${state.worldLevel}`, 370, 40);

      ctx.fillText(`STATUS: ${p.isBig ? 'BIG' : 'SMALL'}`, 530, 24);

      ctx.fillText(`TOP`, 710, 24);
      ctx.fillText(`${String(Math.max(best, Math.floor(state.score))).padStart(6, '0')}`, 710, 40);

      ctx.restore();

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [phase, best]);

  return (
      <div className="arcade-panel runner-panel">
        <div className="arcade-subheader">
          <div>
            <h2>🍄 SUPER MARIO PLATFORM</h2>
            <p>Scorrimento libero con nuvole stile NES autentiche e movimento dinamico!</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn btn-small btn-yellow"
              onClick={() => arcadeAudio.playTestSound()}
              style={{ background: '#ffd700', color: '#000', fontWeight: 'bold' }}
            >
              🔔 PROVA AUDIO
            </button>
            <button
              className="btn btn-small btn-primary"
              onClick={() => setIsMuted(arcadeAudio.toggleMute())}
            >
              {isMuted ? '🔇 AUDIO: OFF' : '🔊 MUSIC: ON'}
            </button>
            <span style={{ color: '#e40058', fontSize: '11px', fontWeight: 'bold' }}>VITE: {'♥'.repeat(Math.max(0, lives))}</span>
          </div>
        </div>

        <div className="canvas-wrapper runner-wrapper" style={{ borderColor: '#00a800', boxShadow: '0 0 15px rgba(0,168,0,0.3)' }}>
          <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
          {phase === 'idle' && (
              <div className="game-overlay" style={{ background: 'rgba(92, 148, 252, 0.94)' }}>
                <div className="game-big-title" style={{ color: '#fce400', textShadow: '3px 3px #e40058' }}>SUPER<br />MARIO PLATFORM</div>
                <div className="game-sub" style={{ color: '#ffffff', textShadow: '1px 1px #000' }}>— RETRO CLOUDS EDITION —</div>
                <button className="btn btn-primary" style={{ background: '#e40058', borderColor: '#ffffff', color: '#fff' }} onClick={start}>▶ START GAME</button>
                <div className="game-controls-hint" style={{ color: '#ffffff' }}>Controlla Mario con A/D/W/S o le Frecce!</div>
              </div>
          )}
          {phase === 'over' && (
              <div className="game-overlay" style={{ background: 'rgba(0, 0, 0, 0.88)' }}>
                <div className="game-big-title" style={{ color: '#e40058' }}>GAME<br />OVER</div>
                <div className="game-score-display" style={{ color: '#fff' }}>PUNTEGGIO: {score}</div>
                <div className="game-score-display" style={{ color: '#fce400' }}>RECORD: {Math.max(score, best)}</div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-danger" style={{ background: '#e40058', color: '#fff' }} onClick={start}>↺ Riprova</button>
                  <button className="btn" style={{ background: '#00a800', color: '#fff' }} onClick={reset}>Menu</button>
                </div>
              </div>
          )}
          {phase === 'win' && (
              <div className="game-overlay" style={{ background: 'rgba(0, 168, 0, 0.90)' }}>
                <div className="game-big-title" style={{ color: '#fce400', textShadow: '3px 3px #000' }}>WORLD 1-{worldLevel}<br />CLEAR!</div>
                <div className="game-score-display" style={{ color: '#fff' }}>PUNTEGGIO PARZIALE: {score}</div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-primary" style={{ background: '#fce400', color: '#000', borderColor: '#fff' }} onClick={nextLevel}>▶ PROSSIMO LIVELLO (1-{worldLevel + 1})</button>
                  <button className="btn" style={{ background: '#ffffff', color: '#000' }} onClick={reset}>Menu</button>
                </div>
              </div>
          )}
        </div>

        {phase === 'play' && (
          <div className="mobile-touch-controls" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '0.8rem 1.2rem', fontSize: '14px', touchAction: 'manipulation' }}
              onMouseDown={() => { keysRef.current['arrowleft'] = true; }}
              onMouseUp={() => { keysRef.current['arrowleft'] = false; }}
              onTouchStart={(e) => { e.preventDefault(); keysRef.current['arrowleft'] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current['arrowleft'] = false; }}
            >
              ◀ SINISTRA
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: '0.8rem 1.2rem', fontSize: '14px', touchAction: 'manipulation' }}
              onMouseDown={() => { keysRef.current['arrowright'] = true; }}
              onMouseUp={() => { keysRef.current['arrowright'] = false; }}
              onTouchStart={(e) => { e.preventDefault(); keysRef.current['arrowright'] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current['arrowright'] = false; }}
            >
              DESTRA ▶
            </button>
            <button
              className="btn btn-yellow"
              style={{ padding: '0.8rem 1.4rem', fontSize: '14px', background: '#ffe600', color: '#000', fontWeight: 'bold', touchAction: 'manipulation' }}
              onClick={() => {
                const p = stateRef.current.player;
                if (p.jumpsLeft > 0) {
                  p.vy = p.grounded ? JUMP : DOUBLE_JUMP;
                  p.grounded = false;
                  p.jumpsLeft -= 1;
                  arcadeAudio.playJump();
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                const p = stateRef.current.player;
                if (p.jumpsLeft > 0) {
                  p.vy = p.grounded ? JUMP : DOUBLE_JUMP;
                  p.grounded = false;
                  p.jumpsLeft -= 1;
                  arcadeAudio.playJump();
                }
              }}
            >
              🦘 SALTO
            </button>
            <button
              className="btn"
              style={{ padding: '0.8rem 1rem', fontSize: '14px', background: '#1c3144', color: '#fff', touchAction: 'manipulation' }}
              onMouseDown={() => { keysRef.current['arrowdown'] = true; }}
              onMouseUp={() => { keysRef.current['arrowdown'] = false; }}
              onTouchStart={(e) => { e.preventDefault(); keysRef.current['arrowdown'] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current['arrowdown'] = false; }}
            >
              ⬇ GIÙ
            </button>
          </div>
        )}
      </div>
  );
}