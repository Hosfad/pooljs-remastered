/**
 * Pool game specific constants
 */
export const DEBUG_GRAPHICS = true;

export const POOL_ASSETS = {
	BACKGROUND: "background",
	WHITE_BALL: "spr_ball2",
	SOLID_BALL: "spr_yellowBall2",
	STRIPED_BALL: "spr_redBall2",
	BLACK_BALL: "spr_blackBall2",
	CUE_STICK: "spr_stick",
	DRAG_ICON: "drag",
	LOADING_BACKGROUND: "loading-background",
} as const;

export const POOL_SCENE_KEYS = {
	POOL_PRELOAD: "POOL_PRELOAD",
	POOL_GAME: "POOL_GAME",
};

// Game dimensions
export const POOL_TABLE_WIDTH = 1300;
export const POOL_TABLE_HEIGHT = 768;
export const BALL_RADIUS = 30;
export const HOLE_RADIUS = 35;
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

export const POWER_METER = {
	X: POOL_TABLE_WIDTH + 100,
	Y: 50,
	WIDTH: 60,
	HEIGHT: 600,
	HANDLE_HEIGHT: 50,
	MIN_Y: 50,
	MAX_Y: 650,
};
