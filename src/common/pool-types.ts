/**
 * Pool game specific types and classes
 */

import Phaser from "phaser";

export type BallType = "solid" | "striped" | "white" | "black";

export interface Ball {
    sprite: {
        position: Phaser.Math.Vector2;
        color: string;
        size: { r: number };
        visible: boolean;
    };
    rigidbody: {
        velocity: Phaser.Math.Vector2;
    };
    ballType: BallType;
    phaserSprite?: Phaser.GameObjects.Sprite;
}

export interface Hole {
    sprite: {
        position: Phaser.Math.Vector2;
        color: string;
        size: { r: number };
        visible: boolean;
    };
    phaserGraphics?: Phaser.GameObjects.Graphics;
}

export interface Cue {
    sprite: {
        position: Phaser.Math.Vector2;
        color: string;
        size: { w: number; h: number };
        visible: boolean;
    };
    phaserSprite?: Phaser.GameObjects.Sprite;
    rotation: number;
    power: number;
}

export interface Collider {
    sprite: {
        position: Phaser.Math.Vector2;
        size: { points: Phaser.Math.Vector2[] };
        color: string;
        visible: boolean;
    };
    rigidbody: {
        velocity: Phaser.Math.Vector2;
        normal: Phaser.Math.Vector2;
    };
    phaserGraphics?: Phaser.GameObjects.Graphics;
}
