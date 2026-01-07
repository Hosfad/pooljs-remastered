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

export class Experience {
    public static readonly MAX_LEVEL = 100;

    private static readonly XP_FOR_LEVEL: number[] = Experience.buildXpTable();

    private static buildXpTable(): number[] {
        const table: number[] = new Array(Experience.MAX_LEVEL);
        let xp = 0;

        for (let level = 1; level <= Experience.MAX_LEVEL; level++) {
            table[level - 1] = Math.floor(xp / 4);

            const difference = level + 300 * Math.pow(2, level / 7);
            xp += Math.floor(difference);
        }

        return table;
    }

    public static getXpForLevel(level: number): number {
        if (level < 1 || level > Experience.MAX_LEVEL) {
            throw new Error(`${level} is not a valid level`);
        }

        return Experience.XP_FOR_LEVEL[level - 1]!;
    }

    public static getLevelForXp(xp: number): number {
        if (xp < 0) {
            throw new Error(`XP (${xp}) must not be negative`);
        }

        let low = 0;
        let high = Experience.XP_FOR_LEVEL.length - 1;

        while (low <= high) {
            const mid = low + Math.floor((high - low) / 2);
            const xpForLevel = Experience.XP_FOR_LEVEL[mid];
            if (!xpForLevel) continue;

            if (xp < xpForLevel) {
                high = mid - 1;
            } else if (xp > xpForLevel) {
                low = mid + 1;
            } else {
                return mid + 1;
            }
        }

        return high + 1;
    }
}
