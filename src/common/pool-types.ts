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
    isPocketed: boolean;
    isAnimating: boolean;
}

export interface Hole {
    sprite: {
        position: Phaser.Math.Vector2;
        size: { r: number };
    };
    phaserGraphics?: Phaser.GameObjects.Graphics;
    body: MatterJS.Body;
}

export interface Collider {
    sprite: { size: { points: Phaser.Math.Vector2[] } };
    phaserGraphics?: Phaser.GameObjects.Graphics;
    body: MatterJS.Body;
}

export interface Cue {
    phaserSprite: Phaser.GameObjects.Sprite;
    rotation: number;
    power: number;
}

export type GameSettings = {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    selectedCue: CueId;
    showHints: boolean;
    showAimLine: boolean;

    powerMeterPosition: "left" | "right";
    spinSelectorPosition: "left" | "right";
};
