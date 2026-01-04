import * as Phaser from "phaser";
import { POOL_ASSETS, POOL_SCENE_KEYS } from "../common/pool-constants";

export class PoolPreLoadScene extends Phaser.Scene {
    private balls: Phaser.GameObjects.Image[] = [];
    private orbitRadius = 150;
    private animationDuration = 1500;
    private readonly CENTER_Y_OFFSET = 30;

    constructor() {
        super({ key: POOL_SCENE_KEYS.POOL_PRELOAD });
    }

    preload(): void {
        this.load.setPath("assets");
        this.load.image(POOL_ASSETS.LOADING_BACKGROUND, "/images/loading-background.png");

        // Load all the assets
        this.load.svg(POOL_ASSETS.WHITE_BALL, "/game/balls/white.svg");
        this.load.svg(POOL_ASSETS.BLACK_BALL, "/game/balls/black.svg");

        const solid = Object.values(POOL_ASSETS.SOLID);
        const stripes = Object.values(POOL_ASSETS.STRIPES);
        for (let i = 0; i < solid.length; i++) {
            this.load.svg(solid[i]!, `/game/balls/${i + 1}.svg`);
            this.load.svg(stripes[i]!, `/game/balls/${i + stripes.length + 2}.svg`);
        }

        // Create animation AFTER assets are loaded
        this.createLoadingAnimation();

        this.load.image(POOL_ASSETS.BACKGROUND, "/game/background.png");
        this.load.image(POOL_ASSETS.DRAG_ICON, "/game/drag.png");
        this.load.image(POOL_ASSETS.AVATAR, "/images/man.png");

        // Sound effects
        this.load.audio(POOL_ASSETS.SOUND_EFFECTS.CUE_HIT_WHITE_BALL, "/sounds/cue-hit-white-ball.mp3");
        this.load.audio(POOL_ASSETS.SOUND_EFFECTS.BALL_FALLING_INTO_POCKET, "/sounds/ball-falling-into-pocket.mp3");
        this.load.audio(POOL_ASSETS.SOUND_EFFECTS.BALL_HITTING_TABLE_EDGE, "/sounds/ball-hitting-table-edge.mp3");

        const cueSize = { width: 600, height: 300 };

        // Cues
        this.load.svg(POOL_ASSETS.CUES.BASIC, "/game/cues/basic.svg", cueSize);
        this.load.svg(POOL_ASSETS.CUES.ADVANCED, "/game/cues/advanced.svg", cueSize);

        this.load.svg(POOL_ASSETS.CUES.EXPERT, "/game/cues/expert.svg", cueSize);
        this.load.svg(POOL_ASSETS.CUES.SWORD, "/game/cues/sword.svg", cueSize);
        this.load.svg(POOL_ASSETS.CUES.SWORD_WOOD, "/game/cues/wodden-sword.svg", cueSize);
        this.load.svg(POOL_ASSETS.CUES.PALESTINE, "/game/cues/palestine.svg", cueSize);

        this.load.on("complete", () => this.transitionToGame());
    }

    create(): void {
        // const { width, height } = this.cameras.main;
        // this.add.image(width / 2, height / 2, "loading-background").setDisplaySize(width, height);
    }

    private transitionToGame(): void {
        this.tweens.killAll();
        this.scene.start(POOL_SCENE_KEYS.POOL_GAME);
    }

    private createLoadingAnimation(): void {
        const textures = [
            POOL_ASSETS.WHITE_BALL,
            POOL_ASSETS.BLACK_BALL,
            POOL_ASSETS.STRIPED_BALL,
            POOL_ASSETS.SOLID_BALL,
            POOL_ASSETS.STRIPED_BALL,
            POOL_ASSETS.SOLID_BALL,
            POOL_ASSETS.STRIPED_BALL,
        ];

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY + this.CENTER_Y_OFFSET;

        textures.forEach((key, index) => {
            const ball = this.add.image(centerX, centerY, key);
            ball.setVisible(false);
            ball.setScale(0.5);

            this.balls.push(ball);

            // Staggered start (200ms increments)
            this.time.delayedCall(index * 200, () => this.startOrbit(ball));
        });
    }

    private startOrbit(ball: Phaser.GameObjects.Image): void {
        ball.setVisible(true);

        let rotation = { angle: 0 };

        this.tweens.add({
            targets: rotation,
            angle: 360,
            duration: this.animationDuration,
            ease: "Cubic.easeInOut",
            repeat: -1,
            onUpdate: () => {
                const rad = Phaser.Math.DegToRad(rotation.angle);
                ball.x = this.cameras.main.centerX + Math.cos(rad) * this.orbitRadius;
                ball.y = this.cameras.main.centerY + this.CENTER_Y_OFFSET + Math.sin(rad) * this.orbitRadius;
                ball.rotation = rad;
            },
        });
    }
}
