/**
 * Contains common configuration, types, and functions that are used throughout our game.
 */

import type Phaser from "phaser";

export function sleep(scene: Phaser.Scene, ms: number): Promise<void> {
    return new Promise((resolve) => {
        scene.time.delayedCall(ms, () => {
            resolve();
        });
    });
}
