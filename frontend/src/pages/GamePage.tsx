import { useEffect, useRef, useState, useCallback } from 'react';
import SudokuArcade from '../components/SudokuArcade';
import RunnerArcade from '../components/RunnerArcade';
import CoinCatcherArcade from '../components/CoinCatcherArcade';
import { arcadeAudio } from '../utils/arcadeAudio';

// ─── Game Constants ────────────────────────────────────────────────
const W = 820, H = 540;
const P_W = 40, P_H = 24;
const B_W = 4, B_H = 12;
const A_W = 32, A_H = 22;
const A_COLS = 10, A_ROWS = 5;
const A_GAP_X = 16, A_GAP_Y = 12;
const A_OFFSET_X = 70, A_OFFSET_Y = 55;
const SHIELD_Y = H - 110;

const ALIEN_COLORS = ['#ff00ff', '#ff00ff', '#ffdd00', '#ffdd00', '#00ffff'];

// SPRITE MATRICI PIXEL-ART 8x8 (0 = trasparente, 1 = colore)
const ALIEN_SPRITES = [
  // Tipo 1: Polpo (Righe Superiori)
  [
    [0,0,1,1,1,1,0,0,  0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0,  0,1,1,1,1,1,1,0],
    [1,1,0,1,1,0,1,1,  1,1,0,1,1,0,1,1],
    [1,1,1,1,1,1,1,1,  1,1,1,1,1,1,1,1],
    [0,0,1,0,0,1,0,0,  0,1,0,1,1,0,1,0],
    [0,1,0,1,1,0,1,0,  1,0,0,0,0,0,0,1],
    [1,0,1,0,0,1,0,1,  0,1,0,0,0,0,1,0]
  ],
  // Tipo 2: Granchio (Righe Centrali)
  [
    [0,0,1,0,0,1,0,0,  0,0,1,0,0,1,0,0],
    [1,0,0,1,1,0,0,1,  0,0,0,1,1,0,0,0],
    [1,0,1,1,1,1,0,1,  1,0,1,1,1,1,0,1],
    [1,1,1,0,0,1,1,1,  1,1,1,0,0,1,1,1],
    [1,1,1,1,1,1,1,1,  1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0,  0,1,1,1,1,1,1,0],
    [0,1,0,0,0,0,1,0,  1,0,0,0,0,0,0,1]
  ],
  // Tipo 3: Medusa (Righe Inferiori)
  [
    [0,0,0,1,1,0,0,0,  0,0,0,1,1,0,0,0],
    [0,0,1,1,1,1,0,0,  0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0,  0,1,1,1,1,1,1,0],
    [1,1,0,1,1,0,1,1,  1,1,0,1,1,0,1,1],
    [1,1,1,1,1,1,1,1,  1,1,1,1,1,1,1,1],
    [0,0,1,0,0,1,0,0,  0,1,0,1,1,0,1,0],
    [0,1,0,1,1,0,1,0,  1,0,1,0,0,1,0,1]
  ]
];

interface Bullet { x: number; y: number; speed: number }
interface Alien { x: number; y: number; alive: boolean; row: number; points: number }
interface Shield { x: number; y: number; hp: number }
interface Particle { x: number; y: number; vx: number; vy: number; color: string; life: number }

interface GS {
  playerX: number;
  pBullets: Bullet[];
  aBullets: Bullet[];
  aliens: Alien[];
  shields: Shield[];
  particles: Particle[];
  dx: number;
  score: number;
  lives: number;
  phase: 'idle' | 'play' | 'over' | 'win';
  frame: number;
  lastAShot: number;
  lastPShot: number;
}

function initShields(): Shield[] {
  return [130, 290, 450, 610].map((x) => ({ x, y: SHIELD_Y, hp: 12 }));
}

function initGame(): GS {
  const aliens: Alien[] = [];
  for (let row = 0; row < A_ROWS; row++) {
    for (let col = 0; col < A_COLS; col++) {
      aliens.push({
        x: A_OFFSET_X + col * (A_W + A_GAP_X),
        y: A_OFFSET_Y + row * (A_H + A_GAP_Y),
        alive: true,
        row,
        points: (A_ROWS - row) * 10,
      });
    }
  }
  return {
    playerX: W / 2 - P_W / 2,
    pBullets: [],
    aBullets: [],
    aliens,
    shields: initShields(),
    particles: [],
    dx: 1.4,
    score: 0,
    lives: 3,
    phase: 'play',
    frame: 0,
    lastAShot: 0,
    lastPShot: 0,
  };
}

