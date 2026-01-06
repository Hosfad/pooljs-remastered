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
    SOLID: {
        ONE: "yellow-ball-1",
        TWO: "blue-ball-2",
        THREE: "red-ball-3",
        FOUR: "purple-ball-4",
        FIVE: "orange-ball-5",
        SIX: "green-ball-6",
        SEVEN: "red-ball-7",
    },
    STRIPES: {
        NINE: "yellow-ball-9",
        TEN: "blue-ball-10",
        ELEVEN: "red-ball-11",
        TWELVE: "purple-ball-12",
        THIRTEEN: "orange-ball-13",
        FOURTEEN: "green-ball-14",
        FIFTEEN: "red-ball-15",
    },
    WHITE_BALL: "white-ball",
    BLACK_BALL: "black-ball-8",
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

const width = window.innerWidth;
const targetWidth = 1920;
const screenRatio = width / targetWidth;

// Game dimensions
export const BALL_RADIUS = 15 * screenRatio;
export const HOLE_RADIUS = 50 * screenRatio;

// Physics constants
export const MAX_POWER = 30;
export const MAX_STEPS = 350;
export const TIMER_DURATION = 30;

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
