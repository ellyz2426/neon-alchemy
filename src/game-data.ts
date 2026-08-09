// Game data types and constants

export interface Ingredient {
	id: string;
	name: string;
	color: number;
	glowColor: number;
}

export interface PotionRecipe {
	id: string;
	name: string;
	ingredients: string[]; // ingredient IDs (2-3)
	color: number;
	glowColor: number;
	points: number;
}

export interface Order {
	recipeId: string;
	timeLimit: number;
	timeRemaining: number;
	isUrgent: boolean;
	bonusMultiplier: number;
}

export const INGREDIENTS: Ingredient[] = [
	{ id: 'herb', name: 'Moon Herb', color: 0x44cc66, glowColor: 0x66ff88 },
	{ id: 'crystal', name: 'Aether Crystal', color: 0x6688ff, glowColor: 0x88aaff },
	{ id: 'mushroom', name: 'Glowcap', color: 0xcc8844, glowColor: 0xffaa66 },
	{ id: 'essence', name: 'Starlight Essence', color: 0xcccc44, glowColor: 0xffff66 },
	{ id: 'scale', name: 'Dragon Scale', color: 0xcc4444, glowColor: 0xff6666 },
	{ id: 'fang', name: 'Shadow Fang', color: 0x8844cc, glowColor: 0xaa66ff },
	{ id: 'feather', name: 'Phoenix Feather', color: 0xff6622, glowColor: 0xff8844 },
	{ id: 'pearl', name: 'Abyssal Pearl', color: 0x44cccc, glowColor: 0x66ffff },
	{ id: 'void', name: 'Void Shard', color: 0x331144, glowColor: 0x6622aa },
	{ id: 'frost', name: 'Frost Lily', color: 0xaaddff, glowColor: 0xcceeFF },
	{ id: 'sun', name: 'Sun Stone', color: 0xffaa22, glowColor: 0xffcc44 },
];

export const RECIPES: PotionRecipe[] = [
	{
		id: 'health',
		name: 'Health Potion',
		ingredients: ['herb', 'crystal'],
		color: 0xff4444,
		glowColor: 0xff6666,
		points: 100,
	},
	{
		id: 'mana',
		name: 'Mana Potion',
		ingredients: ['crystal', 'essence'],
		color: 0x4488ff,
		glowColor: 0x66aaff,
		points: 100,
	},
	{
		id: 'speed',
		name: 'Speed Potion',
		ingredients: ['herb', 'mushroom'],
		color: 0x44ff88,
		glowColor: 0x66ffaa,
		points: 120,
	},
	{
		id: 'shield',
		name: 'Shield Potion',
		ingredients: ['crystal', 'scale'],
		color: 0xffcc44,
		glowColor: 0xffdd66,
		points: 150,
	},
	{
		id: 'poison',
		name: 'Poison Vial',
		ingredients: ['mushroom', 'fang'],
		color: 0xcc44ff,
		glowColor: 0xdd66ff,
		points: 130,
	},
	{
		id: 'phoenix',
		name: 'Phoenix Elixir',
		ingredients: ['feather', 'herb', 'crystal'],
		color: 0xff8800,
		glowColor: 0xffaa44,
		points: 200,
	},
	{
		id: 'abyss',
		name: 'Abyssal Draught',
		ingredients: ['pearl', 'fang', 'essence'],
		color: 0x2266aa,
		glowColor: 0x4488cc,
		points: 220,
	},
	{
		id: 'invisibility',
		name: 'Invisibility Draught',
		ingredients: ['void', 'frost'],
		color: 0x8866bb,
		glowColor: 0xaa88dd,
		points: 180,
	},
	{
		id: 'thunderbolt',
		name: 'Thunderbolt Tonic',
		ingredients: ['sun', 'scale'],
		color: 0xffdd00,
		glowColor: 0xffee44,
		points: 170,
	},
	{
		id: 'wisdom',
		name: 'Elixir of Wisdom',
		ingredients: ['frost', 'crystal', 'essence'],
		color: 0x88ddff,
		glowColor: 0xaaeeFF,
		points: 240,
	},
	{
		id: 'voidwalker',
		name: 'Void Walker',
		ingredients: ['void', 'fang', 'pearl'],
		color: 0x220044,
		glowColor: 0x441177,
		points: 260,
	},
];