function addExplosion(particles: Particle[], x: number, y: number, color: string) {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 20 + Math.random() * 10,
    });
  }
}

function drawStars(ctx: CanvasRenderingContext2D, frame: number) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 50; i++) {
    const sx = (i * 137) % W;
    const sy = (i * 269 + frame * 0.2) % H;
    const alpha = 0.2 + (Math.sin(frame * 0.05 + i) + 1) * 0.3;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(sx, sy, i % 2 === 0 ? 2 : 1, i % 2 === 0 ? 2 : 1);
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, gs: GS) {
  const x = gs.playerX, y = H - P_H - 30;
  ctx.save();
  ctx.fillStyle = '#00ff88';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 12;

  ctx.fillRect(x + 16, y, 8, 4);
  ctx.fillRect(x + 14, y + 4, 12, 4);
  ctx.fillRect(x + 6, y + 8, 28, 6);
  ctx.fillRect(x, y + 14, P_W, 6);
  ctx.fillRect(x, y + 20, 6, 4);
  ctx.fillRect(x + P_W - 6, y + 20, 6, 4);

  if (gs.frame % 4 < 2) {
    ctx.fillStyle = '#ff4400';
    ctx.fillRect(x + 1, y + 24, 4, 4);
    ctx.fillRect(x + P_W - 5, y + 24, 4, 4);
  }

  ctx.restore();
}

