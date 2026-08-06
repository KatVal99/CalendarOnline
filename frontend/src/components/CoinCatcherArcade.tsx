import { useEffect, useRef, useState, useCallback } from 'react';
import { arcadeAudio } from '../utils/arcadeAudio';

// ─── Game Constants & Audio ───────────────────────────────────────────
const W = 800, H = 540;
const P_W = 54, P_H = 28;

class RetroCatcherAudio {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }

  playCoin() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  playBonus() {
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.06 + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.06);
      osc.stop(this.ctx.currentTime + idx * 0.06 + 0.12);
    });
  }

  playHurt() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
}

const audio = new RetroCatcherAudio();

interface FallingItem {
  id: number;
  x: number;
  y: number;
  speed: number;
  radius: number;
  type: 'coin' | 'gem' | 'bill' | 'debt';
  value: number;
  color: string;
  symbol: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

interface GameState {
  playerX: number;
  score: number;
  lives: number;
  combo: number;
  items: FallingItem[];
  particles: Particle[];
  phase: 'idle' | 'play' | 'over';
  frame: number;
  lastSpawn: number;
}

function initGame(): GameState {
  return {
    playerX: W / 2 - P_W / 2,
    score: 0,
    lives: 3,
    combo: 1,
    items: [],
    particles: [],
    phase: 'play',
    frame: 0,
    lastSpawn: 0,
  };
}

export default function CoinCatcherArcade() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState>(initGame());
  const keysRef = useRef<Set<string>>(new Set());
  const animRef = useRef<number>(0);

