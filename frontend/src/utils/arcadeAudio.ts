// ============================================================
// 8-BIT RETRO SYNTHESIZER & MUSIC ENGINE (Web Audio API)
// Genera musica arcade in tempo reale e effetti sonori 8-bit
// ============================================================

class ArcadeAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.6;

  // Space Invaders Bassline State
  private invadersTimer: number | null = null;
  private invadersStep: number = 0;

  // Background Chiptune Music State
  private chiptuneTimer: number | null = null;
  private chiptuneStep: number = 0;

  public unlock() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch {
      // AudioContext fallback
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    } else {
      this.unlock();
      this.playTestSound();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playTestSound() {
    this.unlock();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // ignore
    }
  }

  // --- SOUND EFFECTS (SFX) ---

  public playLaser() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.12);

      gain.gain.setValueAtTime(this.sfxVolume * 0.8, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // ignore
    }
  }

  public playExplosion() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.linearRampToValueAtTime(80, now + 0.25);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.sfxVolume, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.25);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.25);
    } catch {
      // ignore
    }
  }

  public playJump() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(580, now + 0.15);

      gain.gain.setValueAtTime(this.sfxVolume * 0.7, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // ignore
    }
  }

  public playCoin() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(this.sfxVolume * 0.8, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore
    }
  }

  public playPowerup() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(this.sfxVolume * 0.7, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.05 + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.12);
      });
    } catch {
      // ignore
    }
  }

  public playGameOver() {
    if (this.isMuted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [440, 415.3, 392, 349.23]; // Descending minor
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(this.sfxVolume * 0.8, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.15 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.25);
      });
    } catch {
      // ignore
    }
  }

  // --- BACKGROUND MUSIC ENGINES ---

  /**
   * Space Invaders classic 4-note Marching Bassline
   */
  public startSpaceInvadersMusic(tempoMs: number = 400) {
    if (this.isMuted) return;
    this.stopMusic();
    this.unlock();

    const notes = [146.83, 138.59, 130.81, 123.47]; // D2, C#2, C2, B1

    const tick = () => {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const freq = notes[this.invadersStep % notes.length];
        this.invadersStep++;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(this.musicVolume * 1.0, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.14);
      } catch {
        // ignore
      }
    };

    tick();
    this.invadersTimer = window.setInterval(tick, tempoMs);
  }

  /**
   * Catchy 8-Bit Chiptune Loop for Platformer / Runner & Arcade Games
   */
  public startChiptuneMusic() {
    if (this.isMuted) return;
    this.stopMusic();
    this.unlock();

    const melody = [
      261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 329.63,
      293.66, 349.23, 440.00, 587.33, 440.00, 349.23, 293.66, 349.23
    ];
    const bass = [130.81, 130.81, 174.61, 174.61, 146.83, 146.83, 196.00, 196.00];

    const tick = () => {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const melFreq = melody[this.chiptuneStep % melody.length];
        const bassFreq = bass[Math.floor(this.chiptuneStep / 2) % bass.length];
        this.chiptuneStep++;

        // Melody Oscillator
        const mOsc = this.ctx.createOscillator();
        const mGain = this.ctx.createGain();
        mOsc.type = 'triangle';
        mOsc.frequency.setValueAtTime(melFreq, now);
        mGain.gain.setValueAtTime(this.musicVolume * 0.7, now);
        mGain.gain.linearRampToValueAtTime(0.001, now + 0.14);
        mOsc.connect(mGain);
        mGain.connect(this.ctx.destination);
        mOsc.start(now);
        mOsc.stop(now + 0.14);

        // Bass Oscillator (every 2 steps)
        if (this.chiptuneStep % 2 === 0) {
          const bOsc = this.ctx.createOscillator();
          const bGain = this.ctx.createGain();
          bOsc.type = 'sine';
          bOsc.frequency.setValueAtTime(bassFreq, now);
          bGain.gain.setValueAtTime(this.musicVolume * 0.9, now);
          bGain.gain.linearRampToValueAtTime(0.001, now + 0.28);
          bOsc.connect(bGain);
          bGain.connect(this.ctx.destination);
          bOsc.start(now);
          bOsc.stop(now + 0.28);
        }
      } catch {
        // ignore
      }
    };

    tick();
    this.chiptuneTimer = window.setInterval(tick, 180);
  }

  public stopMusic() {
    if (this.invadersTimer !== null) {
      clearInterval(this.invadersTimer);
      this.invadersTimer = null;
    }
    if (this.chiptuneTimer !== null) {
      clearInterval(this.chiptuneTimer);
      this.chiptuneTimer = null;
    }
    this.invadersStep = 0;
    this.chiptuneStep = 0;
  }
}

export const arcadeAudio = new ArcadeAudioEngine();

// Automatic user interaction unlock for browser autoplay policy
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    arcadeAudio.unlock();
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
}
