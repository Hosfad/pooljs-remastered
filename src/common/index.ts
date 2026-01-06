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

export const padButtonText = (text: string) => {
    const MAX_CHARS = 16;
    const cleanText = text.replace(/^\[|\]$/g, "").trim();
    const finalText = cleanText;
    const TEXT_MAX_CHARS = MAX_CHARS - 4; // Account for "[ ", " ]"
    const displayText = finalText.length > TEXT_MAX_CHARS ? `${finalText.substring(0, TEXT_MAX_CHARS - 3)}   ` : finalText;

    return `[ ${displayText.padEnd(TEXT_MAX_CHARS)} ]`;
};

export const getEXPForLevel = (level: number) => {
    return Math.floor(Math.pow(level, 2) * 100);
};
