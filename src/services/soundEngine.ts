// 100% Offline Audio Synthesizer via Web Audio API
// No external assets, no CDN, zero latency, lightweight

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // Lazy init audio context on first user gesture
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public play(type: 'nav' | 'tab' | 'button' | 'save' | 'success' | 'delete' | 'warning' | 'error' | 'backup' | 'pin') {
    if (!this.enabled) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.15, now);
      gain.connect(this.ctx.destination);

      switch (type) {
        case 'tab':
        case 'nav': {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(480, now);
          osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }

        case 'button':
        case 'pin': {
          const osc = this.ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(520, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        case 'save':
        case 'success': {
          // Two-tone cheerful major chord
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(523.25, now); // C5
          osc1.frequency.setValueAtTime(659.25, now + 0.09); // E5
          osc2.frequency.setValueAtTime(783.99, now + 0.09); // G5
          gain.gain.setValueAtTime(this.volume * 0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc1.connect(gain);
          osc2.connect(gain);
          osc1.start(now);
          osc2.start(now + 0.09);
          osc1.stop(now + 0.28);
          osc2.stop(now + 0.28);
          break;
        }

        case 'delete': {
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
          gain.gain.setValueAtTime(this.volume * 0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }

        case 'warning': {
          const osc = this.ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(415, now + 0.1);
          gain.gain.setValueAtTime(this.volume * 0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.22);
          break;
        }

        case 'error': {
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          osc1.type = 'sawtooth';
          osc2.type = 'square';
          osc1.frequency.setValueAtTime(220, now);
          osc2.frequency.setValueAtTime(200, now);
          gain.gain.setValueAtTime(this.volume * 0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc1.connect(gain);
          osc2.connect(gain);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.25);
          osc2.stop(now + 0.25);
          break;
        }

        case 'backup': {
          // Rising 3-tone arpeggio
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            osc.connect(gain);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.08);
          });
          gain.gain.setValueAtTime(this.volume * 0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          break;
        }
      }
    } catch {
      // Audio failed or blocked by autoplay policy - fail silently
    }
  }
}

export const sound = new SoundEngine();
