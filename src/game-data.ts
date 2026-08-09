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
];

export type GameState = 'menu' | 'playing' | 'wave_complete' | 'game_over' | 'recipes';

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
