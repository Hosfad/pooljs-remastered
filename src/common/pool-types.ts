/**
 * Pool game specific types and classes
 */

import Phaser from "phaser";
import type { CueId } from "./pool-constants";

export type Collision = "ball" | "wall" | "hole";
export type KeyPositions = { position: Phaser.Math.Vector2; hidden: boolean; collision?: Collision }[][];
export type Color = "red" | "yellow" | "green" | "blue" | "purple" | "black" | "white" | "brown";
export type BallType = "solid" | "striped" | "white" | "black";

export interface Ball {
    ballType: BallType;
    phaserSprite: Phaser.GameObjects.Sprite;
    isPocketed?: boolean;
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
        normal: Phaser.Math.Vector2;
        color: Color;
        visible: boolean;
    };
    phaserGraphics?: Phaser.GameObjects.Graphics;
}

export type GameSettings = {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    selectedCue: CueId;
    showHints: boolean;
    showAimLine: boolean;
};
