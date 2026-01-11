import * as Phaser from "phaser";
import { POOL_ASSETS, POOL_SCENE_KEYS } from "../common/pool-constants";

export class PoolPreLoadScene extends Phaser.Scene {
    constructor() {
        super({ key: POOL_SCENE_KEYS.POOL_PRELOAD });
    }

    preload(): void {
        this.load.setPath("assets");
        this.load.image(POOL_ASSETS.LOADING_BACKGROUND, "/images/loading-background.png");

        // BALLS
        const grid = { frameWidth: 256, frameHeight: 256 };
        this.load.spritesheet(POOL_ASSETS.WHITE_BALL, "/game/balls/ball_1.png", grid);
        this.load.spritesheet(POOL_ASSETS.BLACK_BALL, "/game/balls/ball_black.png", grid);

        const solid = Object.values(POOL_ASSETS.SOLID);
        const stripes = Object.values(POOL_ASSETS.STRIPES);
        for (let i = 0; i < solid.length; i++) {
            this.load.spritesheet(solid[i]!, `/game/balls/ball_${i + 1}.png`, grid);
            this.load.spritesheet(stripes[i]!, `/game/balls/ball_${i + stripes.length + 2}.png`, grid);
        }

        this.load.image(POOL_ASSETS.BACKGROUND, "/game/background.png");
        this.load.image(POOL_ASSETS.DRAG_ICON, "/game/drag.png");
        this.load.image(POOL_ASSETS.AVATAR, "/images/man.png");

        // Sound effects
        this.load.audio(POOL_ASSETS.SOUND_EFFECTS.CUE_HIT_WHITE_BALL, "/sounds/cue-hit-white-ball.mp3");
        this.load.audio(POOL_ASSETS.SOUND_EFFECTS.BALL_FALLING_INTO_POCKET, "/sounds/ball-falling-into-pocket.mp3");
        this.load.audio(POOL_ASSETS.SOUND_EFFECTS.BALL_HITTING_TABLE_EDGE, "/sounds/ball-hitting-table-edge.mp3");

        const cueSize = { width: 600, height: 300 };

        // Hand
        this.load.image(POOL_ASSETS.HAND, "/game/hand.png");

        // Cues
        this.load.svg(POOL_ASSETS.CUES.BASIC, "/game/cues/basic.svg", cueSize);
        this.load.svg(POOL_ASSETS.CUES.ADVANCED, "/game/cues/advanced.svg", cueSize);

        this.load.svg(POOL_ASSETS.CUES.EXPERT, "/game/cues/expert.svg", cueSize);
        this.load.svg(POOL_ASSETS.CUES.SWORD, "/game/cues/sword.svg", cueSize);
        this.load.svg(POOL_ASSETS.CUES.SWORD_WOOD, "/game/cues/wodden-sword.svg", cueSize);
        this.load.svg(POOL_ASSETS.CUES.PALESTINE, "/game/cues/palestine.svg", cueSize);

        this.load.on("complete", () => this.transitionToGame());
    }

    private transitionToGame(): void {
        this.tweens.killAll();
        this.scene.start(POOL_SCENE_KEYS.POOL_GAME);
    }
}