function drawAlien(ctx: CanvasRenderingContext2D, alien: Alien, frame: number) {
  const color = ALIEN_COLORS[alien.row % ALIEN_COLORS.length];
  const { x, y, row } = alien;
  const spriteType = row === 0 ? 0 : row < 3 ? 1 : 2;
  const animFrame = Math.floor(frame / 20) % 2;
  const sprite = ALIEN_SPRITES[spriteType];

  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  const pixelSize = 3;
  for (let r = 0; r < sprite.length; r++) {
    const line = sprite[r];
    for (let c = 0; c < 8; c++) {
      const bit = line[animFrame * 8 + c];
      if (bit === 1) {
        ctx.fillRect(x + c * pixelSize + 4, y + r * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, s: Shield) {
  if (s.hp <= 0) return; // Completamente distrutto!

  const healthRatio = s.hp / 12;
  const x = s.x, y = s.y;

  ctx.save();
  ctx.fillStyle = `rgba(0, 255, 255, ${Math.max(0.35, healthRatio)})`;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = Math.floor(healthRatio * 8);

  // Struttura ad arco del bunker (matrice di pixel-art)
  const shieldMatrix = [
    [0,0,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,0,0,0,0,0,0,1,1,1,1],
    [1,1,1,0,0,0,0,0,0,0,0,1,1,1],
  ];

  const blockSize = 4;

  for (let r = 0; r < shieldMatrix.length; r++) {
    for (let c = 0; c < shieldMatrix[r].length; c++) {
      if (shieldMatrix[r][c] === 1) {
        // Pseudo-random deterministico: sgretola blocchi in base all'HP mancante
        const damageSeed = (r * 7 + c * 13 + s.x) % 12;
        if (damageSeed >= s.hp) continue; // Blocco distrutto!

        ctx.fillRect(x + c * blockSize, y + r * blockSize, blockSize - 0.5, blockSize - 0.5);
      }
    }
  }

  ctx.restore();
}

function drawBullets(ctx: CanvasRenderingContext2D, gs: GS) {
  gs.pBullets.forEach((b) => {
    ctx.save();
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(b.x, b.y, B_W, B_H);
    ctx.restore();
  });

  gs.aBullets.forEach((b) => {
    ctx.save();
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(b.x, b.y, B_W, B_H);
    ctx.fillRect(b.x + (gs.frame % 4 < 2 ? 2 : -2), b.y + 4, B_W, 4);
    ctx.restore();
  });
}

function drawParticles(ctx: CanvasRenderingContext2D, gs: GS) {
  gs.particles.forEach((p) => {
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(p.x, p.y, 3, 3);
    ctx.restore();
  });
}

function drawHUD(ctx: CanvasRenderingContext2D, gs: GS, hs: number) {
  ctx.save();
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#e0e0ff';
  ctx.fillText(`SCORE: ${gs.score}`, 14, 26);
  ctx.fillText(`BEST: ${hs}`, W / 2 - 60, 26);

  ctx.fillStyle = '#ff4444';
  ctx.shadowColor = '#ff4444';
  ctx.shadowBlur = 8;
  ctx.fillText(`♥`.repeat(Math.max(0, gs.lives)), W - 90, 26);

  ctx.strokeStyle = 'rgba(0,255,136,0.4)';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 4;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 25);
  ctx.lineTo(W, H - 25);
  ctx.stroke();
  ctx.restore();
}

function rectHit(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function SpaceInvadersArcade() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS>(initGame());
  const keysRef = useRef<Set<string>>(new Set());
  const animRef = useRef<number>(0);
  const [phase, setPhase] = useState<GS['phase']>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(() =>
      parseInt(localStorage.getItem('space-hs') ?? '0')
  );

  const [isMuted, setIsMuted] = useState(arcadeAudio.getMuted());

  const endGame = useCallback((gs: GS, won: boolean) => {
    arcadeAudio.stopMusic();
    if (won) arcadeAudio.playPowerup();
    else arcadeAudio.playGameOver();
    gs.phase = won ? 'win' : 'over';
    setPhase(gs.phase);
    setScore(gs.score);
    const hs = Math.max(gs.score, parseInt(localStorage.getItem('space-hs') ?? '0'));
    localStorage.setItem('space-hs', hs.toString());
    setHighScore(hs);
    cancelAnimationFrame(animRef.current);
  }, []);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    gsRef.current = initGame();
    setScore(0);
    setLives(3);
    setPhase('play');
    arcadeAudio.startSpaceInvadersMusic(400);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'z', 'w', 's'].includes(k)) {
        e.preventDefault();
      }
      keysRef.current.add(k);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    if (phase !== 'play') {
      arcadeAudio.stopMusic();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const hs = parseInt(localStorage.getItem('space-hs') ?? '0');

    const PSPEED = 7.5, BSPEED = 12, ABSPEED = 3.5;
    const MIN_SHOT_INTERVAL = 250;

    function loop() {
      const gs = gsRef.current;
      if (gs.phase !== 'play') return;
      gs.frame++;

      const keys = keysRef.current;
      if (keys.has('arrowleft') || keys.has('a')) gs.playerX = Math.max(0, gs.playerX - PSPEED);
      if (keys.has('arrowright') || keys.has('d')) gs.playerX = Math.min(W - P_W, gs.playerX + PSPEED);

      const now = Date.now();
      if ((keys.has(' ') || keys.has('z')) && now - gs.lastPShot > MIN_SHOT_INTERVAL) {
        gs.pBullets.push({ x: gs.playerX + P_W / 2 - B_W / 2, y: H - P_H - 36, speed: BSPEED });
        gs.lastPShot = now;
        arcadeAudio.playLaser();
      }

      gs.pBullets = gs.pBullets.filter((b) => { b.y -= b.speed; return b.y > -B_H; });
      gs.aBullets = gs.aBullets.filter((b) => { b.y += b.speed; return b.y < H; });

      gs.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
      });
      gs.particles = gs.particles.filter((p) => p.life > 0);

      const alive = gs.aliens.filter((a) => a.alive);
      if (alive.length === 0) { endGame(gs, true); return; }

      const minX = Math.min(...alive.map((a) => a.x));
      const maxX = Math.max(...alive.map((a) => a.x + A_W));
      if (maxX + gs.dx > W - 2 || minX + gs.dx < 2) {
        gs.dx = -gs.dx;
        gs.aliens.forEach((a) => { if (a.alive) a.y += 14; });
      }
      gs.aliens.forEach((a) => { if (a.alive) a.x += gs.dx; });

      const shotInterval = Math.max(350, 1300 - (A_COLS * A_ROWS - alive.length) * 14);
      if (now - gs.lastAShot > shotInterval) {
        const bottom: Record<number, Alien> = {};
        alive.forEach((a) => { if (!bottom[a.x] || a.y > bottom[a.x].y) bottom[a.x] = a; });
        const shooters = Object.values(bottom);
        if (shooters.length) {
          const s = shooters[Math.floor(Math.random() * shooters.length)];
          gs.aBullets.push({ x: s.x + A_W / 2 - B_W / 2, y: s.y + A_H, speed: ABSPEED });
        }
        gs.lastAShot = now;
      }

      // Collisioni: proiettili giocatore vs alieni
      gs.pBullets = gs.pBullets.filter((b) => {
        for (const a of gs.aliens) {
          if (!a.alive) continue;
          if (rectHit(b.x, b.y, B_W, B_H, a.x, a.y, A_W, A_H)) {
            a.alive = false;
            gs.score += a.points;
            setScore(gs.score);
            addExplosion(gs.particles, a.x + A_W / 2, a.y + A_H / 2, ALIEN_COLORS[a.row % ALIEN_COLORS.length]);
            arcadeAudio.playExplosion();
            return false;
          }
        }
        return true;
      });

      // Collisioni: proiettili giocatore vs scudi (Sgretolamento)
      gs.pBullets = gs.pBullets.filter((b) => {
        for (const s of gs.shields) {
          if (s.hp > 0 && rectHit(b.x, b.y, B_W, B_H, s.x, s.y, 56, 24)) {
            s.hp = Math.max(0, s.hp - 1);
            addExplosion(gs.particles, b.x, b.y, '#00ffff');
            arcadeAudio.playExplosion();
            return false;
          }
        }
        return true;
      });

      // Collisioni: proiettili alieni vs giocatore
      const py = H - P_H - 30;
      gs.aBullets = gs.aBullets.filter((b) => {
        if (rectHit(b.x, b.y, B_W, B_H, gs.playerX, py, P_W, P_H)) {
          gs.lives--;
          setLives(gs.lives);
          addExplosion(gs.particles, gs.playerX + P_W / 2, py + P_H / 2, '#ff0055');
          arcadeAudio.playExplosion();
          if (gs.lives <= 0) { endGame(gs, false); return false; }
          return false;
        }
        return true;
      });

      // Collisioni: proiettili alieni vs scudi (Sgretolamento)
      gs.aBullets = gs.aBullets.filter((b) => {
        for (const s of gs.shields) {
          if (s.hp > 0 && rectHit(b.x, b.y, B_W, B_H, s.x, s.y, 56, 24)) {
            s.hp = Math.max(0, s.hp - 1);
            addExplosion(gs.particles, b.x, b.y, '#ff4444');
            arcadeAudio.playExplosion();
            return false;
          }
        }
        return true;
      });

      if (alive.some((a) => a.y + A_H >= SHIELD_Y)) { endGame(gs, false); return; }

      const ratio = alive.length / (A_COLS * A_ROWS);
      const baseSpeed = 1.4 + (1 - ratio) * 2.8;
      gs.dx = gs.dx > 0 ? baseSpeed : -baseSpeed;

      // Render
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#05050d';
      ctx.fillRect(0, 0, W, H);

      drawStars(ctx, gs.frame);
      drawHUD(ctx, gs, Math.max(hs, gs.score));
      gs.aliens.forEach((a) => { if (a.alive) drawAlien(ctx, a, gs.frame); });
      gs.shields.forEach((s) => drawShield(ctx, s));
      drawPlayer(ctx, gs);
      drawBullets(ctx, gs);
      drawParticles(ctx, gs);

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      arcadeAudio.stopMusic();
    };
  }, [phase, endGame]);

  return (
      <div className="arcade-panel">
        <div className="arcade-subheader">
          <div>
            <h2>👾 SPACE INVADERS</h2>
            <p>Wave shooter cyberpunk con sintetizzatore audio nativo Web Audio API!</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '7px', color: 'var(--text-dim)' }}>
            <span>← → / A D — Muovi</span>
            <span>SPACE / Z — Spara</span>
          </div>
        </div>

        <div className="game-hud-bar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span className="hud-item">SCORE <strong className="positive">{score}</strong></span>
            <span className="hud-item">BEST <strong className="positive" style={{ color: 'var(--cyan)' }}>{highScore}</strong></span>
            <span className="hud-item" style={{ color: 'var(--red)' }}>LIVES {'♥'.repeat(Math.max(0, lives))}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-small btn-yellow"
              onClick={() => arcadeAudio.playTestSound()}
            >
              🔔 PROVA AUDIO
            </button>
            <button
              className="btn btn-small btn-primary"
              onClick={() => setIsMuted(arcadeAudio.toggleMute())}
            >
              {isMuted ? '🔇 AUDIO: OFF' : '🔊 MUSIC: ON'}
            </button>
          </div>
        </div>

        <div className="canvas-wrapper">
          <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />

          {phase === 'idle' && (
              <div className="game-overlay">
                <div className="game-big-title">SPACE<br />INVADERS</div>
                <div className="game-sub">— AUDIO ENHANCED EDITION —</div>
                <button className="btn btn-primary" style={{ fontSize: '9px', padding: '0.6rem 1.4rem' }} onClick={startGame}>
                  ▶ START GAME
                </button>
                <div className="game-controls-hint">
                  ← → / A D — MUOVI &nbsp;|&nbsp; SPACE / Z — SPARA
                </div>
                <div style={{ marginTop: '1rem', color: 'var(--text-dim)', fontSize: '7px' }}>
                  BEST SCORE: {highScore}
                </div>
              </div>
          )}

          {phase === 'over' && (
              <div className="game-overlay game-overlay-red">
                <div className="game-big-title" style={{ color: '#ff4444', textShadow: '0 0 20px #ff4444' }}>
                  GAME<br />OVER
                </div>
                <div className="game-score-display">PUNTEGGIO: {score}</div>
                <div className="game-score-display" style={{ color: 'var(--cyan)' }}>RECORD: {Math.max(score, highScore)}</div>
                <button className="btn btn-danger" style={{ fontSize: '9px', padding: '0.6rem 1.4rem' }} onClick={startGame}>
                  ↺ RIPROVA
                </button>
              </div>
          )}

          {phase === 'win' && (
              <div className="game-overlay game-overlay-green">
                <div className="game-big-title" style={{ color: '#00ff88', textShadow: '0 0 20px #00ff88' }}>
                  YOU<br />WIN!
                </div>
                <div className="game-score-display">PUNTEGGIO: {score}</div>
                <div className="game-score-display" style={{ color: 'var(--cyan)' }}>RECORD: {Math.max(score, highScore)}</div>
                <button className="btn" style={{ fontSize: '9px', padding: '0.6rem 1.4rem' }} onClick={startGame}>
                  ▶ RIGIOCA
                </button>
              </div>
          )}
        </div>

        {phase === 'play' && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.75rem' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.5rem', fontSize: '13px' }}
              onMouseDown={() => keysRef.current.add('arrowleft')}
              onMouseUp={() => keysRef.current.delete('arrowleft')}
              onTouchStart={() => keysRef.current.add('arrowleft')}
              onTouchEnd={() => keysRef.current.delete('arrowleft')}
            >
              ◀ SINISTRA (A)
            </button>
            <button
              className="btn btn-green"
              style={{ padding: '0.6rem 1.8rem', fontSize: '13px', background: 'rgba(0,255,136,0.15)' }}
              onClick={() => {
                const gs = gsRef.current;
                const BSPEED = 12;
                gs.pBullets.push({ x: gs.playerX + P_W / 2 - B_W / 2, y: H - P_H - 36, speed: BSPEED });
                arcadeAudio.playLaser();
              }}
            >
              🔥 SPARA (SPACE)
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.5rem', fontSize: '13px' }}
              onMouseDown={() => keysRef.current.add('arrowright')}
              onMouseUp={() => keysRef.current.delete('arrowright')}
              onTouchStart={() => keysRef.current.add('arrowright')}
              onTouchEnd={() => keysRef.current.delete('arrowright')}
            >
              DESTRA (D) ▶
            </button>
          </div>
        )}

        <div className="game-legend">
          <div className="legend-alien-row">
            <span style={{ color: '#ff00ff' }}>👾</span> 40-50 pt (Riga 1-2)
          </div>
          <div className="legend-alien-row">
            <span style={{ color: '#ffdd00' }}>👾</span> 20-30 pt (Riga 3-4)
          </div>
          <div className="legend-alien-row">
            <span style={{ color: '#00ffff' }}>👾</span> 10 pt (Riga 5)
          </div>
          <div className="legend-alien-row">
            <span style={{ color: '#00ffff' }}>🛡</span> Scudi Sgretolabili (12 HP)
          </div>
        </div>
      </div>
  );
}

