import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { EnvironmentSystem } from './environment-system.js';
import { AudioSystem } from './audio-system.js';
import { GameSystem } from './game-system.js';
import { InputSystem } from './input-system.js';

World.create(
	document.getElementById('scene-container') as HTMLDivElement,
	projectOptions,
).then((world) => {
	world.registerSystem(EnvironmentSystem);
	world.registerSystem(AudioSystem);
	world.registerSystem(GameSystem);
	world.registerSystem(InputSystem);
});