export type GameState = 'menu' | 'playing' | 'wave_complete' | 'game_over' | 'recipes';

export type PowerUpType = 'time_freeze' | 'double_points' | 'extra_life';

export interface PowerUp {
	type: PowerUpType;
	duration: number; // remaining seconds (0 for instant)
	label: string;
}

export const POWER_UP_DEFS: { type: PowerUpType; label: string; duration: number; weight: number }[] = [
	{ type: 'time_freeze', label: '⏸ TIME FREEZE', duration: 5, weight: 3 },
	{ type: 'double_points', label: '×2 DOUBLE PTS', duration: 8, weight: 3 },
	{ type: 'extra_life', label: '♥ EXTRA LIFE', duration: 0, weight: 2 },
];

export interface GameData {
	state: GameState;
	score: number;
	wave: number;
	lives: number;
	combo: number;
	bestCombo: number;
	waveTimer: number;
	waveTimeLimit: number;
	orders: Order[];
	cauldronIngredients: string[];
	potionsBrewed: number;
	perfectBrews: number;
	waveScore: number;
	totalPotionsBrewed: number;
	highScore: number;
	isBrewing: boolean;
	brewProgress: number;
	brewsByRecipe: Record<string, number>;
	activePowerUp: PowerUp | null;
	powerUpsUsed: number;
}

export function createInitialGameData(): GameData {
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('neon-alchemy-highscore') : null;
	return {
		state: 'menu',
		score: 0,
		wave: 1,
		lives: 3,
		combo: 0,
		bestCombo: 0,
		waveTimer: 60,
		waveTimeLimit: 60,
		orders: [],
		cauldronIngredients: [],
		potionsBrewed: 0,
		perfectBrews: 0,
		waveScore: 0,
		totalPotionsBrewed: 0,
		highScore: stored ? parseInt(stored, 10) : 0,
		isBrewing: false,
		brewProgress: 0,
		brewsByRecipe: {},
		activePowerUp: null,
		powerUpsUsed: 0,
	};
}

export function findMatchingRecipe(ingredients: string[]): PotionRecipe | null {
	const sorted = [...ingredients].sort();
	for (const recipe of RECIPES) {
		const recipeSorted = [...recipe.ingredients].sort();
		if (recipeSorted.length === sorted.length && recipeSorted.every((v, i) => v === sorted[i])) {
			return recipe;
		}
	}
	return null;
}

export function getIngredientById(id: string): Ingredient | undefined {
	return INGREDIENTS.find((i) => i.id === id);
}

export function getRecipeById(id: string): PotionRecipe | undefined {
	return RECIPES.find((r) => r.id === id);
}

/**
 * Given current cauldron ingredients, find recipes that could still be completed.
 * Returns recipe names that the current ingredients are a subset of.
 */
export function findPartialRecipeHints(currentIngredients: string[]): string[] {
	if (currentIngredients.length === 0) return [];
	const sorted = [...currentIngredients].sort();

	const hints: string[] = [];
	for (const recipe of RECIPES) {
		const recipeSorted = [...recipe.ingredients].sort();
		// Check if currentIngredients is a subset of recipe ingredients
		let isSubset = true;
		const remaining = [...recipeSorted];
		for (const ing of sorted) {
			const idx = remaining.indexOf(ing);
			if (idx === -1) {
				isSubset = false;
				break;
			}
			remaining.splice(idx, 1);
		}
		if (isSubset) {
			hints.push(recipe.name);
		}
	}
	return hints;
}
