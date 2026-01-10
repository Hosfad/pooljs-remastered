/**
 * Pool game specific constants
 */
export let DEBUG_GRAPHICS = false;
export let USE_MATTER_JS = false;
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

// Game dimensions

const width = window.innerWidth;
const targetWidth = 1920;
const screenRatio = width / targetWidth;

export const BALL_RADIUS = 10 * screenRatio;
export const HOLE_RADIUS = 25 * screenRatio;

// Real life physics constants

const OZ_TO_KG = 0.0283495;
const BALL_MASS_OZ = 12;

export const BALL_MASS_KG = BALL_MASS_OZ * OZ_TO_KG;

// Coefficients
export const BALL_RESTITUTION = 0.998; // ball (e)
export const BALL_FRICTION = 0.015; // ball (μ)
export const CLOTH_ROLLING_RESISTANCE = 0.015; // cloth (frictionAir)
export const RAIL_RESTITUTION = 0.999; // rail (e)

// Physics constants
export const MAX_POWER = 30;
export const MAX_STEPS = 600;
export const TIMER_DURATION = 30;

// Label Constants
export const HOLE_LABEL = "hole";
export const BALL_LABEL = "ball";

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
        price: {
            cash: undefined,
            coins: undefined,
        },
    },
    standard: {
        id: "standard",
        category: "standard",
        power: 60,
        accuracy: 60,
        spin: 10,
        sprite: `/assets/game/cues/standard.svg`,
        price: {
            cash: undefined,
            coins: 3000,
        },
    },
    advanced: {
        id: "advanced",
        category: "standard",
        power: 70,
        accuracy: 60,
        spin: 10,
        sprite: `/assets/game/cues/advanced.svg`,
        price: {
            cash: undefined,
            coins: 5000,
        },
    },
    classic: {
        id: "classic",
        category: "standard",
        power: 80,
        accuracy: 80,
        spin: 20,
        sprite: `/assets/game/cues/classic.svg`,
        price: {
            cash: undefined,
            coins: 10000,
        },
    },

    flame: {
        id: "flame",
        category: "standard",
        power: 90,
        accuracy: 90,
        spin: 30,
        sprite: `/assets/game/cues/flame.svg`,
        price: {
            cash: undefined,
            coins: 50000,
        },
    },

    expert: {
        id: "expert",
        category: "standard",
        power: 75,
        accuracy: 85,
        spin: 20,
        sprite: `/assets/game/cues/expert.svg`,
        price: {
            cash: undefined,
            coins: 100_000,
        },
    },

    wodden_sword: {
        id: "wodden_sword",
        category: "standard",
        power: 82,
        accuracy: 90,
        spin: 40,
        sprite: `/assets/game/cues/wodden-sword.svg`,
        price: {
            cash: 100,
            coins: undefined,
        },
    },

    sword: {
        id: "sword",
        category: "standard",
        power: 80,
        accuracy: 88,
        spin: 30,
        sprite: `/assets/game/cues/sword.svg`,
        price: {
            cash: 250,
            coins: undefined,
        },
    },

    toxic: {
        id: "toxic",
        category: "standard",
        power: 98,
        accuracy: 95,
        spin: 80,
        sprite: `/assets/game/cues/toxic.svg`,
        price: {
            cash: 400,
            coins: undefined,
        },
    },

    palestine: {
        id: "palestine",
        category: "standard",
        power: 100,
        accuracy: 100,
        spin: 100,
        sprite: `/assets/game/cues/palestine.svg`,
        price: {
            cash: 650,
            coins: undefined,
        },
    },
} as const;

export type CueId = keyof typeof CUE_DATA;
export const CUES = Object.keys(CUE_DATA) as CueId[];

export type CueInfo = typeof CUE_DATA[CueId];

export type ShopPack = {
    id: string;
    base: number;
    currency: "coins" | "cash";
    bonusPercent: number;
    total: number;
    price: string;
    tag?: "best" | "popular";
};

export const COIN_PACKS: ShopPack[] = [
    { id: "c1", base: 100000, bonusPercent: 80, total: 180000, price: "$99.99", tag: "best", currency: "coins" },
    { id: "c2", base: 45000, bonusPercent: 65, total: 75000, price: "$49.99", tag: "popular", currency: "coins" },
    { id: "c3", base: 16000, bonusPercent: 60, total: 25600, price: "$19.99", currency: "coins" },
    { id: "c4", base: 8000, bonusPercent: 40, total: 11200, price: "$9.99", currency: "coins" },
    { id: "c5", base: 4000, bonusPercent: 30, total: 5200, price: "$4.99", currency: "coins" },
    { id: "c6", base: 1500, bonusPercent: 25, total: 1875, price: "$1.99", currency: "coins" },
];

export const CASH_PACKS: ShopPack[] = [
    { id: "m1", base: 1000, bonusPercent: 60, total: 1600, price: "$99.99", tag: "best", currency: "cash" },
    { id: "m2", base: 450, bonusPercent: 45, total: 653, price: "$49.99", tag: "popular", currency: "cash" },
    { id: "m3", base: 180, bonusPercent: 25, total: 225, price: "$19.99", currency: "cash" },
    { id: "m4", base: 90, bonusPercent: 20, total: 110, price: "$9.99", currency: "cash" },
    { id: "m5", base: 40, bonusPercent: 20, total: 48, price: "$4.99", currency: "cash" },
    { id: "m6", base: 15, bonusPercent: 10, total: 17, price: "$1.99", currency: "cash" },
];
