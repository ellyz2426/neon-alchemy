import {
	createSystem,
	World,
	Raycaster,
	Vector3,
	Mesh,
	MeshStandardMaterial,
	SphereGeometry,
	CylinderGeometry,
	Vector2,
} from '@iwsdk/core';
import { EnvironmentSystem } from './environment-system.js';
import { GameSystem } from './game-system.js';

export class InputSystem extends createSystem({}) {
	private raycaster = new Raycaster();
	private ingredientMeshes: Map<string, Mesh> = new Map();
	private cauldronMesh: Mesh | null = null;
	private env!: EnvironmentSystem;
	private game!: GameSystem;
	private clickCooldown = 0;
	private pointerNdc = new Vector2(0, 0);
	private pointerDown = false;
	private wasPointerDown = false;

	init() {
		const world = this.world as World;
		this.env = world.getSystem(EnvironmentSystem)!;
		this.game = world.getSystem(GameSystem)!;

		this.buildInteractionTargets();

		// Listen for pointer events on the canvas for browser mode
		const canvas = world.renderer.domElement;
		canvas.addEventListener('pointerdown', (e: PointerEvent) => {
			this.pointerDown = true;
			const rect = canvas.getBoundingClientRect();
			this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
		});
		canvas.addEventListener('pointerup', () => {
			this.pointerDown = false;
		});
	}

	private buildInteractionTargets() {
		const world = this.world as World;
		const positions = this.env.getIngredientPositions();

		positions.forEach((pos, id) => {
			const hitTarget = new Mesh(
				new SphereGeometry(0.15, 8, 6),
				new MeshStandardMaterial({
					transparent: true,
					opacity: 0,
					depthWrite: false,
				})
			);
			hitTarget.position.set(pos.x, pos.y, pos.z);
			hitTarget.userData.ingredientId = id;
			world.scene.add(hitTarget);
			this.ingredientMeshes.set(id, hitTarget);
		});

		this.cauldronMesh = new Mesh(
			new CylinderGeometry(0.5, 0.4, 0.6, 12),
			new MeshStandardMaterial({
				transparent: true,
				opacity: 0,
				depthWrite: false,
			})
		);
		this.cauldronMesh.position.set(0, 0.55, -0.5);
		this.cauldronMesh.userData.isCauldron = true;
		world.scene.add(this.cauldronMesh);
	}

	update(delta: number, _time: number) {
		this.clickCooldown -= delta;

		// Detect click (rising edge)
		if (this.pointerDown && !this.wasPointerDown && this.clickCooldown <= 0) {
			this.clickCooldown = 0.3;
			this.performRaycast();
		}
		this.wasPointerDown = this.pointerDown;
	}

	private performRaycast() {
		const world = this.world as World;

		if (world.renderer.xr.isPresenting) return; // XR uses RayInteractable

		const camera = world.camera;
		if (!camera) return;

		this.raycaster.setFromCamera(this.pointerNdc, camera);

		const targets = [...this.ingredientMeshes.values()];
		if (this.cauldronMesh) targets.push(this.cauldronMesh);

		const intersects = this.raycaster.intersectObjects(targets);
		if (intersects.length > 0) {
			const hit = intersects[0].object;
			const ingredientId = hit.userData.ingredientId as string | undefined;
			if (ingredientId) {
				this.game.handleIngredientClick(ingredientId);
			}
		}
	}
}
