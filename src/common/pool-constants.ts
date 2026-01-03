/**
 * Pool game specific constants
 */
export let DEBUG_GRAPHICS = true;

export function setDebugGraphics(debug: boolean) {
    DEBUG_GRAPHICS = debug;
}

export let MODAL_OPEN: boolean = false;
export function setGlobalModalOpenVariable(open: boolean) {
    MODAL_OPEN = open;
}

export const POOL_ASSETS = {
    BACKGROUND: "background",
    WHITE_BALL: "spr_ball2",
    SOLID_BALL: "spr_yellowBall2",
    STRIPED_BALL: "spr_redBall2",
    BLACK_BALL: "spr_blackBall2",
    CUE_STICK: "spr_stick",
    DRAG_ICON: "drag",
    LOADING_BACKGROUND: "loading-background",
    SOUND_EFFECTS: {
        CUE_HIT_WHITE_BALL: "cue-hit-white-ball",
        BALL_FALLING_INTO_POCKET: "ball-falling-into-pocket",
        BALL_HITTING_TABLE_EDGE: "ball-hitting-table-edge",
    },

    CUES: {
        BASIC: "cue-basic",
        ADVANCED: "cue-advanced",
        EXPERT: "cue-expert",
        SWORD: "cue-sword",
        SWORD_WOOD: "cue-wooden-sword",
        PALESTINE: "cue-palestine",
    },
    AVATAR: "avatar",
    AVATARS: {
        PLAYER_1: "player-1-avatar",
        PLAYER_2: "player-2-avatar",
        PLAYER_3: "player-3-avatar",
        PLAYER_4: "player-4-avatar",
        PLAYER_5: "player-5-avatar",
        PLAYER_6: "player-6-avatar",
    },
} as const;

export const POOL_SCENE_KEYS = {
    POOL_PRELOAD: "POOL_PRELOAD",
    POOL_GAME: "POOL_GAME",
};

// Game dimensions
export const POOL_TABLE_WIDTH = 1300;
export const POOL_TABLE_HEIGHT = 768;
export const BALL_RADIUS = 15;
export const HOLE_RADIUS = 50;
export const CUE_LENGTH = 400;
export const CUE_HEIGHT = 15;

// Physics constants
export const FRICTION = 0.98;
export const MAX_POWER = 500;

// UI Constants
export const SCORED_BALL_AREA = {
    Y: POOL_TABLE_HEIGHT + 30,
    START_X: 100,
    SPACING: 45,
    SCALE: 0.7,
};

export const COLORS = {
    primary: "#2C5530",
    dark: "#1A1A1A",
    accent: "#92cf04ff",
    text: "#ffffff",
};

export const CUE_DATA = {
    basic: {
        id: "basic",
        power: 70,
        accuracy: 80,
    },
    advanced: {
        id: "advanced",
        power: 90,
        accuracy: 65,
    },
    expert: {
        id: "expert",
        power: 60,
        accuracy: 95,
    },
    sword: {
        id: "sword",
        power: 60,
        accuracy: 95,
    },
    wodden_sword: {
        id: "wodden_sword",
        power: 60,
        accuracy: 95,
    },
    palestine: {
        id: "palestine",
        power: 60,
        accuracy: 95,
    },
} as const;
export const CUES = Object.keys(CUE_DATA) as CueId[];
export type CueId = keyof typeof CUE_DATA;
