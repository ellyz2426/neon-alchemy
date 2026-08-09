import { createSystem, UIKitMLAsset, World, Vector3 } from '@iwsdk/core';
import {
	type GameData,
	type Order,
	createInitialGameData,
	findMatchingRecipe,
	getIngredientById,
	getRecipeById,
	INGREDIENTS,
	RECIPES,
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

	// Brewing animation
	private brewParticles: { mesh: import('@iwsdk/core').Mesh; velocity: Vector3; life: number }[] = [];

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
		// Create clickable entities for each ingredient shelf
		// Since ingredients are Three.js meshes, we'll use raycasting in the InputSystem
		// For now, ingredients are interacted through the environment positions
		// We'll handle this via a simple distance-based click detection in update
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
	}

	private updateMenuHighScore() {
		const panel = this.getPanel('menu-panel');
		if (!panel) return;
		panel.getElementById('highscore')?.setProperties({
			text: `HIGH SCORE: ${this.data.highScore}`,
		});
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

		this.showState('playing');
		this.audio.startAmbient();
		this.env.setBubblesActive(true);
		this.env.setCauldronColor(0x8844cc);
		this.updateHUD();
		this.updateOrdersPanel();
		this.updateCauldronPanel();
		this.spawnOrder();
	}

	private spawnOrder() {
		if (this.data.orders.length >= 3) return;

		const wave = this.data.wave;
		// More complex recipes at higher waves
		const availableRecipes = wave >= 4 ? RECIPES : wave >= 2 ? RECIPES.slice(0, 5) : RECIPES.slice(0, 3);
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
	}

	private addIngredient(ingredientId: string) {
		if (this.data.state !== 'playing') return;
		if (this.data.cauldronIngredients.length >= 3) return;
		if (this.data.isBrewing) return;

		this.data.cauldronIngredients.push(ingredientId);
		this.audio.playIngredientAdd();
		this.env.pulseIngredient(ingredientId);

		// Update cauldron color based on ingredients
		const ingredient = getIngredientById(ingredientId);
		if (ingredient) {
			this.env.setCauldronColor(ingredient.color);
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
	}

	private completeBrew() {
		const recipe = findMatchingRecipe(this.data.cauldronIngredients);
		this.data.isBrewing = false;
		this.data.brewProgress = 0;
		this.env.stopBrewingEffect();

		if (recipe) {
			// Check if any order matches
			const orderIdx = this.data.orders.findIndex((o) => o.recipeId === recipe.id);
			if (orderIdx >= 0) {
				const order = this.data.orders[orderIdx];
				const timeBonus = Math.floor((order.timeRemaining / order.timeLimit) * 50);
				const points = Math.floor(recipe.points * order.bonusMultiplier + timeBonus);
				this.data.combo++;
				if (this.data.combo > this.data.bestCombo) this.data.bestCombo = this.data.combo;
				const comboMultiplier = 1 + (this.data.combo - 1) * 0.25;
				const totalPoints = Math.floor(points * comboMultiplier);
				this.data.score += totalPoints;
				this.data.waveScore += totalPoints;
				this.data.potionsBrewed++;
				this.data.totalPotionsBrewed++;
				if (order.timeRemaining > order.timeLimit * 0.5) {
					this.data.perfectBrews++;
				}

				this.data.orders.splice(orderIdx, 1);
				this.audio.playBrewSuccess();
				this.audio.playServe();
				this.env.setCauldronColor(recipe.color);
			} else {
				// Valid potion but no matching order — partial points
				this.data.score += Math.floor(recipe.points * 0.3);
				this.data.waveScore += Math.floor(recipe.points * 0.3);
				this.data.totalPotionsBrewed++;
				this.data.combo = 0;
				this.audio.playBrewSuccess();
			}
		} else {
			// Failed brew — dud
			this.data.combo = 0;
			this.audio.playBrewFail();
			this.env.setCauldronColor(0x333333);
		}

		this.data.cauldronIngredients = [];
		this.updateHUD();
		this.updateOrdersPanel();
		this.updateCauldronPanel();

		// Reset cauldron color after delay
		setTimeout(() => {
			this.env.setCauldronColor(0x8844cc);
		}, 500);
	}

	private clearCauldron() {
		if (this.data.isBrewing) return;
		this.data.cauldronIngredients = [];
		this.env.setCauldronColor(0x8844cc);
		this.updateCauldronPanel();
	}

	private handleOrderExpired(index: number) {
		this.data.orders.splice(index, 1);
		this.data.lives--;
		this.data.combo = 0;
		this.audio.playOrderExpired();
		this.updateHUD();
		this.updateOrdersPanel();

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
		panel.getElementById('new-record')?.setProperties({
			text: this.data.score >= this.data.highScore ? '★ NEW RECORD! ★' : '',
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
					if (timerEl) timerEl.setProperties({
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
	}

	// Public method for InputSystem to call
	handleIngredientClick(ingredientId: string) {
		this.addIngredient(ingredientId);
	}

	update(delta: number, _time: number) {
		if (this.data.state !== 'playing') return;

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

		// Order timers
		for (let i = this.data.orders.length - 1; i >= 0; i--) {
			this.data.orders[i].timeRemaining -= delta;
			if (this.data.orders[i].timeRemaining <= 0) {
				this.handleOrderExpired(i);
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

		// Check wave complete
		if (this.checkWaveComplete()) {
			this.completeWave();
		}
	}
}
