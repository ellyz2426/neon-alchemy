import {
	createSystem,
	World,
	Object3D,
	Mesh,
	MeshStandardMaterial,
	BoxGeometry,
	CylinderGeometry,
	SphereGeometry,
	PointLight,
	Color,
	MathUtils,
	Group,
	RingGeometry,
	TorusGeometry,
	ConeGeometry,
	PlaneGeometry,
	DoubleSide,
	Vector3,
} from '@iwsdk/core';
import { INGREDIENTS, type Ingredient } from './game-data.js';

interface PotionBottle {
	group: Group;
	life: number;
	maxLife: number;
	startY: number;
}

interface ScorePopup {
	mesh: Mesh;
	life: number;
	maxLife: number;
	startY: number;
	startX: number;
	startZ: number;
}

interface FlameEntry {
	mesh: Mesh;
	baseScaleY: number;
	baseY: number;
	phase: number;
}

interface FlyingIngredient {
	mesh: Mesh;
	startPos: Vector3;
	endPos: Vector3;
	progress: number;
	duration: number;
	color: number;
}

interface BrewBurst {
	mesh: Mesh;
	velocity: Vector3;
	life: number;
	maxLife: number;
}

export class EnvironmentSystem extends createSystem({}) {
	private cauldronGroup!: Group;
	private cauldronLiquid!: Mesh;
	private cauldronLight!: PointLight;
	private bubbleParticles: Mesh[] = [];
	private steamParticles: Mesh[] = [];
	private ingredientShelves: Map<string, { mesh: Mesh; light: PointLight; label: Object3D }> = new Map();
	private candles: { mesh: Mesh; light: PointLight; flicker: number }[] = [];
	private ambientParticles: Mesh[] = [];
	private liquidColor = new Color(0x8844cc);
	private targetLiquidColor = new Color(0x8844cc);
	private elapsedTime = 0;

	// Brewing effect
	private brewGlowRing: Mesh | null = null;
	private brewParticles: Mesh[] = [];
	private isBrewing = false;

	// Hover state
	private hoveredIngredient: string | null = null;

	// Rune symbols on floor
	private runeSymbols: Mesh[] = [];
	private isPlaying = false;

	// Fire under cauldron
	private flames: FlameEntry[] = [];

	// Potion bottle visualization
	private potionBottles: PotionBottle[] = [];

	// Score popup meshes
	private scorePopups: ScorePopup[] = [];

	// Wall torches
	private wallTorches: { flames: FlameEntry[]; light: PointLight }[] = [];

	// Crystal formations
	private crystals: Mesh[] = [];

	// Flying ingredient animation
	private flyingIngredients: FlyingIngredient[] = [];

	// Brew burst particles
	private brewBursts: BrewBurst[] = [];

	// Mystical arch glow
	private archGlowMeshes: Mesh[] = [];

	init() {
		this.buildWorkshop();
		this.buildCauldron();
		this.buildIngredientShelves();
		this.buildCandles();
		this.buildAmbientParticles();
		this.buildBrewingEffects();
		this.buildWallTorches();
		this.buildCrystalFormations();
		this.buildMysticalArch();
		this.buildCobwebs();
	}

