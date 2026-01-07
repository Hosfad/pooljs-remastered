/**
 * Pool game specific constants
 */
export let DEBUG_GRAPHICS = false;

export function setDebugGraphics(debug: boolean) {
    DEBUG_GRAPHICS = debug;
}
export let INIT_DISCORD_SDK = false;

export let MODAL_OPEN: boolean = false;
export function setGlobalModalOpenVariable(open: boolean) {
    MODAL_OPEN = open;
}

export const CUSHION_CONSTANTS = {
    SIDE_INNER_X: 0, // Inner edge x position
    SIDE_OUTER_X: 1.0, // Outer edge x position
    SIDE_THICKNESS_X: 0, // Thickness in x direction
    SIDE_TOP_Y: 0.8, // Top inset
    SIDE_BOTTOM_Y: 1.8, // Bottom inset

    // Top/bottom cushion dimensions (horizontal rails)
    RAIL_OUTER_Y: 0, // Outer edge y position
    RAIL_INNER_Y: 1.3, // Inner edge y position
    RAIL_THICKNESS_Y: 1.3, // Thickness in y direction (RAIL_INNER_Y - RAIL_OUTER_Y adjusted)
    RAIL_SIDE_X: 0.6, // Side inset
    RAIL_CORNER_X: 1.4, // Corner diagonal inset
    RAIL_POCKET_OUTER: 2.14, // Outer pocket edge divisor
    RAIL_POCKET_INNER: 2.05, // Inner pocket edge divisor
};

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

    HAND: "hand",
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
    accent: "#10b981",
    text: "#ffffff",
};

export const CUE_DATA = {
    basic: {
        id: "basic",
        category: "owned",
        power: 55,
        accuracy: 65,
        spin: 0,
        sprite: `/assets/game/cues/basic.svg`,
    },

    advanced: {
        id: "advanced",
        category: "owned",
        power: 70,
        accuracy: 60,
        spin: 10,
        sprite: `/assets/game/cues/advanced.svg`,
    },

    expert: {
        id: "expert",
        category: "standard",
        power: 75,
        accuracy: 85,
        spin: 20,
        sprite: `/assets/game/cues/expert.svg`,
    },

    sword: {
        id: "sword",
        category: "standard",
        power: 80,
        accuracy: 88,
        spin: 30,
        sprite: `/assets/game/cues/sword.svg`,
    },

    wodden_sword: {
        id: "wodden_sword",
        category: "standard",
        power: 82,
        accuracy: 90,
        spin: 40,
        sprite: `/assets/game/cues/wodden-sword.svg`,
    },

    palestine: {
        id: "palestine",
        category: "standard",
        power: 85,
        accuracy: 92,
        spin: 50,
        sprite: `/assets/game/cues/palestine.svg`,
    },
} as const;

export type CueId = keyof typeof CUE_DATA;
export const CUES = Object.keys(CUE_DATA) as CueId[];

export type CueInfo = typeof CUE_DATA[CueId];
