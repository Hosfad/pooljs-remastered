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

export class Experience {
    public static readonly MAX_LEVEL = 100;
    private static readonly XP_FOR_LEVEL: number[] = Experience.buildXpTable();

    private static buildXpTable(): number[] {
        const table: number[] = new Array(Experience.MAX_LEVEL);
        let totalXp = 0;

        for (let level = 1; level <= Experience.MAX_LEVEL; level++) {
            // Level 1 will be 0 because totalXp starts at 0
            table[level - 1] = Math.floor(totalXp / 4);

            // Calculate XP needed for the NEXT level
            const difference = level + 300 * Math.pow(2, level / 7);
            totalXp += Math.floor(difference);
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
        if (xp < 0) return 1; // Default to level 1 for safety

        // Since the array is sorted, we can search backwards or use a simplified binary search
        // This version finds the highest level where the requirement is <= current XP
        let level = 1;
        for (let i = Experience.XP_FOR_LEVEL.length - 1; i >= 0; i--) {
            if (xp >= Experience.XP_FOR_LEVEL[i]!) {
                return i + 1;
            }
        }
        return level;
    }

    public static getUserLevelInfo(exp: number) {
        const currentLevel = Experience.getLevelForXp(exp);
        const myExp = Experience.getXpForLevel(currentLevel) - exp;
        const nextLevel = currentLevel + 1;

        const totalExpInCurrentLevel = Experience.getXpForLevel(nextLevel) - Experience.getXpForLevel(currentLevel);

        return {
            currentLevel,
            nextLevel,
            progress: {
                exp: myExp,
                percent: Math.floor((myExp / totalExpInCurrentLevel) * 100),
                totalExp: totalExpInCurrentLevel,
                remaining: totalExpInCurrentLevel - myExp,
            },
        };
    }
}
