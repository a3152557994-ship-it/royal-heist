class OrientalNoirSoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private bgmTimer: number | null = null;
  private bgmPlaying = false;
  private dangerRatio = 0.2; // 0 = calm, 1 = critical candle nearly out

  private ensureCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setDangerLevel(ratio: number) {
    this.dangerRatio = Math.max(0, Math.min(1, ratio));
  }

  public playTap() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.045);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  /**
   * Balatro-style rising-pitch wooden abacus clack + silver ingot ring!
   */
  public playAbacusCombo(stepIndex: number) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const semitoneBoost = Math.pow(1.065, Math.min(16, stepIndex));
    const baseFreq = 440 * semitoneBoost;

    // 1. Crisp wooden bead clack
    const clack = ctx.createOscillator();
    const clackGain = ctx.createGain();
    clack.type = 'square';
    clack.frequency.setValueAtTime(980 * semitoneBoost, now);
    clack.frequency.exponentialRampToValueAtTime(320, now + 0.03);
    clackGain.gain.setValueAtTime(0.09, now);
    clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    clack.connect(clackGain).connect(ctx.destination);
    clack.start(now);
    clack.stop(now + 0.04);

    // 2. Metallic silver sycee resonance
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(baseFreq * 2, now);
    bell.frequency.exponentialRampToValueAtTime(baseFreq * 2.02, now + 0.18);
    bellGain.gain.setValueAtTime(0.14, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    bell.connect(bellGain).connect(ctx.destination);
    bell.start(now);
    bell.stop(now + 0.23);
  }

  public playSealStamp() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playAuditAlarm() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(idx === 0 ? 196 : 146.8, now + offset);
      gain.gain.setValueAtTime(0.16, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.25);
    });
  }

  public playCashOutGong() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.16, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.56);
    });
  }

  public playConfiscatedCrash() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.linearRampToValueAtTime(42, now + 0.55);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  /**
   * Subtle procedural pentatonic Guqin + low heartbeat pulse loop
   */
  public startVaultAmbience() {
    if (this.bgmPlaying || this.muted) return;
    this.bgmPlaying = true;
    const pentatonic = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23];
    let step = 0;

    const tick = () => {
      if (!this.bgmPlaying || this.muted) return;
      const ctx = this.ensureCtx();
      if (ctx) {
        const now = ctx.currentTime;
        // Soft plucked Guqin note
        const freq = pentatonic[(step * 3 + Math.floor(this.dangerRatio * 3)) % pentatonic.length];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.032, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.15);

        // Tense heartbeat thump when incense is low or wanted is high
        if (this.dangerRatio > 0.45) {
          const hb = ctx.createOscillator();
          const hbGain = ctx.createGain();
          hb.type = 'sine';
          hb.frequency.setValueAtTime(62, now);
          hb.frequency.exponentialRampToValueAtTime(34, now + 0.12);
          hbGain.gain.setValueAtTime(0.06 * this.dangerRatio, now);
          hbGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          hb.connect(hbGain).connect(ctx.destination);
          hb.start(now);
          hb.stop(now + 0.15);
        }
      }
      step += 1;
      const intervalMs = Math.max(420, Math.round(1150 - this.dangerRatio * 620));
      this.bgmTimer = window.setTimeout(tick, intervalMs);
    };

    tick();
  }

  public stopVaultAmbience() {
    this.bgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopVaultAmbience();
    } else {
      this.startVaultAmbience();
    }
    return this.muted;
  }
}

export const sound = new OrientalNoirSoundEngine();