	private buildWorkshop() {
		const world = this.world as World;

		// Floor - dark stone
		const floor = new Mesh(
			new PlaneGeometry(8, 8),
			new MeshStandardMaterial({ color: 0x1a1520, roughness: 0.9 })
		);
		floor.rotation.x = -Math.PI / 2;
		floor.position.set(0, 0, 0);
		floor.receiveShadow = true;
		world.scene.add(floor);

		// Stone tile pattern on floor
		for (let x = -3; x <= 3; x++) {
			const lineX = new Mesh(
				new BoxGeometry(0.01, 0.002, 8),
				new MeshStandardMaterial({ color: 0x251d30, roughness: 1 })
			);
			lineX.position.set(x, 0.001, 0);
			world.scene.add(lineX);
		}
		for (let z = -3; z <= 3; z++) {
			const lineZ = new Mesh(
				new BoxGeometry(8, 0.002, 0.01),
				new MeshStandardMaterial({ color: 0x251d30, roughness: 1 })
			);
			lineZ.position.set(0, 0.001, z);
			world.scene.add(lineZ);
		}

		// Floor detail - magic circle
		const circle = new Mesh(
			new RingGeometry(1.2, 1.4, 32),
			new MeshStandardMaterial({ color: 0x6633aa, emissive: 0x331166, emissiveIntensity: 0.3, side: DoubleSide })
		);
		circle.rotation.x = -Math.PI / 2;
		circle.position.set(0, 0.01, -0.5);
		world.scene.add(circle);

		const innerCircle = new Mesh(
			new RingGeometry(0.8, 0.85, 32),
			new MeshStandardMaterial({ color: 0x8855cc, emissive: 0x442288, emissiveIntensity: 0.4, side: DoubleSide })
		);
		innerCircle.rotation.x = -Math.PI / 2;
		innerCircle.position.set(0, 0.015, -0.5);
		world.scene.add(innerCircle);

		// Rune symbols on magic circle
		for (let i = 0; i < 8; i++) {
			const angle = (i / 8) * Math.PI * 2;
			const radius = 1.05;
			const rx = Math.cos(angle) * radius;
			const rz = -0.5 + Math.sin(angle) * radius;

			const runeGroup = new Group();

			const runeMesh = new Mesh(
				new BoxGeometry(0.06, 0.005, 0.06),
				new MeshStandardMaterial({
					color: 0xbb77ff,
					emissive: 0x8844cc,
					emissiveIntensity: 0.2,
					transparent: true,
					opacity: 0.5,
					side: DoubleSide,
				})
			);
			runeMesh.rotation.y = angle + Math.PI / 4;
			runeGroup.add(runeMesh);

			const crossA = new Mesh(
				new BoxGeometry(0.04, 0.003, 0.006),
				new MeshStandardMaterial({
					color: 0xddaaff, emissive: 0xaa66ff, emissiveIntensity: 0.3, transparent: true, opacity: 0.6,
				})
			);
			crossA.position.y = 0.004;
			runeGroup.add(crossA);

			const crossB = new Mesh(
				new BoxGeometry(0.006, 0.003, 0.04),
				new MeshStandardMaterial({
					color: 0xddaaff, emissive: 0xaa66ff, emissiveIntensity: 0.3, transparent: true, opacity: 0.6,
				})
			);
			crossB.position.y = 0.004;
			runeGroup.add(crossB);

			runeGroup.position.set(rx, 0.012, rz);
			world.scene.add(runeGroup);
			this.runeSymbols.push(runeMesh);
		}

		// Walls
		const wallMat = new MeshStandardMaterial({ color: 0x2a2030, roughness: 0.85 });

		const backWall = new Mesh(new BoxGeometry(8, 3.5, 0.15), wallMat);
		backWall.position.set(0, 1.75, -3.5);
		world.scene.add(backWall);

		const leftWall = new Mesh(new BoxGeometry(0.15, 3.5, 8), wallMat);
		leftWall.position.set(-4, 1.75, 0);
		world.scene.add(leftWall);

		const rightWall = new Mesh(new BoxGeometry(0.15, 3.5, 8), wallMat);
		rightWall.position.set(4, 1.75, 0);
		world.scene.add(rightWall);

		// Wall baseboards
		const baseMat = new MeshStandardMaterial({ color: 0x1a1020, roughness: 0.9 });
		for (const [p, s] of [
			[[0, 0.06, -3.42], [8, 0.12, 0.02]],
			[[-3.92, 0.06, 0], [0.02, 0.12, 8]],
			[[3.92, 0.06, 0], [0.02, 0.12, 8]],
		] as [number[], number[]][]) {
			const base = new Mesh(new BoxGeometry(s[0], s[1], s[2]), baseMat);
			base.position.set(p[0], p[1], p[2]);
			world.scene.add(base);
		}

		// Ceiling
		const ceiling = new Mesh(new BoxGeometry(8, 0.1, 8), new MeshStandardMaterial({ color: 0x1a1520 }));
		ceiling.position.set(0, 3.5, 0);
		world.scene.add(ceiling);

		// Ceiling beams
		for (let i = -3; i <= 3; i += 2) {
			const beam = new Mesh(
				new BoxGeometry(8, 0.12, 0.12),
				new MeshStandardMaterial({ color: 0x3a2820, roughness: 0.9 })
			);
			beam.position.set(0, 3.4, i);
			world.scene.add(beam);
		}

		// Ambient purple light
		const ambLight = new PointLight(0x6633aa, 2, 12);
		ambLight.position.set(0, 3.2, 0);
		world.scene.add(ambLight);

		// Workbench
		const benchTop = new Mesh(
			new BoxGeometry(3, 0.08, 0.8),
			new MeshStandardMaterial({ color: 0x3a2820, roughness: 0.8 })
		);
		benchTop.position.set(0, 0.85, -2.8);
		world.scene.add(benchTop);

		for (const x of [-1.4, 0, 1.4]) {
			const leg = new Mesh(
				new BoxGeometry(x === 0 ? 0.06 : 0.08, 0.85, x === 0 ? 0.06 : 0.08),
				new MeshStandardMaterial({ color: 0x2a1c14 })
			);
			leg.position.set(x, 0.425, -2.8);
			world.scene.add(leg);
		}

		// Spell books
		for (let i = 0; i < 4; i++) {
			const book = new Mesh(
				new BoxGeometry(0.15 + Math.random() * 0.05, 0.04 + Math.random() * 0.04, 0.2 + Math.random() * 0.04),
				new MeshStandardMaterial({ color: new Color().setHSL(Math.random() * 0.3 + 0.6, 0.5, 0.2) })
			);
			book.position.set(-1.0 + i * 0.5, 0.92 + i * 0.012, -2.8);
			book.rotation.y = (Math.random() - 0.5) * 0.3;
			world.scene.add(book);
		}

		// Hanging herb bundles
		for (let i = 0; i < 5; i++) {
			const bundle = new Group();
			const stem = new Mesh(
				new CylinderGeometry(0.01, 0.015, 0.3, 6),
				new MeshStandardMaterial({ color: 0x446622 })
			);
			const leaves = new Mesh(
				new SphereGeometry(0.06, 6, 4),
				new MeshStandardMaterial({
					color: new Color().setHSL(0.25 + Math.random() * 0.1, 0.6, 0.25),
					emissive: new Color().setHSL(0.25 + Math.random() * 0.1, 0.3, 0.05),
				})
			);
			leaves.position.y = -0.15;
			leaves.scale.set(1, 1.5, 1);
			bundle.add(stem);
			bundle.add(leaves);
			bundle.position.set(-2 + i * 1, 3.3, -3.3);
			world.scene.add(bundle);
		}

		// Shelves with bottles and jars
		const shelfBoard = new Mesh(new BoxGeometry(3, 0.05, 0.2), new MeshStandardMaterial({ color: 0x3a2820 }));
		shelfBoard.position.set(0, 2.2, -3.3);
		world.scene.add(shelfBoard);

		for (const bx of [-1.3, 0, 1.3]) {
			const bracket = new Mesh(new BoxGeometry(0.04, 0.15, 0.1), new MeshStandardMaterial({ color: 0x2a1c14 }));
			bracket.position.set(bx, 2.12, -3.35);
			world.scene.add(bracket);
		}

		for (let i = 0; i < 6; i++) {
			const bottleColor = new Color().setHSL(Math.random(), 0.7, 0.4);
			const bottle = new Mesh(
				new CylinderGeometry(0.025, 0.03, 0.12, 8),
				new MeshStandardMaterial({ color: bottleColor, emissive: bottleColor, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 })
			);
			const cork = new Mesh(new CylinderGeometry(0.02, 0.02, 0.025, 6), new MeshStandardMaterial({ color: 0x8a6040 }));
			cork.position.y = 0.07;
			bottle.add(cork);
			bottle.position.set(-1.2 + i * 0.5, 2.28, -3.3);
			world.scene.add(bottle);
		}

		// Second shelf higher
		const shelfBoard2 = new Mesh(new BoxGeometry(2, 0.04, 0.18), new MeshStandardMaterial({ color: 0x3a2820 }));
		shelfBoard2.position.set(0, 2.7, -3.32);
		world.scene.add(shelfBoard2);

		for (let i = 0; i < 4; i++) {
			const jarColor = new Color().setHSL(Math.random() * 0.4 + 0.5, 0.5, 0.3);
			const jar = new Mesh(
				new CylinderGeometry(0.035, 0.035, 0.09, 8),
				new MeshStandardMaterial({ color: jarColor, emissive: jarColor, emissiveIntensity: 0.15, transparent: true, opacity: 0.6 })
			);
			const lid = new Mesh(new CylinderGeometry(0.038, 0.038, 0.015, 8), new MeshStandardMaterial({ color: 0x554433 }));
			lid.position.y = 0.05;
			jar.add(lid);
			jar.position.set(-0.7 + i * 0.47, 2.77, -3.3);
			world.scene.add(jar);
		}

		// Floor rug near cauldron
		const rug = new Mesh(
			new PlaneGeometry(2.4, 1.8),
			new MeshStandardMaterial({ color: 0x2a1535, roughness: 0.95, side: DoubleSide })
		);
		rug.rotation.x = -Math.PI / 2;
		rug.position.set(0, 0.005, -0.3);
		world.scene.add(rug);

		const rugBorder = new Mesh(
			new RingGeometry(1.0, 1.05, 4),
			new MeshStandardMaterial({ color: 0x553388, emissive: 0x331155, emissiveIntensity: 0.2, side: DoubleSide })
		);
		rugBorder.rotation.x = -Math.PI / 2;
		rugBorder.rotation.z = Math.PI / 4;
		rugBorder.position.set(0, 0.006, -0.3);
		world.scene.add(rugBorder);
	}