  const [phase, setPhase] = useState<GameState['phase']>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem('catcher-hs') ?? '0')
  );

  const [isMuted, setIsMuted] = useState(arcadeAudio.getMuted());

  const endGame = useCallback((gs: GameState) => {
    arcadeAudio.stopMusic();
    arcadeAudio.playGameOver();
    gs.phase = 'over';
    setPhase('over');
    setScore(gs.score);
    const hs = Math.max(gs.score, parseInt(localStorage.getItem('catcher-hs') ?? '0'));
    localStorage.setItem('catcher-hs', hs.toString());
    setHighScore(hs);
    cancelAnimationFrame(animRef.current);
  }, []);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    gsRef.current = initGame();
    setScore(0);
    setLives(3);
    setPhase('play');
    arcadeAudio.startChiptuneMusic();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) e.preventDefault();
      keysRef.current.add(e.key);
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'play') {
      arcadeAudio.stopMusic();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let itemIdCounter = 0;

    function loop() {
      const gs = gsRef.current;
      if (gs.phase !== 'play') return;
      gs.frame++;

      const keys = keysRef.current;
      const speed = 7.5;
      if (keys.has('ArrowLeft') || keys.has('a')) {
        gs.playerX = Math.max(10, gs.playerX - speed);
      }
      if (keys.has('ArrowRight') || keys.has('d')) {
        gs.playerX = Math.min(W - P_W - 10, gs.playerX + speed);
      }

      // Spawn falling items
      const now = Date.now();
      const spawnRate = Math.max(300, 750 - Math.floor(gs.score / 150) * 40);
      if (now - gs.lastSpawn > spawnRate) {
        gs.lastSpawn = now;
        itemIdCounter++;
        const rand = Math.random();
        let item: FallingItem;
        const x = 30 + Math.random() * (W - 60);

        if (rand < 0.50) {
          item = { id: itemIdCounter, x, y: -20, speed: 2.8 + Math.random() * 2, radius: 14, type: 'coin', value: 10, color: '#ffd700', symbol: '€' };
        } else if (rand < 0.70) {
          item = { id: itemIdCounter, x, y: -20, speed: 3.5 + Math.random() * 2.5, radius: 16, type: 'gem', value: 30, color: '#00ffff', symbol: '💎' };
        } else if (rand < 0.88) {
          item = { id: itemIdCounter, x, y: -20, speed: 3.0 + Math.random() * 2.2, radius: 15, type: 'bill', value: -15, color: '#ff4444', symbol: '💸' };
        } else {
          item = { id: itemIdCounter, x, y: -20, speed: 4.0 + Math.random() * 2.5, radius: 17, type: 'debt', value: -30, color: '#ff0055', symbol: '💣' };
        }
        gs.items.push(item);
      }

      // Move items & check collisions
      const py = H - 45;
      gs.items.forEach((item) => {
        item.y += item.speed;
      });

      gs.items = gs.items.filter((item) => {
        // Collision with player
        if (
          item.y + item.radius >= py &&
          item.y - item.radius <= py + P_H &&
          item.x + item.radius >= gs.playerX &&
          item.x - item.radius <= gs.playerX + P_W
        ) {
          // Hit!
          if (item.type === 'coin' || item.type === 'gem') {
            const gained = item.value * gs.combo;
            gs.score += gained;
            gs.combo = Math.min(5, gs.combo + 1);
            setScore(gs.score);

            if (item.type === 'gem') audio.playBonus();
            else audio.playCoin();

            // Particles
            for (let i = 0; i < 10; i++) {
              gs.particles.push({
                x: item.x,
                y: item.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 2,
                color: item.color,
                life: 18 + Math.random() * 10,
              });
            }
          } else {
            // Bad item
            gs.combo = 1;
            gs.lives--;
            setLives(gs.lives);
            audio.playHurt();

            for (let i = 0; i < 12; i++) {
              gs.particles.push({
                x: item.x,
                y: item.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: '#ff0055',
                life: 20 + Math.random() * 10,
              });
            }

            if (gs.lives <= 0) {
              endGame(gs);
              return false;
            }
          }
          return false;
        }

        // Missed coin reduces combo
        if (item.y > H + 20) {
          if (item.type === 'coin' || item.type === 'gem') {
            gs.combo = 1;
          }
          return false;
        }

        return true;
      });

      // Update particles
      gs.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
      });
      gs.particles = gs.particles.filter((p) => p.life > 0);

      // Render Canvas
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#070714';
      ctx.fillRect(0, 0, W, H);

      // Background stars & grid
      ctx.fillStyle = 'rgba(0, 255, 255, 0.04)';
      for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 1, H);
      for (let y = 0; y < H; y += 40) ctx.fillRect(0, y, W, 1);

      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const sy = (i * 197 + gs.frame * 0.5) % H;
        const sx = (i * 311) % W;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + (i % 3) * 0.2})`;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Draw Pixel Spiderman Web Catcher
      const px = gs.playerX;
      ctx.save();
      
      // Web Net catching boundary
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + P_W / 2, py + 12, px + P_W, py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Spiderman Head & Mask in center
      ctx.fillStyle = '#e62429';
      ctx.fillRect(px + P_W / 2 - 12, py + 6, 24, 14);
      ctx.fillStyle = '#ffffff'; // White Eyes
      ctx.fillRect(px + P_W / 2 - 9, py + 9, 6, 5);
      ctx.fillRect(px + P_W / 2 + 3, py + 9, 6, 5);
      ctx.fillStyle = '#000000';
      ctx.fillRect(px + P_W / 2 - 10, py + 9, 1, 5);
      ctx.fillRect(px + P_W / 2 + 9, py + 9, 1, 5);

      // Spiderman Suit & Arms stretching out web
      ctx.fillStyle = '#0b5ed7';
      ctx.fillRect(px + 6, py + 16, P_W - 12, 12);
      ctx.fillStyle = '#e62429';
      ctx.fillRect(px + P_W / 2 - 6, py + 16, 12, 12);

      // Web shooter hands at ends
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 2, py + 2, 6, 6);
      ctx.fillRect(px + P_W - 4, py + 2, 6, 6);

      ctx.restore();

      // Draw Items
      gs.items.forEach((item) => {
        ctx.save();
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = item.color;

        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.symbol, item.x, item.y);
        ctx.restore();
      });

      // Draw Particles
      gs.particles.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.restore();
      });

      // Draw HUD
      ctx.save();
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`SCORE: ${gs.score}`, 16, 28);
      ctx.fillText(`COMBO: x${gs.combo}`, W / 2 - 40, 28);
      ctx.fillStyle = '#ff4444';
      ctx.fillText(`LIVES: ${'♥'.repeat(Math.max(0, gs.lives))}`, W - 120, 28);
      ctx.restore();

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, endGame]);

  return (
    <div className="arcade-panel">
      <div className="arcade-subheader">
        <div>
          <h2>💰 BUDGET CATCHER</h2>
          <p>Raccogli monete ed incentivi finanziari evitando fatture impazzite e debiti!</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '8px', color: 'var(--text-dim)' }}>
          <span>← → / A D — Muovi Catcher</span>
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
        </div>
      </div>

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />

        {phase === 'idle' && (
          <div className="game-overlay">
            <div className="game-big-title">BUDGET<br />CATCHER</div>
            <div className="game-sub">— RETRO COIN COLLECTOR —</div>
            <button className="btn btn-primary" style={{ fontSize: '9px', padding: '0.6rem 1.4rem' }} onClick={startGame}>
              ▶ START GAME
            </button>
            <div className="game-controls-hint">
              ← → / A D — SPPOSTA IL SALVADANAIO PER RACCOGLIERE MONETE
            </div>
            <div style={{ marginTop: '1rem', color: 'var(--text-dim)', fontSize: '8px' }}>
              BEST SCORE: {highScore}
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div className="game-overlay game-overlay-red">
            <div className="game-big-title" style={{ color: '#ff4444', textShadow: '0 0 20px #ff4444' }}>
              GAME<br />OVER
            </div>
            <div className="game-score-display">PUNTEGGIO RISPARMIATO: {score}</div>
            <div className="game-score-display" style={{ color: 'var(--cyan)' }}>BEST: {Math.max(score, highScore)}</div>
            <button className="btn btn-danger" style={{ fontSize: '9px', padding: '0.6rem 1.4rem' }} onClick={startGame}>
              ↺ RIPROVA
            </button>
          </div>
        )}
      </div>

      {phase === 'play' && (
        <div className="mobile-touch-controls" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '0.8rem 1.6rem', fontSize: '14px', touchAction: 'manipulation' }}
            onMouseDown={() => { keysRef.current.add('ArrowLeft'); }}
            onMouseUp={() => { keysRef.current.delete('ArrowLeft'); }}
            onTouchStart={(e) => { e.preventDefault(); keysRef.current.add('ArrowLeft'); }}
            onTouchEnd={(e) => { e.preventDefault(); keysRef.current.delete('ArrowLeft'); }}
          >
            ◀ SINISTRA
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '0.8rem 1.6rem', fontSize: '14px', touchAction: 'manipulation' }}
            onMouseDown={() => { keysRef.current.add('ArrowRight'); }}
            onMouseUp={() => { keysRef.current.delete('ArrowRight'); }}
            onTouchStart={(e) => { e.preventDefault(); keysRef.current.add('ArrowRight'); }}
            onTouchEnd={(e) => { e.preventDefault(); keysRef.current.delete('ArrowRight'); }}
          >
            DESTRA ▶
          </button>
        </div>
      )}

      <div className="game-legend">
        <div className="legend-alien-row"><span style={{ color: '#ffd700' }}>€</span> Moneta: +10 pt</div>
        <div className="legend-alien-row"><span style={{ color: '#00ffff' }}>💎</span> Gemma Bonus: +30 pt</div>
        <div className="legend-alien-row"><span style={{ color: '#ff4444' }}>💸</span> Fattura: -1 Vite</div>
        <div className="legend-alien-row"><span style={{ color: '#ff0055' }}>💣</span> Debito: -1 Vite</div>
      </div>
    </div>
  );
}