type ArcadeTab = 'invaders' | 'catcher' | 'sudoku' | 'runner';

export default function GamePage() {
  const [activeTab, setActiveTab] = useState<ArcadeTab>('runner');

  return (
      <div className="page game-page">
        <div className="page-header">
          <h1>🕷️ Spidey Arcade District</h1>
          <div className="game-tabs">
            <button className={`btn btn-small ${activeTab === 'runner' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('runner')}>🕷️ Spidey Platform Run</button>
            <button className={`btn btn-small ${activeTab === 'catcher' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('catcher')}>🕸️ Spidey Web Catcher</button>
            <button className={`btn btn-small ${activeTab === 'invaders' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('invaders')}>👾 Web Shooter Invaders</button>
            <button className={`btn btn-small ${activeTab === 'sudoku' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('sudoku')}>🧩 Spidey Sudoku</button>
          </div>
        </div>

        <div className="arcade-hero-note">Quattro modalità arcade retro 8-bit con Spiderman Pixel in azione: platformer, web catcher, shooter e puzzle.</div>

        {activeTab === 'invaders' && <SpaceInvadersArcade />}
        {activeTab === 'catcher' && <CoinCatcherArcade />}
        {activeTab === 'sudoku' && <SudokuArcade />}
        {activeTab === 'runner' && <RunnerArcade />}
      </div>
  );
}