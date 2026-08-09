import { createSystem, UIKitMLAsset, World } from '@iwsdk/core';
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

export class GameSystem extends createSystem({}) {
	private data!: GameData;

	// Panels
	private menuPanel: UIKitMLAsset | null = null;
	private hudPanel: UIKitMLAsset | null = null;
	private ordersPanel: UIKitMLAsset | null = null;
	private recipesPanel: UIKitMLAsset | null = null;
	private cauldronPanel: UIKitMLAsset | null = null;
	private waveCompletePanel: UIKitMLAsset | null = null;
	private gameOverPanel: UIKitMLAsset | null = null;

	// System refs
	private env!: EnvironmentSystem;
	private audio!: AudioSystem;

	// Timers
	private orderSpawnTimer = 0;
	private orderSpawnInterval = 8;
	private tickTimer = 0;
	private brewTimer = 0;
	private lastTimerWarn = 0;

	init() {
		this.data = createInitialGameData();
		const world = this.world as World;

		this.env = world.getSystem(EnvironmentSystem)!;
		this.audio = world.getSystem(AudioSystem)!;

		// Resolve panels
		this.menuPanel = world.getSceneObject<UIKitMLAsset>('menu-panel') ?? null;
		this.hudPanel = world.getSceneObject<UIKitMLAsset>('hud-panel') ?? null;
		this.ordersPanel = world.getSceneObject<UIKitMLAsset>('orders-panel') ?? null;
		this.recipesPanel = world.getSceneObject<UIKitMLAsset>('recipes-panel') ?? null;
		this.cauldronPanel = world.getSceneObject<UIKitMLAsset>('cauldron-panel') ?? null;
		this.waveCompletePanel = world.getSceneObject<UIKitMLAsset>('wave-complete-panel') ?? null;
		this.gameOverPanel = world.getSceneObject<UIKitMLAsset>('game-over-panel') ?? null;

		this.wireMenuPanel();
		this.wireRecipesPanel();
		this.wireCauldronPanel();
		this.wireWaveCompletePanel();
		this.wireGameOverPanel();
		this.wireIngredientInteractions();

		this.showState('menu');
		this.updateMenuHighScore();
	}

	private wireMenuPanel() {
		if (!this.menuPanel) return;
		this.menuPanel.getElementById('btn-play')?.addEventListener('click', () => {
			this.audio.playClick();
			this.startGame();
		});
		this.menuPanel.getElementById('btn-recipes')?.addEventListener('click', () => {
			this.audio.playClick();
			this.showState('recipes');
		});
	}

	private wireRecipesPanel() {
		if (!this.recipesPanel) return;
		// Update recipe content
		RECIPES.forEach((recipe, i) => {
			if (i > 4) return; // only 5 slots in panel
			const nameEl = this.recipesPanel!.getElementById(`rname-${i}`);
			const ingrEl = this.recipesPanel!.getElementById(`ringr-${i}`);
			if (nameEl) nameEl.setProperties({ text: recipe.name });
			if (ingrEl) {
				const names = recipe.ingredients.map((id) => getIngredientById(id)?.name ?? id).join(' + ');
				ingrEl.setProperties({ text: names });
			}
		});
		this.recipesPanel.getElementById('btn-close')?.addEventListener('click', () => {
			this.audio.playClick();
			this.showState('menu');
		});
	}

	private wireCauldronPanel() {
		if (!this.cauldronPanel) return;
		this.cauldronPanel.getElementById('btn-brew')?.addEventListener('click', () => {
			this.audio.playClick();
			this.brewPotion();
		});
		this.cauldronPanel.getElementById('btn-clear')?.addEventListener('click', () => {
			this.audio.playClick();
			this.clearCauldron();
		});
	}

	private wireWaveCompletePanel() {
		if (!this.waveCompletePanel) return;
		this.waveCompletePanel.getElementById('btn-next')?.addEventListener('click', () => {
			this.audio.playClick();
			this.nextWave();
		});
	}

