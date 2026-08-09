import { createSystem, UIKitMLAsset, World, Vector3 } from '@iwsdk/core';
import {
	type GameData,
	type Order,
	type PowerUp,
	createInitialGameData,
	findMatchingRecipe,
	getIngredientById,
	getRecipeById,
	INGREDIENTS,
	RECIPES,
	findPartialRecipeHints,
	POWER_UP_DEFS,
} from './game-data.js';
import { EnvironmentSystem } from './environment-system.js';
import { AudioSystem } from './audio-system.js';

// Panel info for toggling visibility via position
interface PanelEntry {
	asset: UIKitMLAsset;
	showPos: Vector3;
}

const HIDDEN_POS = new Vector3(0, -100, 0);

export class GameSystem extends createSystem({}) {
	private data!: GameData;

	// Panel entries with show positions
	private panels: Map<string, PanelEntry> = new Map();

	// System refs
	private env!: EnvironmentSystem;
	private audio!: AudioSystem;

	// Timers
	private orderSpawnTimer = 0;
	private orderSpawnInterval = 8;
	private tickTimer = 0;
	private brewTimer = 0;
	private lastTimerWarn = 0;

	// Camera shake
	private shakeTimer = 0;
	private shakeIntensity = 0;
	private cameraBasePos = new Vector3();
	private cameraInitialized = false;

	// Cauldron panel flash
	private cauldronFlashTimer = 0;

	// Tutorial state
	private tutorialStep = 0;
	private tutorialTimer = 0;
	private hasShownTutorial = false;

	init() {
		this.data = createInitialGameData();
		const world = this.world as World;

		this.env = world.getSystem(EnvironmentSystem)!;
		this.audio = world.getSystem(AudioSystem)!;

		// Resolve and store panels with their show positions
		const panelIds = ['menu-panel', 'hud-panel', 'orders-panel', 'recipes-panel', 'cauldron-panel', 'wave-complete-panel', 'game-over-panel'];
		for (const id of panelIds) {
			const asset = world.getSceneObject<UIKitMLAsset>(id);
			if (asset) {
				const pos = new Vector3();
				asset.getWorldPosition(pos);
				this.panels.set(id, { asset, showPos: pos.clone() });
			}
		}

		this.wireMenuPanel();
		this.wireRecipesPanel();
		this.wireCauldronPanel();
		this.wireWaveCompletePanel();
		this.wireGameOverPanel();
		this.wireIngredientInteractions();

		this.showState('menu');
		this.updateMenuHighScore();
	}

	private getPanel(id: string): UIKitMLAsset | null {
		return this.panels.get(id)?.asset ?? null;
	}

	private setPanelVisible(id: string, visible: boolean) {
		const entry = this.panels.get(id);
		if (!entry) return;
		if (visible) {
			entry.asset.position.copy(entry.showPos);
		} else {
			entry.asset.position.copy(HIDDEN_POS);
		}
	}

	private wireMenuPanel() {
		const panel = this.getPanel('menu-panel');
		if (!panel) return;
		panel.getElementById('btn-play')?.addEventListener('click', () => {
			this.audio.playClick();
			this.startGame();
		});
		panel.getElementById('btn-recipes')?.addEventListener('click', () => {
			this.audio.playClick();
			this.showState('recipes');
		});
	}

	private wireRecipesPanel() {
		const panel = this.getPanel('recipes-panel');
		if (!panel) return;
		// Update recipe content
		RECIPES.forEach((recipe, i) => {
			const nameEl = panel.getElementById(`rname-${i}`);
			const ingrEl = panel.getElementById(`ringr-${i}`);
			if (nameEl) nameEl.setProperties({ text: recipe.name });
			if (ingrEl) {
				const names = recipe.ingredients.map((id) => getIngredientById(id)?.name ?? id).join(' + ');
				ingrEl.setProperties({ text: names });
			}
		});
		panel.getElementById('btn-close')?.addEventListener('click', () => {
			this.audio.playClick();
			this.showState('menu');
		});
	}

