/**
 * Pool game specific types and classes
 */

import Phaser from "phaser";

export type KeyPositions = Phaser.Math.Vector2[][];
export type Color = "red" | "yellow" | "green" | "blue" | "purple" | "black" | "white" | "brown";
export type BallType = "solid" | "striped" | "white" | "black";

export interface Ball {
	ballType: BallType;
	phaserSprite: Phaser.GameObjects.Sprite;
}

export interface Hole {
	sprite: {
		position: Phaser.Math.Vector2;
		color: Color;
		size: { r: number };
		visible: boolean;
	};
	phaserGraphics?: Phaser.GameObjects.Graphics;
}

export interface Cue {
	phaserSprite: Phaser.GameObjects.Sprite;
	rotation: number;
	power: number;
}

export interface Collider {
	sprite: {
		position: Phaser.Math.Vector2;
		size: { points: Phaser.Math.Vector2[] };
		color: Color;
		visible: boolean;
	};
	phaserGraphics: Phaser.GameObjects.Graphics;
}