	private wireGameOverPanel() {
		if (!this.gameOverPanel) return;
		this.gameOverPanel.getElementById('btn-replay')?.addEventListener('click', () => {
			this.audio.playClick();
			this.startGame();
		});
		this.gameOverPanel.getElementById('btn-menu')?.addEventListener('click', () => {
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
		if (this.menuPanel) this.menuPanel.visible = state === 'menu';
		if (this.hudPanel) this.hudPanel.visible = state === 'playing';
		if (this.ordersPanel) this.ordersPanel.visible = state === 'playing';
		if (this.recipesPanel) this.recipesPanel.visible = state === 'recipes';
		if (this.cauldronPanel) this.cauldronPanel.visible = state === 'playing';
		if (this.waveCompletePanel) this.waveCompletePanel.visible = state === 'wave_complete';
		if (this.gameOverPanel) this.gameOverPanel.visible = state === 'game_over';
	}

	private updateMenuHighScore() {
		if (!this.menuPanel) return;
		this.menuPanel.getElementById('highscore')?.setProperties({
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
	}

	private completeBrew() {
		const recipe = findMatchingRecipe(this.data.cauldronIngredients);
		this.data.isBrewing = false;
		this.data.brewProgress = 0;

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

		if (!this.waveCompletePanel) return;
		this.waveCompletePanel.getElementById('wave-num')?.setProperties({ text: `Wave ${this.data.wave}` });
		this.waveCompletePanel.getElementById('potions-brewed')?.setProperties({ text: `${this.data.potionsBrewed}` });
		this.waveCompletePanel.getElementById('perfect-brews')?.setProperties({ text: `${this.data.perfectBrews}` });
		this.waveCompletePanel.getElementById('best-combo')?.setProperties({ text: `x${this.data.bestCombo}` });
		this.waveCompletePanel.getElementById('wave-score')?.setProperties({ text: `${this.data.waveScore}` });
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

		if (!this.gameOverPanel) return;
		this.gameOverPanel.getElementById('final-score')?.setProperties({ text: `${this.data.score}` });
		this.gameOverPanel.getElementById('waves-cleared')?.setProperties({ text: `${this.data.wave}` });
		this.gameOverPanel.getElementById('total-potions')?.setProperties({ text: `${this.data.totalPotionsBrewed}` });
		this.gameOverPanel.getElementById('high-score')?.setProperties({ text: `${this.data.highScore}` });
		this.gameOverPanel.getElementById('new-record')?.setProperties({
			text: this.data.score >= this.data.highScore ? '★ NEW RECORD! ★' : '',
		});
	}

	private updateHUD() {
		if (!this.hudPanel) return;
		this.hudPanel.getElementById('score')?.setProperties({ text: `${this.data.score}` });
		this.hudPanel.getElementById('wave')?.setProperties({ text: `${this.data.wave}` });
		this.hudPanel.getElementById('timer')?.setProperties({ text: `${Math.ceil(this.data.waveTimer)}` });
		this.hudPanel.getElementById('combo')?.setProperties({ text: `x${Math.max(1, this.data.combo)}` });
		this.hudPanel.getElementById('lives')?.setProperties({ text: `${this.data.lives}` });
	}

	private updateOrdersPanel() {
		if (!this.ordersPanel) return;

		for (let i = 0; i < 3; i++) {
			const order = this.data.orders[i];
			const orderEl = this.ordersPanel.getElementById(`order-${i}`);
			const nameEl = this.ordersPanel.getElementById(`name-${i}`);
			const timerEl = this.ordersPanel.getElementById(`timer-${i}`);

			if (order) {
				const recipe = getRecipeById(order.recipeId);
				if (orderEl) orderEl.setProperties({ display: 'flex' });
				if (nameEl) nameEl.setProperties({ text: recipe?.name ?? order.recipeId });
				if (timerEl) timerEl.setProperties({ text: `${Math.ceil(order.timeRemaining)}s` });
			} else {
				if (orderEl) orderEl.setProperties({ display: 'none' });
			}
		}

		const emptyMsg = this.ordersPanel.getElementById('empty-msg');
		if (emptyMsg) {
			emptyMsg.setProperties({ display: this.data.orders.length === 0 ? 'flex' : 'none' });
		}
	}

	private updateCauldronPanel() {
		if (!this.cauldronPanel) return;

		for (let i = 0; i < 3; i++) {
			const ingredientId = this.data.cauldronIngredients[i];
			const nameEl = this.cauldronPanel.getElementById(`sname-${i}`);

			if (ingredientId) {
				const ingredient = getIngredientById(ingredientId);
				if (nameEl) nameEl.setProperties({ text: ingredient?.name ?? 'Unknown' });
			} else {
				if (nameEl) nameEl.setProperties({ text: 'Empty' });
			}
		}

		const statusEl = this.cauldronPanel.getElementById('status');
		if (statusEl) {
			if (this.data.isBrewing) {
				statusEl.setProperties({ text: 'Brewing...' });
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
		if (this.hudPanel) {
			this.hudPanel.getElementById('timer')?.setProperties({ text: `${Math.ceil(Math.max(0, this.data.waveTimer))}` });
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