	private wireCauldronPanel() {
		const panel = this.getPanel('cauldron-panel');
		if (!panel) return;
		panel.getElementById('btn-brew')?.addEventListener('click', () => {
			this.audio.playClick();
			this.brewPotion();
		});
		panel.getElementById('btn-clear')?.addEventListener('click', () => {
			this.audio.playClick();
			this.clearCauldron();
		});
	}

	private wireWaveCompletePanel() {
		const panel = this.getPanel('wave-complete-panel');
		if (!panel) return;
		panel.getElementById('btn-next')?.addEventListener('click', () => {
			this.audio.playClick();
			this.nextWave();
		});
	}

	private wireGameOverPanel() {
		const panel = this.getPanel('game-over-panel');
		if (!panel) return;
		panel.getElementById('btn-replay')?.addEventListener('click', () => {
			this.audio.playClick();
			this.startGame();
		});
		panel.getElementById('btn-menu')?.addEventListener('click', () => {
			this.audio.playClick();
			this.showState('menu');
			this.updateMenuHighScore();
		});
	}

	private wireIngredientInteractions() {
		// Ingredients are interacted via raycasting in InputSystem
	}

	private showState(state: GameData['state']) {
		this.data.state = state;
		this.setPanelVisible('menu-panel', state === 'menu');
		this.setPanelVisible('hud-panel', state === 'playing');
		this.setPanelVisible('orders-panel', state === 'playing');
		this.setPanelVisible('recipes-panel', state === 'recipes');
		this.setPanelVisible('cauldron-panel', state === 'playing');
		this.setPanelVisible('wave-complete-panel', state === 'wave_complete');
		this.setPanelVisible('game-over-panel', state === 'game_over');

		// Notify environment about playing state for rune animation
		this.env.setPlaying(state === 'playing');
	}

	private updateMenuHighScore() {
		const panel = this.getPanel('menu-panel');
		if (!panel) return;
		panel.getElementById('highscore')?.setProperties({
			text: `HIGH SCORE: ${this.data.highScore}`,
		});
	}

	private getDifficultyLabel(wave: number): string {
		if (wave <= 2) return 'EASY';
		if (wave <= 4) return 'MEDIUM';
		if (wave <= 6) return 'HARD';
		if (wave <= 8) return 'EXTREME';
		return 'MASTER';
	}

	private startGame() {
		this.data = {
			...createInitialGameData(),
			highScore: this.data.highScore,
		};
		this.data.state = 'playing';
		this.data.waveTimeLimit = 60;
		this.data.waveTimer = 60;
		this.orderSpawnTimer = 2; // first order in 2 seconds
		this.orderSpawnInterval = 8;
		this.data.orders = [];
		this.tickTimer = 0;
		this.lastTimerWarn = 0;

		// Tutorial for first-time players
		if (!this.hasShownTutorial) {
			this.tutorialStep = 1;
			this.tutorialTimer = 0;
		}

		this.showState('playing');
		this.audio.startAmbient();
		this.env.setBubblesActive(true);
		this.env.setCauldronColor(0x8844cc);
		this.env.setWaveLevel(1);
		this.env.setComboLevel(0);
		this.env.setLives(3);
		this.env.setNeededIngredients([]);
		this.updateHUD();
		this.updateOrdersPanel();
		this.updateCauldronPanel();
		this.spawnOrder();
	}

	private spawnOrder() {
		if (this.data.orders.length >= 3) return;

		const wave = this.data.wave;
		// Progressive recipe unlocking: wave 1 = basic (first 4), wave 2-3 = mid (first 7), wave 4+ = all 11
		const availableRecipes = wave >= 4 ? RECIPES : wave >= 2 ? RECIPES.slice(0, 7) : RECIPES.slice(0, 4);
		const recipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];

		const baseTime = Math.max(15, 35 - wave * 3);
		const isUrgent = Math.random() < 0.15 * wave;

		const order: Order = {
			recipeId: recipe.id,
			timeLimit: isUrgent ? baseTime * 0.6 : baseTime,
			timeRemaining: isUrgent ? baseTime * 0.6 : baseTime,
			isUrgent,
			bonusMultiplier: isUrgent ? 2.0 : 1.0,
		};

