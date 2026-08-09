import { createSystem } from '@iwsdk/core';

// Base frequencies for each ingredient — gives each a distinct pitch character
const INGREDIENT_PITCHES: Record<string, number> = {
	herb: 392,     // G4
	crystal: 440,  // A4
	mushroom: 330, // E4
	essence: 494,  // B4
	scale: 294,    // D4
	fang: 262,     // C4
	feather: 523,  // C5
	pearl: 587,    // D5
	void: 220,     // A3 (low, ominous)
	frost: 659,    // E5
	sun: 698,      // F5
};

export class AudioSystem extends createSystem({}) {
	private audioCtx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private ambientOsc: OscillatorNode | null = null;
	private ambientGain: GainNode | null = null;
	private initialized = false;

	// Wave-progressive ambient layers
	private ambientLayers: { osc: OscillatorNode; gain: GainNode }[] = [];
	private currentWaveLayer = 0;

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

		// Pre-create wave-progressive layers (initially silent)
		const layerFreqs = [130, 196, 262, 330, 392]; // C3, G3, C4, E4, G4
		for (const freq of layerFreqs) {
			const layerOsc = this.audioCtx.createOscillator();
			const layerGain = this.audioCtx.createGain();
			layerOsc.type = 'sine';
			layerOsc.frequency.value = freq;
			layerGain.gain.value = 0; // silent until wave activates
			layerOsc.connect(layerGain);
			layerGain.connect(this.masterGain);
			layerOsc.start();
			this.ambientLayers.push({ osc: layerOsc, gain: layerGain });
		}
		this.currentWaveLayer = 0;
	}

	/**
	 * Activate ambient music layers proportional to wave number.
	 * Each wave adds a new harmonic layer for building intensity.
	 */
	setWaveLayer(wave: number) {
		if (!this.audioCtx) return;
		const targetLayers = Math.min(wave, this.ambientLayers.length);
		const now = this.audioCtx.currentTime;
		for (let i = 0; i < this.ambientLayers.length; i++) {
			const layer = this.ambientLayers[i];
			const targetVol = i < targetLayers ? 0.012 + i * 0.003 : 0;
			layer.gain.gain.cancelScheduledValues(now);
			layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
			layer.gain.gain.linearRampToValueAtTime(targetVol, now + 1.5);
		}
		this.currentWaveLayer = targetLayers;
	}

	stopAmbient() {
		if (this.ambientOsc) {
			this.ambientOsc.stop();
			this.ambientOsc = null;
		}
		// Stop wave layers
		for (const layer of this.ambientLayers) {
			try { layer.osc.stop(); } catch {}
		}
		this.ambientLayers = [];
		this.currentWaveLayer = 0;
	}

	/**
	 * Play an ingredient-specific pickup sound. Each ingredient has a unique pitch.
	 */
	playIngredientAdd(ingredientId?: string) {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const basePitch = (ingredientId && INGREDIENT_PITCHES[ingredientId]) || 440;
		const osc = this.audioCtx.createOscillator();
		const gain = this.audioCtx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(basePitch, this.audioCtx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(basePitch * 2, this.audioCtx.currentTime + 0.1);
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

	playBrewSuccess(combo: number = 1) {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		// Scale pitch with combo — higher combos = higher notes
		const pitchMult = 1 + Math.min(combo - 1, 5) * 0.08;
		const notes = [523, 659, 784, 1047].map((n) => n * pitchMult);
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

	playWaveTransition() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		// Ascending "charging up" tone — sweeps from low to high
		const osc = this.audioCtx.createOscillator();
		const gain = this.audioCtx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(200, now);
		osc.frequency.exponentialRampToValueAtTime(1200, now + 0.8);
		gain.gain.setValueAtTime(0.08, now);
		gain.gain.setValueAtTime(0.1, now + 0.4);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start();
		osc.stop(now + 1.0);

		// Harmonic shimmer
		const osc2 = this.audioCtx.createOscillator();
		const gain2 = this.audioCtx.createGain();
		osc2.type = 'triangle';
		osc2.frequency.setValueAtTime(400, now + 0.1);
		osc2.frequency.exponentialRampToValueAtTime(2400, now + 0.9);
		gain2.gain.setValueAtTime(0.04, now + 0.1);
		gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
		osc2.connect(gain2);
		gain2.connect(this.masterGain);
		osc2.start(now + 0.1);
		osc2.stop(now + 1.0);
	}

	playPowerUp() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		// Bright ascending chime — three quick notes + shimmer tail
		for (let i = 0; i < 3; i++) {
			const osc = this.audioCtx.createOscillator();
			const gain = this.audioCtx.createGain();
			osc.type = 'sine';
			const freq = 600 + i * 200;
			const start = now + i * 0.08;
			osc.frequency.setValueAtTime(freq, start);
			gain.gain.setValueAtTime(0.12, start);
			gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
			osc.connect(gain);
			gain.connect(this.masterGain);
			osc.start(start);
			osc.stop(start + 0.25);
		}
		// Shimmer tail
		const shimmer = this.audioCtx.createOscillator();
		const shimGain = this.audioCtx.createGain();
		shimmer.type = 'triangle';
		shimmer.frequency.setValueAtTime(1200, now + 0.24);
		shimmer.frequency.exponentialRampToValueAtTime(2400, now + 0.6);
		shimGain.gain.setValueAtTime(0.06, now + 0.24);
		shimGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
		shimmer.connect(shimGain);
		shimGain.connect(this.masterGain);
		shimmer.start(now + 0.24);
		shimmer.stop(now + 0.8);
	}

	/**
	 * Play a boss wave entrance horn — ominous low brass + impact.
	 */
	playBossHorn() {
		this.ensureAudioCtx();
		if (!this.audioCtx || !this.masterGain) return;
		const now = this.audioCtx.currentTime;
		// Low brass-like horn
		const osc = this.audioCtx.createOscillator();
		const gain = this.audioCtx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(110, now);
		osc.frequency.linearRampToValueAtTime(130, now + 0.6);
		gain.gain.setValueAtTime(0.0, now);
		gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
		gain.gain.setValueAtTime(0.12, now + 0.5);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(now);
		osc.stop(now + 1.2);
		// Second horn, fifth above
		const osc2 = this.audioCtx.createOscillator();
		const gain2 = this.audioCtx.createGain();
		osc2.type = 'sawtooth';
		osc2.frequency.setValueAtTime(165, now + 0.2);
		osc2.frequency.linearRampToValueAtTime(196, now + 0.8);
		gain2.gain.setValueAtTime(0.0, now + 0.2);
		gain2.gain.linearRampToValueAtTime(0.08, now + 0.35);
		gain2.gain.setValueAtTime(0.08, now + 0.7);
		gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
		osc2.connect(gain2);
		gain2.connect(this.masterGain);
		osc2.start(now + 0.2);
		osc2.stop(now + 1.3);
		// Impact hit
		const impact = this.audioCtx.createOscillator();
		const impactGain = this.audioCtx.createGain();
		impact.type = 'sine';
		impact.frequency.setValueAtTime(80, now + 0.8);
		impact.frequency.exponentialRampToValueAtTime(30, now + 1.4);
		impactGain.gain.setValueAtTime(0.15, now + 0.8);
		impactGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
		impact.connect(impactGain);
		impactGain.connect(this.masterGain);
		impact.start(now + 0.8);
		impact.stop(now + 1.5);
	}

	update(_delta: number, _time: number) {
		// No per-frame updates needed
	}
}