	private buildWallTorches() {
		const world = this.world as World;

		const torchPositions: [number, number, number, number][] = [
			[-3.85, 2.0, -2.0, Math.PI / 2],
			[-3.85, 2.0, 0.5, Math.PI / 2],
			[3.85, 2.0, -2.0, -Math.PI / 2],
			[3.85, 2.0, 0.5, -Math.PI / 2],
			[-1.5, 2.3, -3.38, 0],
			[1.5, 2.3, -3.38, 0],
		];

		for (const [x, y, z, rotY] of torchPositions) {
			const torchGroup = new Group();

			const bracket = new Mesh(
				new BoxGeometry(0.06, 0.12, 0.08),
				new MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.7, roughness: 0.4 })
			);
			torchGroup.add(bracket);

			const arm = new Mesh(
				new CylinderGeometry(0.015, 0.02, 0.2, 6),
				new MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.6 })
			);
			arm.rotation.z = Math.PI / 4;
			arm.position.set(0, 0.1, 0.06);
			torchGroup.add(arm);

			const cup = new Mesh(
				new CylinderGeometry(0.04, 0.03, 0.06, 8, 1, true),
				new MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.7, side: DoubleSide })
			);
			cup.position.set(0.07, 0.17, 0.06);
			torchGroup.add(cup);

			const torchFlames: FlameEntry[] = [];
			for (let f = 0; f < 3; f++) {
				const baseScaleY = 0.7 + Math.random() * 0.4;
				const flameMesh = new Mesh(
					new ConeGeometry(0.02 + Math.random() * 0.01, 0.08 + Math.random() * 0.05, 4),
					new MeshStandardMaterial({
						color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 1.2, transparent: true, opacity: 0.75,
					})
				);
				flameMesh.position.set(0.07 + (Math.random() - 0.5) * 0.02, 0.23 + Math.random() * 0.02, 0.06 + (Math.random() - 0.5) * 0.02);
				torchGroup.add(flameMesh);
				torchFlames.push({ mesh: flameMesh, baseScaleY, baseY: flameMesh.position.y, phase: Math.random() * Math.PI * 2 });
			}

			const torchLight = new PointLight(0xff7722, 1.5, 4);
			torchLight.position.set(0.07, 0.3, 0.06);
			torchGroup.add(torchLight);

			torchGroup.position.set(x, y, z);
			torchGroup.rotation.y = rotY;
			world.scene.add(torchGroup);

			this.wallTorches.push({ flames: torchFlames, light: torchLight });
		}
	}

	private buildCrystalFormations() {
		const world = this.world as World;

		const crystalPositions: [number, number, number][] = [
			[-2, 3.25, -1], [2.5, 3.25, 1], [-1, 3.25, -3], [1.5, 3.25, 3], [3, 3.25, -3],
		];

		for (const [cx, cy, cz] of crystalPositions) {
			const cluster = new Group();
			const count = 3 + Math.floor(Math.random() * 3);
			for (let i = 0; i < count; i++) {
				const height = 0.08 + Math.random() * 0.15;
				const cRadius = 0.01 + Math.random() * 0.015;
				const hue = 0.7 + Math.random() * 0.15;
				const crystalColor = new Color().setHSL(hue, 0.6, 0.5);

				const crystal = new Mesh(
					new ConeGeometry(cRadius, height, 5),
					new MeshStandardMaterial({
						color: crystalColor, emissive: crystalColor, emissiveIntensity: 0.5,
						transparent: true, opacity: 0.65, metalness: 0.3, roughness: 0.2,
					})
				);
				crystal.rotation.x = Math.PI;
				crystal.rotation.z = (Math.random() - 0.5) * 0.5;
				crystal.position.set((Math.random() - 0.5) * 0.12, -(Math.random() * 0.05), (Math.random() - 0.5) * 0.12);
				cluster.add(crystal);
				this.crystals.push(crystal);
			}

			const clusterLight = new PointLight(0x8866cc, 0.3, 1.5);
			clusterLight.position.y = -0.15;
			cluster.add(clusterLight);
			cluster.position.set(cx, cy, cz);
			world.scene.add(cluster);
		}
	}

	private buildMysticalArch() {
		const world = this.world as World;

		const archMat = new MeshStandardMaterial({
			color: 0x443366, emissive: 0x332255, emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.4,
		});

		const leftCol = new Mesh(new BoxGeometry(0.1, 1.2, 0.1), archMat);
		leftCol.position.set(-0.5, 1.8, -3.38);
		world.scene.add(leftCol);

		const rightCol = new Mesh(new BoxGeometry(0.1, 1.2, 0.1), archMat);
		rightCol.position.set(0.5, 1.8, -3.38);
		world.scene.add(rightCol);

		const archTop = new Mesh(
			new TorusGeometry(0.5, 0.05, 8, 16, Math.PI),
			new MeshStandardMaterial({ color: 0x5544aa, emissive: 0x4433aa, emissiveIntensity: 0.4, metalness: 0.6 })
		);
		archTop.position.set(0, 2.4, -3.36);
		world.scene.add(archTop);

		const portalDisc = new Mesh(
			new CylinderGeometry(0.42, 0.42, 0.01, 24),
			new MeshStandardMaterial({
				color: 0x6633cc, emissive: 0x5522bb, emissiveIntensity: 0.8, transparent: true, opacity: 0.25,
			})
		);
		portalDisc.rotation.x = Math.PI / 2;
		portalDisc.position.set(0, 1.85, -3.4);
		world.scene.add(portalDisc);
		this.archGlowMeshes.push(portalDisc);

		const innerRing = new Mesh(
			new RingGeometry(0.35, 0.42, 24),
			new MeshStandardMaterial({
				color: 0x9966ff, emissive: 0x7744ee, emissiveIntensity: 0.6, transparent: true, opacity: 0.3, side: DoubleSide,
			})
		);
		innerRing.position.set(0, 1.85, -3.39);
		world.scene.add(innerRing);
		this.archGlowMeshes.push(innerRing);

		for (const colX of [-0.5, 0.5]) {
			for (let j = 0; j < 3; j++) {
				const rune = new Mesh(
					new BoxGeometry(0.04, 0.04, 0.005),
					new MeshStandardMaterial({ color: 0xaa77ff, emissive: 0x8855dd, emissiveIntensity: 0.4, transparent: true, opacity: 0.6 })
				);
				rune.rotation.z = Math.PI / 4;
				rune.position.set(colX, 1.4 + j * 0.3, -3.32);
				world.scene.add(rune);
				this.archGlowMeshes.push(rune);
			}
		}

		const portalLight = new PointLight(0x6633cc, 0.8, 3);
		portalLight.position.set(0, 1.85, -3.2);
		world.scene.add(portalLight);
	}

	private buildCobwebs() {
		const world = this.world as World;
		const webMat = new MeshStandardMaterial({ color: 0x887788, transparent: true, opacity: 0.12, side: DoubleSide });

		const corners: [number, number, number, number, number][] = [
			[-3.8, 3.3, -3.3, -Math.PI / 4, 0],
			[3.8, 3.3, -3.3, Math.PI / 4, 0],
			[-3.8, 3.3, 3.3, Math.PI / 4, Math.PI],
			[3.8, 3.3, 3.3, -Math.PI / 4, Math.PI],
		];

		for (const [x, y, z, ry, rz] of corners) {
			const web = new Mesh(new PlaneGeometry(0.5, 0.5), webMat);
			web.position.set(x, y, z);
			web.rotation.y = ry;
			web.rotation.z = rz;
			web.rotation.x = Math.PI / 6;
			world.scene.add(web);
		}
	}

	private buildCauldron() {
		const world = this.world as World;
		this.cauldronGroup = new Group();
		this.cauldronGroup.position.set(0, 0, -0.5);

		const body = new Mesh(
			new CylinderGeometry(0.45, 0.35, 0.5, 16, 1, true),
			new MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.6, metalness: 0.7, side: DoubleSide })
		);
		body.position.y = 0.55;
		this.cauldronGroup.add(body);

		const bottom = new Mesh(
			new CylinderGeometry(0.35, 0.35, 0.03, 16),
			new MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.6, metalness: 0.7 })
		);
		bottom.position.y = 0.31;
		this.cauldronGroup.add(bottom);

		const rim = new Mesh(
			new TorusGeometry(0.45, 0.025, 8, 24),
			new MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.8, roughness: 0.4 })
		);
		rim.rotation.x = Math.PI / 2;
		rim.position.y = 0.8;
		this.cauldronGroup.add(rim);

		const runeRing = new Mesh(
			new TorusGeometry(0.46, 0.01, 6, 32),
			new MeshStandardMaterial({ color: 0x8844cc, emissive: 0x6622aa, emissiveIntensity: 0.5 })
		);
		runeRing.rotation.x = Math.PI / 2;
		runeRing.position.y = 0.78;
		this.cauldronGroup.add(runeRing);

		// Cauldron handle
		const handle = new Mesh(
			new TorusGeometry(0.35, 0.015, 6, 16, Math.PI),
			new MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.7, roughness: 0.5 })
		);
		handle.position.y = 0.9;
		handle.rotation.z = Math.PI;
		this.cauldronGroup.add(handle);

		this.cauldronLiquid = new Mesh(
			new CylinderGeometry(0.42, 0.42, 0.02, 16),
			new MeshStandardMaterial({
				color: 0x8844cc, emissive: 0x6622aa, emissiveIntensity: 0.6, transparent: true, opacity: 0.85,
			})
		);
		this.cauldronLiquid.position.y = 0.72;
		this.cauldronGroup.add(this.cauldronLiquid);

		for (let i = 0; i < 3; i++) {
			const angle = (i / 3) * Math.PI * 2;
			const leg = new Mesh(
				new CylinderGeometry(0.03, 0.04, 0.3, 6),
				new MeshStandardMaterial({ color: 0x1a1a2a, metalness: 0.7 })
			);
			leg.position.set(Math.cos(angle) * 0.3, 0.15, Math.sin(angle) * 0.3);
			this.cauldronGroup.add(leg);
		}

		// Fire under cauldron
		for (let i = 0; i < 5; i++) {
			const baseScaleY = 0.8 + Math.random() * 0.4;
			const flame = new Mesh(
				new ConeGeometry(0.04 + Math.random() * 0.03, 0.15 + Math.random() * 0.1, 4),
				new MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 1, transparent: true, opacity: 0.7 })
			);
			const baseY = 0.1;
			flame.position.set((Math.random() - 0.5) * 0.3, baseY, (Math.random() - 0.5) * 0.3);
			this.cauldronGroup.add(flame);
			this.flames.push({ mesh: flame, baseScaleY, baseY, phase: Math.random() * Math.PI * 2 });
		}

		// Embers floating near fire
		for (let i = 0; i < 6; i++) {
			const ember = new Mesh(
				new SphereGeometry(0.005, 4, 4),
				new MeshStandardMaterial({ color: 0xff8844, emissive: 0xff6622, emissiveIntensity: 2, transparent: true, opacity: 0.6 })
			);
			ember.position.set((Math.random() - 0.5) * 0.3, 0.2 + Math.random() * 0.2, (Math.random() - 0.5) * 0.3);
			ember.userData.phase = Math.random() * Math.PI * 2;
			ember.userData.speed = 0.3 + Math.random() * 0.4;
			ember.userData.baseY = ember.position.y;
			this.cauldronGroup.add(ember);
			this.ambientParticles.push(ember);
		}

		this.cauldronLight = new PointLight(0x8844cc, 3, 5);
		this.cauldronLight.position.set(0, 1.0, 0);
		this.cauldronGroup.add(this.cauldronLight);

		world.scene.add(this.cauldronGroup);

		// Bubbles
		for (let i = 0; i < 12; i++) {
			const bubble = new Mesh(
				new SphereGeometry(0.015 + Math.random() * 0.01, 6, 4),
				new MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 })
			);
			bubble.position.set((Math.random() - 0.5) * 0.5, 0.72 + Math.random() * 0.2, -0.5 + (Math.random() - 0.5) * 0.5);
			bubble.userData.velocity = 0.3 + Math.random() * 0.5;
			bubble.userData.phase = Math.random() * Math.PI * 2;
			bubble.visible = false;
			world.scene.add(bubble);
			this.bubbleParticles.push(bubble);
		}

		// Steam
		for (let i = 0; i < 8; i++) {
			const steam = new Mesh(
				new SphereGeometry(0.04, 4, 4),
				new MeshStandardMaterial({ color: 0xccbbdd, transparent: true, opacity: 0.15 })
			);
			steam.position.set((Math.random() - 0.5) * 0.3, 1.0 + Math.random() * 0.5, -0.5 + (Math.random() - 0.5) * 0.3);
			steam.userData.phase = Math.random() * Math.PI * 2;
			steam.visible = false;
			world.scene.add(steam);
			this.steamParticles.push(steam);
		}
	}

	private buildIngredientShelves() {
		const world = this.world as World;

		const positions: [number, number, number, number][] = [
			[-2.5, 1.2, -2.0, 0.4], [-2.5, 1.2, -1.0, 0.3], [-2.5, 1.2, 0.0, 0.2], [-2.5, 1.2, 1.0, 0.1],
			[2.5, 1.2, -2.0, -0.4], [2.5, 1.2, -1.0, -0.3], [2.5, 1.2, 0.0, -0.2], [2.5, 1.2, 1.0, -0.1],
		];

		INGREDIENTS.forEach((ingredient, i) => {
			const [x, y, z, rotY] = positions[i];

			const bracket = new Mesh(
				new BoxGeometry(0.4, 0.04, 0.25),
				new MeshStandardMaterial({ color: 0x3a2820, roughness: 0.85 })
			);
			bracket.position.set(x, y, z);
			bracket.rotation.y = rotY;
			world.scene.add(bracket);

			const support = new Mesh(
				new BoxGeometry(0.04, 0.1, 0.15),
				new MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.9 })
			);
			support.position.set(x, y - 0.07, z);
			support.rotation.y = rotY;
			world.scene.add(support);

			let geo;
			switch (ingredient.id) {
				case 'herb': geo = new SphereGeometry(0.06, 6, 4); break;
				case 'crystal': geo = new ConeGeometry(0.04, 0.12, 5); break;
				case 'mushroom': geo = new SphereGeometry(0.06, 8, 4); break;
				case 'essence': geo = new SphereGeometry(0.045, 12, 8); break;
				case 'scale': geo = new BoxGeometry(0.09, 0.02, 0.09); break;
				case 'fang': geo = new ConeGeometry(0.025, 0.12, 4); break;
				case 'feather': geo = new CylinderGeometry(0.01, 0.04, 0.12, 6); break;
				case 'pearl': geo = new SphereGeometry(0.04, 16, 12); break;
				default: geo = new SphereGeometry(0.06, 8, 6);
			}

			const mat = new MeshStandardMaterial({
				color: ingredient.color, emissive: ingredient.glowColor, emissiveIntensity: 0.6, transparent: true, opacity: 0.85,
			});

			const mesh = new Mesh(geo, mat);
			mesh.position.set(x, y + 0.08, z);
			mesh.rotation.y = rotY;
			world.scene.add(mesh);

			const light = new PointLight(ingredient.glowColor, 0.5, 1.5);
			light.position.set(x, y + 0.12, z);
			world.scene.add(light);

			const labelGroup = new Group();
			const labelBar = new Mesh(
				new BoxGeometry(0.35, 0.035, 0.005),
				new MeshStandardMaterial({ color: ingredient.color, emissive: ingredient.glowColor, emissiveIntensity: 0.4, transparent: true, opacity: 0.7 })
			);
			labelGroup.add(labelBar);

			for (const dx of [-0.19, 0.19]) {
				const dot = new Mesh(
					new SphereGeometry(0.008, 6, 4),
					new MeshStandardMaterial({ color: ingredient.glowColor, emissive: ingredient.glowColor, emissiveIntensity: 1 })
				);
				dot.position.set(dx, 0, 0);
				labelGroup.add(dot);
			}

			labelGroup.position.set(x, y + 0.22, z);
			labelGroup.rotation.y = rotY;
			world.scene.add(labelGroup);

			this.ingredientShelves.set(ingredient.id, { mesh, light, label: labelGroup });
		});
	}

	private buildCandles() {
		const world = this.world as World;
		const positions: [number, number, number][] = [
			[-1.5, 0.9, -2.8], [1.5, 0.9, -2.8], [-3.5, 1.8, -1.5],
			[3.5, 1.8, -1.5], [-3.5, 1.8, 0.5], [3.5, 1.8, 0.5],
		];

		positions.forEach(([x, y, z]) => {
			const holder = new Mesh(
				new CylinderGeometry(0.025, 0.035, 0.015, 8),
				new MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.6 })
			);
			holder.position.set(x, y - 0.075, z);
			world.scene.add(holder);

			const candle = new Mesh(new CylinderGeometry(0.02, 0.025, 0.15, 6), new MeshStandardMaterial({ color: 0xeedd99 }));
			candle.position.set(x, y, z);
			world.scene.add(candle);

			const drip = new Mesh(new SphereGeometry(0.008, 4, 4), new MeshStandardMaterial({ color: 0xddcc88 }));
			drip.position.set(x + 0.015, y - 0.03, z);
			drip.scale.set(1, 1.5, 1);
			world.scene.add(drip);

			const flame = new Mesh(
				new ConeGeometry(0.015, 0.04, 4),
				new MeshStandardMaterial({ color: 0xffaa22, emissive: 0xff8800, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 })
			);
			flame.position.set(x, y + 0.1, z);
			world.scene.add(flame);

			const light = new PointLight(0xff9944, 0.8, 3);
			light.position.set(x, y + 0.15, z);
			world.scene.add(light);

			this.candles.push({ mesh: flame, light, flicker: Math.random() * Math.PI * 2 });
		});
	}

	private buildAmbientParticles() {
		const world = this.world as World;
		for (let i = 0; i < 25; i++) {
			const isMagical = i < 8;
			const particle = new Mesh(
				new SphereGeometry(isMagical ? 0.01 : 0.006, 4, 4),
				new MeshStandardMaterial({
					color: isMagical ? 0xcc99ff : 0xaa88ff,
					emissive: isMagical ? 0xaa77ee : 0x8866cc,
					emissiveIntensity: isMagical ? 1.2 : 0.8,
					transparent: true,
					opacity: isMagical ? 0.4 : 0.25,
				})
			);
			particle.position.set((Math.random() - 0.5) * 6, 0.5 + Math.random() * 2.5, (Math.random() - 0.5) * 6);
			particle.userData.phase = Math.random() * Math.PI * 2;
			particle.userData.speed = 0.2 + Math.random() * 0.3;
			particle.userData.baseY = particle.position.y;
			world.scene.add(particle);
			this.ambientParticles.push(particle);
		}
	}

	setCauldronColor(color: number) {
		this.targetLiquidColor.set(color);
	}

	setBubblesActive(active: boolean) {
		this.bubbleParticles.forEach((b) => (b.visible = active));
		this.steamParticles.forEach((s) => (s.visible = active));
	}

	setPlaying(playing: boolean) {
		this.isPlaying = playing;
	}

	highlightIngredient(id: string, highlight: boolean) {
		const shelf = this.ingredientShelves.get(id);
		if (shelf) {
			shelf.light.intensity = highlight ? 2.0 : 0.5;
			const mat = shelf.mesh.material as MeshStandardMaterial;
			mat.emissiveIntensity = highlight ? 1.2 : 0.6;
			mat.opacity = highlight ? 1.0 : 0.85;
			if (shelf.label) {
				shelf.label.scale.set(highlight ? 1.3 : 1, highlight ? 1.3 : 1, highlight ? 1.3 : 1);
			}
		}
		this.hoveredIngredient = highlight ? id : null;
	}

	pulseIngredient(id: string) {
		const shelf = this.ingredientShelves.get(id);
		if (shelf) {
			shelf.mesh.scale.set(1.3, 1.3, 1.3);
			shelf.light.intensity = 3.0;
		}
	}

	/**
	 * Fly an ingredient orb from the shelf to the cauldron (visual feedback)
	 */
	flyIngredientToCauldron(ingredientId: string) {
		const world = this.world as World;
		const shelf = this.ingredientShelves.get(ingredientId);
		if (!shelf) return;

		const ingredient = INGREDIENTS.find((i) => i.id === ingredientId);
		if (!ingredient) return;

		const flyMesh = new Mesh(
			new SphereGeometry(0.03, 8, 6),
			new MeshStandardMaterial({
				color: ingredient.color, emissive: ingredient.glowColor, emissiveIntensity: 1.5, transparent: true, opacity: 0.9,
			})
		);

		const startPos = new Vector3(shelf.mesh.position.x, shelf.mesh.position.y, shelf.mesh.position.z);
		flyMesh.position.copy(startPos);
		world.scene.add(flyMesh);

		this.flyingIngredients.push({
			mesh: flyMesh,
			startPos: startPos.clone(),
			endPos: new Vector3(0, 0.85, -0.5),
			progress: 0,
			duration: 0.4,
			color: ingredient.color,
		});
	}

	/**
	 * Spawn brew success burst particles
	 */
	spawnBrewBurst(color: number) {
		const world = this.world as World;
		const burstColor = new Color(color);

		for (let i = 0; i < 20; i++) {
			const size = 0.008 + Math.random() * 0.012;
			const mesh = new Mesh(
				new SphereGeometry(size, 4, 4),
				new MeshStandardMaterial({ color: burstColor, emissive: burstColor, emissiveIntensity: 2.0, transparent: true, opacity: 1.0 })
			);
			mesh.position.set(0, 0.85, -0.5);
			world.scene.add(mesh);

			const angle = Math.random() * Math.PI * 2;
			const upward = 0.5 + Math.random() * 1.5;
			const outward = 0.5 + Math.random() * 1.0;
			const velocity = new Vector3(Math.cos(angle) * outward, upward, Math.sin(angle) * outward);

			this.brewBursts.push({ mesh, velocity, life: 0.8 + Math.random() * 0.4, maxLife: 0.8 + Math.random() * 0.4 });
		}
	}

	private buildBrewingEffects() {
		const world = this.world as World;

		this.brewGlowRing = new Mesh(
			new TorusGeometry(0.5, 0.03, 8, 32),
			new MeshStandardMaterial({ color: 0xaa66ff, emissive: 0xaa44ff, emissiveIntensity: 2, transparent: true, opacity: 0 })
		);
		this.brewGlowRing.rotation.x = Math.PI / 2;
		this.brewGlowRing.position.set(0, 0.85, -0.5);
		world.scene.add(this.brewGlowRing);

		for (let i = 0; i < 16; i++) {
			const angle = (i / 16) * Math.PI * 2;
			const sparkle = new Mesh(
				new SphereGeometry(0.012, 4, 4),
				new MeshStandardMaterial({ color: 0xffccff, emissive: 0xcc88ff, emissiveIntensity: 1.5, transparent: true, opacity: 0 })
			);
			sparkle.position.set(Math.cos(angle) * 0.45, 0.85, -0.5 + Math.sin(angle) * 0.45);
			sparkle.userData.baseAngle = angle;
			sparkle.userData.heightOffset = Math.random() * 0.3;
			world.scene.add(sparkle);
			this.brewParticles.push(sparkle);
		}
	}

	startBrewingEffect() { this.isBrewing = true; }
	stopBrewingEffect() { this.isBrewing = false; }

	spawnPotionBottle(color: number) {
		const world = this.world as World;
		const group = new Group();
		const potionColor = new Color(color);

		const body = new Mesh(
			new CylinderGeometry(0.025, 0.035, 0.1, 8),
			new MeshStandardMaterial({ color: potionColor, emissive: potionColor, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 })
		);
		group.add(body);

		const neck = new Mesh(
			new CylinderGeometry(0.012, 0.02, 0.04, 6),
			new MeshStandardMaterial({ color: potionColor, emissive: potionColor, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
		);
		neck.position.y = 0.07;
		group.add(neck);

		const cork = new Mesh(
			new CylinderGeometry(0.015, 0.013, 0.02, 6),
			new MeshStandardMaterial({ color: 0x8a6040, transparent: true, opacity: 0.9 })
		);
		cork.position.y = 0.095;
		group.add(cork);

		const glow = new Mesh(
			new SphereGeometry(0.015, 6, 4),
			new MeshStandardMaterial({ color: potionColor, emissive: potionColor, emissiveIntensity: 2, transparent: true, opacity: 0.6 })
		);
		glow.position.y = 0.02;
		group.add(glow);

		const offsetX = (Math.random() - 0.5) * 0.4;
		const startY = 0.9;
		group.position.set(offsetX, startY, -0.5 + (Math.random() - 0.5) * 0.2);
		world.scene.add(group);

		this.potionBottles.push({ group, life: 2.5, maxLife: 2.5, startY });
	}

	spawnScorePopup(points: number) {
		const world = this.world as World;
		const radius = 0.02 + Math.min(points / 2000, 0.03);
		const popup = new Mesh(
			new SphereGeometry(radius, 8, 6),
			new MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffcc00, emissiveIntensity: 2.5, transparent: true, opacity: 1.0 })
		);

		const startX = (Math.random() - 0.5) * 0.3;
		const startZ = -0.5 + (Math.random() - 0.5) * 0.2;
		const startY = 1.0;
		popup.position.set(startX, startY, startZ);
		world.scene.add(popup);

		this.scorePopups.push({ mesh: popup, life: 1.5, maxLife: 1.5, startY, startX, startZ });
	}

	getIngredientPositions(): Map<string, { x: number; y: number; z: number }> {
		const result = new Map<string, { x: number; y: number; z: number }>();
		this.ingredientShelves.forEach((data, id) => {
			result.set(id, { x: data.mesh.position.x, y: data.mesh.position.y, z: data.mesh.position.z });
		});
		return result;
	}

	update(delta: number, time: number) {
		this.elapsedTime += delta;

		// Liquid color lerp
		this.liquidColor.lerp(this.targetLiquidColor, delta * 3);
		const mat = this.cauldronLiquid.material as MeshStandardMaterial;
		mat.color.copy(this.liquidColor);
		mat.emissive.copy(this.liquidColor).multiplyScalar(0.5);
		this.cauldronLight.color.copy(this.liquidColor);

		// Liquid wobble
		this.cauldronLiquid.position.y = 0.72 + Math.sin(this.elapsedTime * 2) * 0.005;

		// Fire animation
		this.flames.forEach((f) => {
			f.phase += delta * (6 + Math.random() * 4);
			const flicker = Math.sin(f.phase) * 0.3 + Math.sin(f.phase * 2.7) * 0.15 + Math.sin(f.phase * 5.3) * 0.1;
			f.mesh.scale.y = f.baseScaleY + flicker * 0.5;
			f.mesh.scale.x = 1 + flicker * 0.15;
			f.mesh.scale.z = 1 + flicker * 0.15;
			f.mesh.position.y = f.baseY + flicker * 0.015;
			const fMat = f.mesh.material as MeshStandardMaterial;
			fMat.opacity = 0.55 + flicker * 0.25;
			fMat.emissiveIntensity = 0.8 + flicker * 0.6;
			const hue = 0.06 + flicker * 0.02;
			fMat.color.setHSL(hue, 1.0, 0.55);
			fMat.emissive.setHSL(hue - 0.01, 1.0, 0.45);
		});

		// Bubbles
		this.bubbleParticles.forEach((bubble) => {
			if (!bubble.visible) return;
			const phase = bubble.userData.phase as number;
			const vel = bubble.userData.velocity as number;
			bubble.position.y += vel * delta;
			bubble.position.x = Math.sin(this.elapsedTime * 2 + phase) * 0.15;
			const bMat = bubble.material as MeshStandardMaterial;
			bMat.opacity = Math.max(0, 0.6 - (bubble.position.y - 0.72) * 1.5);
			if (bubble.position.y > 1.2) {
				bubble.position.y = 0.72;
				bubble.position.x = (Math.random() - 0.5) * 0.5;
				bubble.position.z = -0.5 + (Math.random() - 0.5) * 0.5;
			}
		});

		// Steam
		this.steamParticles.forEach((steam) => {
			if (!steam.visible) return;
			const phase = steam.userData.phase as number;
			steam.position.y += 0.15 * delta;
			steam.position.x = Math.sin(this.elapsedTime + phase) * 0.15;
			const s = 1 + (steam.position.y - 1.0) * 0.5;
			steam.scale.set(s, s, s);
			const sMat = steam.material as MeshStandardMaterial;
			sMat.opacity = Math.max(0, 0.15 - (steam.position.y - 1.0) * 0.08);
			if (steam.position.y > 2.0) {
				steam.position.y = 0.9;
				steam.position.x = (Math.random() - 0.5) * 0.3;
				steam.position.z = -0.5 + (Math.random() - 0.5) * 0.3;
			}
		});

		// Candles
		this.candles.forEach((c) => {
			c.flicker += delta * (5 + Math.random() * 3);
			const intensity = 0.6 + Math.sin(c.flicker) * 0.2 + Math.sin(c.flicker * 3.7) * 0.1;
			c.light.intensity = intensity;
			c.mesh.scale.y = 0.8 + Math.sin(c.flicker * 2) * 0.3;
		});

		// Ambient particles
		this.ambientParticles.forEach((p) => {
			const phase = p.userData.phase as number;
			const speed = p.userData.speed as number;
			const baseY = p.userData.baseY as number;
			p.position.y = baseY + Math.sin(this.elapsedTime * speed + phase) * 0.3;
			p.position.x += Math.sin(this.elapsedTime * 0.1 + phase) * 0.001;
			const pMat = p.material as MeshStandardMaterial;
			pMat.opacity = 0.15 + Math.sin(this.elapsedTime * 0.5 + phase) * 0.15;
		});

		// Reset pulsed ingredients
		this.ingredientShelves.forEach((data) => {
			if (data.mesh.scale.x > 1.01) {
				data.mesh.scale.lerp({ x: 1, y: 1, z: 1 } as any, delta * 5);
				data.light.intensity = MathUtils.lerp(data.light.intensity, 0.5, delta * 5);
			}
		});

		// Label bob
		this.ingredientShelves.forEach((data) => {
			if (data.label) {
				data.label.position.y += Math.sin(this.elapsedTime * 1.5) * 0.0002;
			}
		});

		// Rune pulsing
		this.runeSymbols.forEach((rune, i) => {
			const runeMat = rune.material as MeshStandardMaterial;
			if (this.isPlaying) {
				const pulse = 0.4 + Math.sin(this.elapsedTime * 2 + i * 0.8) * 0.4;
				runeMat.emissiveIntensity = 0.3 + pulse * 0.8;
				runeMat.opacity = 0.4 + pulse * 0.4;
				rune.rotation.y += delta * 0.3;
			} else {
				runeMat.emissiveIntensity = MathUtils.lerp(runeMat.emissiveIntensity, 0.2, delta * 2);
				runeMat.opacity = MathUtils.lerp(runeMat.opacity, 0.3, delta * 2);
			}
		});

		// Brewing effect
		const brewTargetOpacity = this.isBrewing ? 0.8 : 0;
		if (this.brewGlowRing) {
			const bgMat = this.brewGlowRing.material as MeshStandardMaterial;
			bgMat.opacity = MathUtils.lerp(bgMat.opacity, brewTargetOpacity, delta * 5);
			if (this.isBrewing) {
				this.brewGlowRing.rotation.z += delta * 2;
				const pulse = 0.5 + Math.sin(this.elapsedTime * 4) * 0.5;
				bgMat.emissiveIntensity = 1.5 + pulse;
			}
		}

		this.brewParticles.forEach((sparkle) => {
			const spMat = sparkle.material as MeshStandardMaterial;
			const targetOp = this.isBrewing ? 0.7 : 0;
			spMat.opacity = MathUtils.lerp(spMat.opacity, targetOp, delta * 5);
			if (this.isBrewing) {
				const baseAngle = sparkle.userData.baseAngle as number;
				const heightOff = sparkle.userData.heightOffset as number;
				const angle = baseAngle + this.elapsedTime * 2;
				const radius = 0.45 + Math.sin(this.elapsedTime * 3 + baseAngle) * 0.08;
				sparkle.position.x = Math.cos(angle) * radius;
				sparkle.position.y = 0.85 + heightOff + Math.sin(this.elapsedTime * 4 + baseAngle) * 0.1;
				sparkle.position.z = -0.5 + Math.sin(angle) * radius;
			}
		});

		// Wall torches
		this.wallTorches.forEach((torch) => {
			torch.flames.forEach((f) => {
				f.phase += delta * (5 + Math.random() * 3);
				const flicker = Math.sin(f.phase) * 0.3 + Math.sin(f.phase * 3.1) * 0.15;
				f.mesh.scale.y = f.baseScaleY + flicker * 0.4;
				f.mesh.position.y = f.baseY + flicker * 0.01;
				const fMat = f.mesh.material as MeshStandardMaterial;
				fMat.opacity = 0.6 + flicker * 0.2;
				fMat.emissiveIntensity = 1.0 + flicker * 0.5;
			});
			torch.light.intensity = 1.3 + Math.sin(this.elapsedTime * 7 + torch.flames[0].phase) * 0.3;
		});

		// Crystal shimmer
		this.crystals.forEach((crystal, i) => {
			const cMat = crystal.material as MeshStandardMaterial;
			const shimmer = Math.sin(this.elapsedTime * 1.5 + i * 1.2) * 0.3;
			cMat.emissiveIntensity = 0.4 + shimmer;
			cMat.opacity = 0.55 + shimmer * 0.15;
		});

		// Arch glow pulse
		this.archGlowMeshes.forEach((glow, i) => {
			const gMat = glow.material as MeshStandardMaterial;
			const pulse = Math.sin(this.elapsedTime * 0.8 + i * 0.5) * 0.15;
			gMat.emissiveIntensity = (i < 2 ? 0.7 : 0.35) + pulse;
			gMat.opacity = Math.max(0.1, (i < 2 ? 0.3 : 0.15) + pulse * 0.1);
		});

		// Flying ingredients
		for (let i = this.flyingIngredients.length - 1; i >= 0; i--) {
			const fly = this.flyingIngredients[i];
			fly.progress += delta / fly.duration;
			if (fly.progress >= 1) {
				const world = this.world as World;
				world.scene.remove(fly.mesh);
				this.flyingIngredients.splice(i, 1);
				continue;
			}
			const t = fly.progress;
			const easeT = t * t * (3 - 2 * t);
			fly.mesh.position.lerpVectors(fly.startPos, fly.endPos, easeT);
			fly.mesh.position.y += Math.sin(t * Math.PI) * 0.4;
			const scale = 1 - t * 0.5;
			fly.mesh.scale.set(scale, scale, scale);
			const fMat = fly.mesh.material as MeshStandardMaterial;
			fMat.emissiveIntensity = 1.5 + Math.sin(t * Math.PI * 4) * 0.5;
		}

		// Brew burst particles
		for (let i = this.brewBursts.length - 1; i >= 0; i--) {
			const burst = this.brewBursts[i];
			burst.life -= delta;
			const progress = 1 - burst.life / burst.maxLife;
			burst.mesh.position.x += burst.velocity.x * delta;
			burst.mesh.position.y += burst.velocity.y * delta;
			burst.mesh.position.z += burst.velocity.z * delta;
			burst.velocity.y -= 3 * delta;
			const bMat = burst.mesh.material as MeshStandardMaterial;
			bMat.opacity = Math.max(0, 1 - progress * 1.5);
			bMat.emissiveIntensity = Math.max(0, 2.0 - progress * 2.5);
			const bScale = Math.max(0.1, 1 - progress * 0.8);
			burst.mesh.scale.set(bScale, bScale, bScale);
			if (burst.life <= 0) {
				const world = this.world as World;
				world.scene.remove(burst.mesh);
				this.brewBursts.splice(i, 1);
			}
		}

		// Potion bottles
		for (let i = this.potionBottles.length - 1; i >= 0; i--) {
			const bottle = this.potionBottles[i];
			bottle.life -= delta;
			const progress = 1 - bottle.life / bottle.maxLife;
			bottle.group.position.y = bottle.startY + progress * 0.6;
			bottle.group.rotation.y += delta * 1.5;
			const fadeStart = 0.6;
			if (progress > fadeStart) {
				const fadeProg = (progress - fadeStart) / (1 - fadeStart);
				const opacity = 1 - fadeProg;
				bottle.group.traverse((child) => {
					if (child instanceof Mesh) {
						const cMat = child.material as MeshStandardMaterial;
						if (cMat.transparent) cMat.opacity = Math.max(0, cMat.opacity * opacity);
					}
				});
			}
			const scale = 1 - progress * 0.3;
			bottle.group.scale.set(scale, scale, scale);
			if (bottle.life <= 0) {
				const world = this.world as World;
				world.scene.remove(bottle.group);
				this.potionBottles.splice(i, 1);
			}
		}

		// Score popups
		for (let i = this.scorePopups.length - 1; i >= 0; i--) {
			const popup = this.scorePopups[i];
			popup.life -= delta;
			const progress = 1 - popup.life / popup.maxLife;
			popup.mesh.position.y = popup.startY + progress * 0.8;
			popup.mesh.position.x = popup.startX + Math.sin(progress * Math.PI) * 0.05;
			const scaleP = progress < 0.2 ? progress / 0.2 * 1.3 : 1.3 - (progress - 0.2) * 0.5;
			popup.mesh.scale.set(Math.max(0.1, scaleP), Math.max(0.1, scaleP), Math.max(0.1, scaleP));
			const ppMat = popup.mesh.material as MeshStandardMaterial;
			ppMat.opacity = Math.max(0, 1 - progress * 1.2);
			ppMat.emissiveIntensity = 2.5 - progress * 2;
			if (popup.life <= 0) {
				const world = this.world as World;
				world.scene.remove(popup.mesh);
				this.scorePopups.splice(i, 1);
			}
		}
	}
}
