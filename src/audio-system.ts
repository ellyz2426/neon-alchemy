import { createSystem } from '@iwsdk/core';

export class AudioSystem extends createSystem({}) {
	private audioCtx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private ambientOsc: OscillatorNode | null = null;
	private ambientGain: GainNode | null = null;
	private initialized = false;

	init() {
		// Audio context created on first user interaction
	}

	private ensureAudioCtx() {
		if (this.audioCtx) return;
		try {
			this.audioCtx = new AudioContext();
			this.masterGain = this.audioCtx.createGain();
			this.masterGain.gain.value = 0.3;
			this.masterGain.connect(this.audioCtx.destination);
		} catch {
			// Audio not available
		}
	}

	startAmbient() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain || this.ambientOsc) return;

		this.ambientGain = this.audioCtx.createGain();
		this.ambientGain.gain.value = 0.04;
		this.ambientGain.connect(this.masterGain);

		// Deep mystical hum
		this.ambientOsc = this.audioCtx.createOscillator();
		this.ambientOsc.type = 'sine';
		this.ambientOsc.frequency.value = 65;
		this.ambientOsc.connect(this.ambientGain);
		this.ambientOsc.start();

		// Secondary harmonic
		const osc2 = this.audioCtx.createOscillator();
		osc2.type = 'sine';
		osc2.frequency.value = 98;
		const g2 = this.audioCtx.createGain();
		g2.gain.value = 0.02;
		osc2.connect(g2);
		g2.connect(this.masterGain);
		osc2.start();
	}

	stopAmbient() {
		if (this.ambientOsc) {
			this.ambientOsc.stop();
			this.ambientOsc = null;
		}
	}

	playIngredientAdd() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const osc = this.audioCtx.createOscillator();
		const gain = this.audioCtx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.1);
		gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start();
		osc.stop(this.audioCtx.currentTime + 0.2);
	}

	playBubbling() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		for (let i = 0; i < 3; i++) {
			const osc = this.audioCtx.createOscillator();
			const gain = this.audioCtx.createGain();
			osc.type = 'sine';
			const t = now + i * 0.15;
			osc.frequency.setValueAtTime(200 + Math.random() * 150, t);
			osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
			gain.gain.setValueAtTime(0.08, t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
			osc.connect(gain);
			gain.connect(this.masterGain);
			osc.start(t);
			osc.stop(t + 0.12);
		}
	}

	playBrewSuccess() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		const notes = [523, 659, 784, 1047];
		notes.forEach((freq, i) => {
			const osc = this.audioCtx!.createOscillator();
			const gain = this.audioCtx!.createGain();
			osc.type = 'sine';
			const t = now + i * 0.1;
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.12, t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
			osc.connect(gain);
			gain.connect(this.masterGain!);
			osc.start(t);
			osc.stop(t + 0.3);
		});
	}

	playBrewFail() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		const osc = this.audioCtx.createOscillator();
		const gain = this.audioCtx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(200, now);
		osc.frequency.linearRampToValueAtTime(80, now + 0.4);
		gain.gain.setValueAtTime(0.1, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start();
		osc.stop(now + 0.5);
	}

	playServe() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		const osc = this.audioCtx.createOscillator();
		const gain = this.audioCtx.createGain();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(660, now);
		osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
		gain.gain.setValueAtTime(0.15, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start();
		osc.stop(now + 0.3);
	}

	playWaveComplete() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		const notes = [392, 494, 587, 784, 988];
		notes.forEach((freq, i) => {
			const osc = this.audioCtx!.createOscillator();
			const gain = this.audioCtx!.createGain();
			osc.type = 'sine';
			const t = now + i * 0.12;
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.12, t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
			osc.connect(gain);
			gain.connect(this.masterGain!);
			osc.start(t);
			osc.stop(t + 0.4);
		});
	}

	playGameOver() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		const notes = [392, 330, 262, 196];
		notes.forEach((freq, i) => {
			const osc = this.audioCtx!.createOscillator();
			const gain = this.audioCtx!.createGain();
			osc.type = 'sine';
			const t = now + i * 0.2;
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.12, t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
			osc.connect(gain);
			gain.connect(this.masterGain!);
			osc.start(t);
			osc.stop(t + 0.5);
		});
	}

	playOrderExpired() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		const osc = this.audioCtx.createOscillator();
		const gain = this.audioCtx.createGain();
		osc.type = 'square';
		osc.frequency.setValueAtTime(300, now);
		osc.frequency.linearRampToValueAtTime(150, now + 0.3);
		gain.gain.setValueAtTime(0.08, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start();
		osc.stop(now + 0.35);
	}

	playClick() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const osc = this.audioCtx.createOscillator();
		const gain = this.audioCtx.createGain();
		osc.type = 'sine';
		osc.frequency.value = 600;
		gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start();
		osc.stop(this.audioCtx.currentTime + 0.05);
	}

	playTimerTick() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const osc = this.audioCtx.createOscillator();
		const gain = this.audioCtx.createGain();
		osc.type = 'sine';
		osc.frequency.value = 880;
		gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start();
		osc.stop(this.audioCtx.currentTime + 0.08);
	}

	update(_delta: number, _time: number) {
		// No per-frame updates needed
	}
}
