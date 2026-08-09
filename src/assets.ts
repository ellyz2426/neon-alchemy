import { AssetType, defineAssets } from '@iwsdk/core';

const publicAssetUrl = (filePath: string): string =>
	`${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

export default defineAssets({
	'menu-panel': {
		url: publicAssetUrl('ui/menu.uikitml'),
		type: AssetType.UIKitML,
		name: 'Menu Panel',
	},
	'hud-panel': {
		url: publicAssetUrl('ui/hud.uikitml'),
		type: AssetType.UIKitML,
		name: 'HUD Panel',
	},
	'orders-panel': {
		url: publicAssetUrl('ui/orders.uikitml'),
		type: AssetType.UIKitML,
		name: 'Orders Panel',
	},
	'recipes-panel': {
		url: publicAssetUrl('ui/recipes.uikitml'),
		type: AssetType.UIKitML,
		name: 'Recipes Panel',
	},
	'cauldron-panel': {
		url: publicAssetUrl('ui/cauldron-status.uikitml'),
		type: AssetType.UIKitML,
		name: 'Cauldron Status Panel',
	},
	'wave-complete-panel': {
		url: publicAssetUrl('ui/wave-complete.uikitml'),
		type: AssetType.UIKitML,
		name: 'Wave Complete Panel',
	},
	'game-over-panel': {
		url: publicAssetUrl('ui/game-over.uikitml'),
		type: AssetType.UIKitML,
		name: 'Game Over Panel',
	},
});
