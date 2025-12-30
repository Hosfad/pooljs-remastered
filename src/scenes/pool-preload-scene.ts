/**
 * Responsible for loading all pool game assets
 */

import * as Phaser from "phaser";
import { POOL_ASSETS, POOL_SCENE_KEYS } from "../common/pool-constants";

export class PoolPreLoadScene extends Phaser.Scene {
    constructor() {
        super({ key: POOL_SCENE_KEYS.POOL_PRELOAD });
    }

    public preload(): void {
        this.load.setPath("assets/game");
        this.load.image(POOL_ASSETS.BACKGROUND, "background.png");
        this.load.image(POOL_ASSETS.WHITE_BALL, "spr_ball2.png");
        this.load.image(POOL_ASSETS.SOLID_BALL, "spr_yellowBall2.png");
        this.load.image(POOL_ASSETS.STRIPED_BALL, "spr_redBall2.png");
        this.load.image(POOL_ASSETS.BLACK_BALL, "spr_blackBall2.png");
        this.load.image(POOL_ASSETS.CUE_STICK, "spr_stick.png");
        this.load.image(POOL_ASSETS.DRAG_ICON, "drag.png");
    }

    public create(): void {
        this.scene.start(POOL_SCENE_KEYS.POOL_GAME);
    }
}