		this.data.orders.push(order);
		this.updateOrdersPanel();
		this.updateNeededIngredients();
		// Activate spirit for this order slot
		this.env.setSpiritState(this.data.orders.length - 1, 'active');
	}

	private addIngredient(ingredientId: string) {
		if (this.data.state !== 'playing') return;
		if (this.data.cauldronIngredients.length >= 3) return;
		if (this.data.isBrewing) return;
		// Cooldown check
		if (this.env.isIngredientOnCooldown(ingredientId)) return;

		this.data.cauldronIngredients.push(ingredientId);
		this.audio.playIngredientAdd();
		this.env.pulseIngredient(ingredientId);
		this.env.startIngredientCooldown(ingredientId);

		// Fly ingredient to cauldron (visual effect)
		this.env.flyIngredientToCauldron(ingredientId);

		// Update cauldron color based on ingredients
		const ingredient = getIngredientById(ingredientId);
		if (ingredient) {
			this.env.setCauldronColor(ingredient.color);
		}

		// Flash the cauldron panel
		this.cauldronFlashTimer = 0.3;

		// Advance tutorial
		if (this.tutorialStep === 1) {
			this.tutorialStep = 2;
			this.tutorialTimer = 0;
		}

		this.updateCauldronPanel();
	}

	private brewPotion() {
		if (this.data.state !== 'playing') return;
		if (this.data.cauldronIngredients.length < 2) return;
		if (this.data.isBrewing) return;

		this.data.isBrewing = true;
		this.data.brewProgress = 0;
		this.audio.playBubbling();
		this.env.setBubblesActive(true);
		this.env.startBrewingEffect();

		// Advance tutorial
		if (this.tutorialStep === 2) {
			this.tutorialStep = 3;
			this.tutorialTimer = 0;
		}
	}

	private completeBrew() {
		const recipe = findMatchingRecipe(this.data.cauldronIngredients);
		this.data.isBrewing = false;
		this.data.brewProgress = 0;
		this.env.stopBrewingEffect();

		if (recipe) {
			// Track brews per recipe
			this.data.brewsByRecipe[recipe.id] = (this.data.brewsByRecipe[recipe.id] || 0) + 1;

			// Check if any order matches
			const orderIdx = this.data.orders.findIndex((o) => o.recipeId === recipe.id);
			if (orderIdx >= 0) {
				const order = this.data.orders[orderIdx];
				const timeBonus = Math.floor((order.timeRemaining / order.timeLimit) * 50);
				const points = Math.floor(recipe.points * order.bonusMultiplier + timeBonus);
				this.data.combo++;
				if (this.data.combo > this.data.bestCombo) this.data.bestCombo = this.data.combo;
				const comboMultiplier = 1 + (this.data.combo - 1) * 0.25;
				const doubleMultiplier = this.data.activePowerUp?.type === 'double_points' ? 2 : 1;
				const totalPoints = Math.floor(points * comboMultiplier * doubleMultiplier);
				this.data.score += totalPoints;
				this.data.waveScore += totalPoints;
				this.data.potionsBrewed++;
				this.data.totalPotionsBrewed++;
				if (order.timeRemaining > order.timeLimit * 0.5) {
					this.data.perfectBrews++;
				}

				this.data.orders.splice(orderIdx, 1);
				this.audio.playBrewSuccess(this.data.combo);
				this.audio.playServe();
				this.env.setCauldronColor(recipe.color);
				this.env.setComboLevel(this.data.combo);

				// Spawn potion bottle + score popup + burst particles
				this.env.spawnPotionBottle(recipe.color);
				this.env.spawnScorePopup(totalPoints);
				this.env.spawnBrewBurst(recipe.color);
				this.env.addCompletedBottle(recipe.color);
				// Spirit fulfilled for this order
				this.env.setSpiritState(orderIdx, 'fulfilled');
				// Random power-up drop (20% chance, slightly higher at higher waves)
				this.tryDropPowerUp();
			} else {
				// Valid potion but no matching order — partial points
				const partialPoints = Math.floor(recipe.points * 0.3);
				this.data.score += partialPoints;
				this.data.waveScore += partialPoints;
				this.data.totalPotionsBrewed++;
				this.data.combo = 0;
				this.env.setComboLevel(0);
				this.audio.playBrewSuccess(1);
				this.env.spawnPotionBottle(recipe.color);
				this.env.spawnScorePopup(partialPoints);
				this.env.addCompletedBottle(recipe.color);
			}

			// End tutorial after first successful brew
			if (this.tutorialStep > 0) {
				this.tutorialStep = 0;
				this.hasShownTutorial = true;
			}
		} else {
			// Failed brew — dud
			this.data.combo = 0;
			this.env.setComboLevel(0);
			this.audio.playBrewFail();
			this.env.setCauldronColor(0x333333);

			// Camera shake on fail
			this.triggerCameraShake(0.3, 0.015);
		}

		this.data.cauldronIngredients = [];
		this.updateHUD();
		this.updateOrdersPanel();
		this.updateCauldronPanel();
		this.updateNeededIngredients();

		// Reset cauldron color after delay
		setTimeout(() => {
			this.env.setCauldronColor(0x8844cc);
		}, 500);
	}

	private triggerCameraShake(duration: number, intensity: number) {
		this.shakeTimer = duration;
		this.shakeIntensity = intensity;
		const world = this.world as World;
		if (world.camera && !this.cameraInitialized) {
			this.cameraBasePos.copy(world.camera.position);
			this.cameraInitialized = true;
		}
	}

	private clearCauldron() {
		if (this.data.isBrewing) return;
		this.data.cauldronIngredients = [];
		this.env.setCauldronColor(0x8844cc);
		this.updateCauldronPanel();
	}

	private tryDropPowerUp() {
		if (this.data.activePowerUp) return; // already have one
		const dropChance = 0.15 + Math.min(this.data.wave * 0.02, 0.15);
		if (Math.random() > dropChance) return;

		// Weighted random selection
		const totalWeight = POWER_UP_DEFS.reduce((s, d) => s + d.weight, 0);
		let roll = Math.random() * totalWeight;
		for (const def of POWER_UP_DEFS) {
			roll -= def.weight;
			if (roll <= 0) {
				// Extra life only if below 3
				if (def.type === 'extra_life' && this.data.lives >= 3) continue;
				this.activatePowerUp({ type: def.type, duration: def.duration, label: def.label });
				return;
			}
		}
	}

	private activatePowerUp(powerUp: PowerUp) {
		this.data.activePowerUp = powerUp;
		this.data.powerUpsUsed++;
		this.audio.playPowerUp();

		if (powerUp.type === 'extra_life') {
			this.data.lives = Math.min(this.data.lives + 1, 4);
			this.env.setLives(this.data.lives);
			this.updateHUD();
			// Instant effect — clear after brief display
			setTimeout(() => {
				if (this.data.activePowerUp?.type === 'extra_life') {
					this.data.activePowerUp = null;
					this.updateHUD();
				}
			}, 1500);
		}
		this.updateHUD();
	}

	private handleOrderExpired(index: number) {
		// Trigger spirit expiration before removing order
		this.env.setSpiritState(index, 'expired');
		this.data.orders.splice(index, 1);
		this.data.lives--;
		this.data.combo = 0;
		this.env.setComboLevel(0);
		this.env.setLives(this.data.lives);
		this.audio.playOrderExpired();
		this.updateHUD();
		this.updateOrdersPanel();
		this.updateNeededIngredients();

		// Small camera shake on order expiry
		this.triggerCameraShake(0.2, 0.008);

		if (this.data.lives <= 0) {
			this.endGame();
		}
	}

	private checkWaveComplete(): boolean {
		return this.data.waveTimer <= 0;
	}

	private completeWave() {
		this.showState('wave_complete');
		this.audio.playWaveComplete();
		this.env.setBubblesActive(false);

		const panel = this.getPanel('wave-complete-panel');
		if (!panel) return;
		panel.getElementById('wave-num')?.setProperties({ text: `Wave ${this.data.wave}` });
		panel.getElementById('potions-brewed')?.setProperties({ text: `${this.data.potionsBrewed}` });
		panel.getElementById('perfect-brews')?.setProperties({ text: `${this.data.perfectBrews}` });
		panel.getElementById('best-combo')?.setProperties({ text: `x${this.data.bestCombo}` });
		panel.getElementById('wave-score')?.setProperties({ text: `${this.data.waveScore}` });

		// Star rating based on performance
		let stars = 1;
		let starLabel = 'GOOD';
		if (this.data.potionsBrewed >= 3 && this.data.perfectBrews >= 1) { stars = 2; starLabel = 'GREAT'; }
		if (this.data.potionsBrewed >= 5 && this.data.perfectBrews >= 2 && this.data.bestCombo >= 3) { stars = 3; starLabel = 'PERFECT'; }
		const starText = stars === 3 ? '★ ★ ★' : stars === 2 ? '★ ★ ☆' : '★ ☆ ☆';
		panel.getElementById('stars')?.setProperties({ text: starText });
		panel.getElementById('star-label')?.setProperties({ text: starLabel });
	}

	private nextWave() {
		this.data.wave++;
		this.data.waveTimer = Math.max(40, 60 - (this.data.wave - 1) * 3);
		this.data.waveTimeLimit = this.data.waveTimer;
		this.data.potionsBrewed = 0;
		this.data.perfectBrews = 0;
		this.data.waveScore = 0;
		this.data.bestCombo = 0;
		this.data.combo = 0;
		this.data.orders = [];
		this.data.cauldronIngredients = [];
		this.orderSpawnTimer = 2;
		this.orderSpawnInterval = Math.max(3, 8 - this.data.wave * 0.5);
		this.lastTimerWarn = 0;

		this.showState('playing');
		this.env.setBubblesActive(true);
		this.env.setCauldronColor(0x8844cc);
		this.env.setWaveLevel(this.data.wave);
		this.env.setComboLevel(0);
		this.env.setNeededIngredients([]);
		// Wave transition effect
		this.env.triggerWaveTransition();
		this.audio.playWaveTransition();
		this.updateHUD();
		this.updateOrdersPanel();
		this.updateCauldronPanel();
		this.spawnOrder();
	}

	private endGame() {
		// Save high score
		if (this.data.score > this.data.highScore) {
			this.data.highScore = this.data.score;
			try {
				localStorage.setItem('neon-alchemy-highscore', String(this.data.highScore));
			} catch {}
		}

		this.showState('game_over');
		this.audio.playGameOver();
		this.audio.stopAmbient();
		this.env.setBubblesActive(false);

		const panel = this.getPanel('game-over-panel');
		if (!panel) return;
		panel.getElementById('final-score')?.setProperties({ text: `${this.data.score}` });
		panel.getElementById('waves-cleared')?.setProperties({ text: `${this.data.wave}` });
		panel.getElementById('total-potions')?.setProperties({ text: `${this.data.totalPotionsBrewed}` });
		panel.getElementById('high-score')?.setProperties({ text: `${this.data.highScore}` });
		panel.getElementById('powerups-used')?.setProperties({ text: `${this.data.powerUpsUsed}` });
		panel.getElementById('new-record')?.setProperties({
			text: this.data.score >= this.data.highScore ? '★ NEW RECORD! ★' : '',
		});

		// Update per-recipe brew counts in game over panel
		RECIPES.forEach((recipe, i) => {
			const nameEl = panel.getElementById(`rstat-name-${i}`);
			const countEl = panel.getElementById(`rstat-count-${i}`);
			if (nameEl) nameEl.setProperties({ text: recipe.name });
			if (countEl) countEl.setProperties({ text: `${this.data.brewsByRecipe[recipe.id] || 0}` });
		});
	}

	private updateHUD() {
		const panel = this.getPanel('hud-panel');
		if (!panel) return;
		panel.getElementById('score')?.setProperties({ text: `${this.data.score}` });
		panel.getElementById('wave')?.setProperties({ text: `${this.data.wave}` });
		panel.getElementById('timer')?.setProperties({ text: `${Math.ceil(this.data.waveTimer)}` });
		panel.getElementById('combo')?.setProperties({ text: `x${Math.max(1, this.data.combo)}` });
		panel.getElementById('lives')?.setProperties({ text: `${this.data.lives}` });
		panel.getElementById('difficulty')?.setProperties({ text: this.getDifficultyLabel(this.data.wave) });

		// Power-up indicator
		const puEl = panel.getElementById('powerup');
		if (puEl) {
			if (this.data.activePowerUp) {
				const pu = this.data.activePowerUp;
				const timeLeft = pu.duration > 0 ? ` ${Math.ceil(pu.duration)}s` : '';
				puEl.setProperties({ text: `${pu.label}${timeLeft}` });
			} else {
				puEl.setProperties({ text: '' });
			}
		}

		// Tutorial hint text
		const hintEl = panel.getElementById('hint');
		if (hintEl) {
			let hintText = '';
			if (this.tutorialStep === 1) {
				hintText = 'Click ingredients on the shelves to add them';
			} else if (this.tutorialStep === 2) {
				hintText = 'Add more ingredients, then press BREW!';
			} else if (this.tutorialStep === 3) {
				hintText = 'Brewing... watch the cauldron!';
			}
			hintEl.setProperties({ text: hintText });
		}
	}

	private updateOrdersPanel() {
		const panel = this.getPanel('orders-panel');
		if (!panel) return;

		for (let i = 0; i < 3; i++) {
			const order = this.data.orders[i];
			const orderEl = panel.getElementById(`order-${i}`);
			const nameEl = panel.getElementById(`name-${i}`);
			const timerEl = panel.getElementById(`timer-${i}`);

			if (order) {
				const recipe = getRecipeById(order.recipeId);
				if (orderEl) orderEl.setProperties({ display: 'flex' });
				if (nameEl) nameEl.setProperties({ text: recipe?.name ?? order.recipeId });
				if (timerEl) {
					const remaining = Math.ceil(order.timeRemaining);
					const urgent = order.isUrgent || order.timeRemaining < order.timeLimit * 0.3;
					timerEl.setProperties({
						text: `${remaining}s${urgent ? ' ⚠' : ''}`,
					});
				}
			} else {
				if (orderEl) orderEl.setProperties({ display: 'none' });
			}
		}

		const emptyMsg = panel.getElementById('empty-msg');
		if (emptyMsg) {
			emptyMsg.setProperties({ display: this.data.orders.length === 0 ? 'flex' : 'none' });
		}
	}

	private updateCauldronPanel() {
		const panel = this.getPanel('cauldron-panel');
		if (!panel) return;

		for (let i = 0; i < 3; i++) {
			const ingredientId = this.data.cauldronIngredients[i];
			const nameEl = panel.getElementById(`sname-${i}`);

			if (ingredientId) {
				const ingredient = getIngredientById(ingredientId);
				if (nameEl) nameEl.setProperties({ text: ingredient?.name ?? 'Unknown' });
			} else {
				if (nameEl) nameEl.setProperties({ text: 'Empty' });
			}
		}

		const statusEl = panel.getElementById('status');
		if (statusEl) {
			if (this.data.isBrewing) {
				const pct = Math.floor((this.data.brewProgress / 1.5) * 100);
				statusEl.setProperties({ text: `Brewing... ${pct}%` });
			} else if (this.data.cauldronIngredients.length === 0) {
				statusEl.setProperties({ text: 'Add ingredients...' });
			} else if (this.data.cauldronIngredients.length < 2) {
				statusEl.setProperties({ text: 'Need more ingredients' });
			} else {
				statusEl.setProperties({ text: 'Ready to brew!' });
			}
		}

		// Recipe hint — show which potions could be made
		const hintEl = panel.getElementById('recipe-hint');
		if (hintEl) {
			if (this.data.cauldronIngredients.length > 0 && !this.data.isBrewing) {
				const hints = findPartialRecipeHints(this.data.cauldronIngredients);
				if (hints.length > 0) {
					hintEl.setProperties({ text: `Possible: ${hints.join(', ')}` });
				} else {
					hintEl.setProperties({ text: 'No matching recipes' });
				}
			} else {
				hintEl.setProperties({ text: '' });
			}
		}
	}

	// Public method for InputSystem to call
	handleIngredientClick(ingredientId: string) {
		this.addIngredient(ingredientId);
	}

	private updateNeededIngredients() {
		const neededIds: string[] = [];
		for (const order of this.data.orders) {
			const recipe = getRecipeById(order.recipeId);
			if (recipe) {
				for (const id of recipe.ingredients) {
					if (!neededIds.includes(id)) {
						neededIds.push(id);
					}
				}
			}
		}
		this.env.setNeededIngredients(neededIds);
	}

	update(delta: number, _time: number) {
		if (this.data.state !== 'playing') {
			// Still process camera shake when not playing
			this.updateCameraShake(delta);
			return;
		}

		// Wave timer countdown
		this.data.waveTimer -= delta;
		this.tickTimer += delta;

		// Timer warning ticks
		if (this.data.waveTimer <= 10 && this.tickTimer >= 1) {
			this.tickTimer = 0;
			this.audio.playTimerTick();
		}

		// Update HUD timer display
		const hudPanel = this.getPanel('hud-panel');
		if (hudPanel) {
			hudPanel.getElementById('timer')?.setProperties({ text: `${Math.ceil(Math.max(0, this.data.waveTimer))}` });
		}

		// Order spawning
		this.orderSpawnTimer -= delta;
		if (this.orderSpawnTimer <= 0) {
			this.spawnOrder();
			this.orderSpawnTimer = this.orderSpawnInterval;
		}

		// Order timers (frozen during time_freeze power-up)
		const timeFrozen = this.data.activePowerUp?.type === 'time_freeze';
		if (!timeFrozen) {
			for (let i = this.data.orders.length - 1; i >= 0; i--) {
				this.data.orders[i].timeRemaining -= delta;
				if (this.data.orders[i].timeRemaining <= 0) {
					this.handleOrderExpired(i);
				}
			}
		}

		// Update orders display
		this.updateOrdersPanel();

		// Brew progress
		if (this.data.isBrewing) {
			this.data.brewProgress += delta;
			this.updateCauldronPanel(); // show brew % progress
			if (this.data.brewProgress >= 1.5) {
				this.completeBrew();
			}
		}

		// Camera shake
		this.updateCameraShake(delta);

		// Cauldron panel flash feedback
		if (this.cauldronFlashTimer > 0) {
			this.cauldronFlashTimer -= delta;
			const panel = this.getPanel('cauldron-panel');
			if (panel) {
				const slotCount = this.data.cauldronIngredients.length;
				if (slotCount > 0) {
					const dotEl = panel.getElementById(`sdot-${slotCount - 1}`);
					if (dotEl) {
						const flashIntensity = this.cauldronFlashTimer / 0.3;
						const brightness = Math.floor(160 + flashIntensity * 95);
						dotEl.setProperties({
							backgroundColor: `rgba(${brightness}, ${Math.floor(brightness * 0.7)}, 255, ${0.4 + flashIntensity * 0.5})`,
						});
					}
				}
			}
		}

		// Tutorial timer
		if (this.tutorialStep > 0) {
			this.tutorialTimer += delta;
			// Auto-dismiss tutorial after 15 seconds
			if (this.tutorialTimer > 15) {
				this.tutorialStep = 0;
				this.hasShownTutorial = true;
			}
			this.updateHUD();
		}

		// Power-up duration countdown
		if (this.data.activePowerUp && this.data.activePowerUp.duration > 0) {
			this.data.activePowerUp.duration -= delta;
			if (this.data.activePowerUp.duration <= 0) {
				this.data.activePowerUp = null;
			}
			this.updateHUD();
		}

		// Check wave complete
		if (this.checkWaveComplete()) {
			this.completeWave();
		}
	}

	private updateCameraShake(delta: number) {
		if (this.shakeTimer <= 0) return;
		this.shakeTimer -= delta;
		const world = this.world as World;
		if (!world.camera) return;

		if (!this.cameraInitialized) {
			this.cameraBasePos.copy(world.camera.position);
			this.cameraInitialized = true;
		}

		if (this.shakeTimer > 0) {
			const progress = this.shakeTimer / 0.3;
			const shake = this.shakeIntensity * progress;
			world.camera.position.x = this.cameraBasePos.x + (Math.random() - 0.5) * shake * 2;
			world.camera.position.y = this.cameraBasePos.y + (Math.random() - 0.5) * shake;
		} else {
			// Reset camera position
			world.camera.position.copy(this.cameraBasePos);
			this.shakeTimer = 0;
		}
	}
}
