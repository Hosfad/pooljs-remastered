/**
 * Pool game specific types and classes
 */

import Phaser from "phaser";
import { POOL_ASSETS } from "./pool-constants";

export type Collision = "ball" | "wall" | "hole";
export type KeyPositions = { position: Phaser.Math.Vector2; hidden: boolean; collision?: Collision }[][];
export type Color = "red" | "yellow" | "green" | "blue" | "purple" | "black" | "white" | "brown";
export type BallType = "solid" | "striped" | "white" | "black" | "red" | "yellow";

export const CUE_DATA = {
    basic: {
        id: "basic",
        spriteId: POOL_ASSETS.CUES.BASIC,
        power: 70,
        accuracy: 80,
    },
    advanced: {
        id: "advanced",
        spriteId: POOL_ASSETS.CUES.ADVANCED,
        power: 90,
        accuracy: 65,
    },
    expert: {
        id: "expert",
        spriteId: POOL_ASSETS.CUES.EXPERT,
        power: 60,
        accuracy: 95,
    },
    sword: {
        id: "sword",
        spriteId: POOL_ASSETS.CUES.SWORD,
        power: 60,
        accuracy: 95,
    },
    wooden_sword: {
        id: "wodden_sword",
        spriteId: POOL_ASSETS.CUES.SWORD_WOOD,
        power: 60,
        accuracy: 95,
    },
} as const;

export type CueId = keyof typeof CUE_DATA;

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
