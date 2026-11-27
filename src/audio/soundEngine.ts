import { Rarity } from '../types/raid';

class StealthRaidSoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private lastTickAt = 0;

  private ensureCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTap() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.04);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playSearchTick(progress01: number) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastTickAt < 135) return;
    this.lastTickAt = nowMs;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620 + progress01 * 520, now);
    g.gain.setValueAtTime(0.07, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * "出大红了!!" Dopamine Loot Burst Sound!
   */
  public playLootReveal(rarity: Rarity) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (rarity === 'mythic' || rarity === 'legendary') {
      const chord = rarity === 'mythic' ? [261.6, 329.6, 392.0, 523.25, 783.99] : [293.6, 369.9, 440, 587.3];
      chord.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.045);
        g.gain.setValueAtTime(0.16, now + idx * 0.045);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.65);
        osc.connect(g).connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.68);
      });
    } else {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(rarity === 'epic' ? 740 : 580, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.14);
      g.gain.setValueAtTime(0.13, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    }
  }

  public playCoinToss() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [1320, 1760].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.05);
      g.gain.setValueAtTime(0.12, now + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.18);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.19);
    });
  }

  public playSmokeBomb() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.25);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  public playBackstab() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playGuardAlert() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.linearRampToValueAtTime(520, now + 0.12);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playPlayerHit() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(45, now + 0.28);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playCashOutGong() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [261.6, 329.6, 392.0, 523.2, 659.2].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.055);
      g.gain.setValueAtTime(0.16, now + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.55);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.58);
    });
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }
}

export const sound = new StealthRaidSoundEngine();
