import * as Phaser from "phaser";
import { PoolGameScene } from "./scenes/pool-game-scene";
import { PoolPreLoadScene } from "./scenes/pool-preload-scene";

const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.CANVAS,
    pixelArt: true,
    parent: "game-container",
    backgroundColor: "#1a472a",

    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: "100%",
        height: "100%",
    },

    input: {
        keyboard: true,
        mouse: true,
        touch: true,
    },

    scene: [PoolPreLoadScene, PoolGameScene],
};

const PIXELS_PER_METER = 300;
const INCH_TO_METER = 0.0254;
const OZ_TO_KG = 0.0283495;

const BALL_DIAMETER_IN = 2.25;
const BALL_MASS_OZ = 6;

const BALL_RADIUS_PX = (BALL_DIAMETER_IN * INCH_TO_METER * PIXELS_PER_METER) / 2;
const BALL_MASS_KG = BALL_MASS_OZ * OZ_TO_KG;

// Coefficients
const BALL_RESTITUTION = 0.998; // ball (e)
const BALL_FRICTION = 0.01; // ball (μ)
const CLOTH_ROLLING_RESISTANCE = 0.012; // cloth (frictionAir)
const RAIL_RESTITUTION = 0.75; // rail (e)

class PoolScene extends Phaser.Scene {
    poolBalls!: Phaser.Physics.Matter.Image[];

    constructor() {
        super("PoolScene");
    }

    preload() {
        this.load.setPath("assets");
        this.load.image("ball", "/game/balls/white.svg");
    }

    create() {
        const bounds = { x: 100, y: 150, width: 800, height: 400 };

        this.matter.world.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
        this.matter.world.walls!.left!.restitution = RAIL_RESTITUTION;
        this.matter.world.walls!.right!.restitution = RAIL_RESTITUTION;
        this.matter.world.walls!.top!.restitution = RAIL_RESTITUTION;
        this.matter.world.walls!.bottom!.restitution = RAIL_RESTITUTION;

        this.poolBalls = [];

        const rows = 5;
        const rackStartX = bounds.x + bounds.width * 0.75;
        const rackStartY = bounds.y + bounds.height / 2;

        const spacing = 0.5;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col <= row; col++) {
                const x = rackStartX + row * (BALL_RADIUS_PX * 2 * Math.cos(Math.PI / 6));
                const y = rackStartY + (col - row / 2) * (BALL_RADIUS_PX * 2 + spacing);

                this.createBall(x, y);
            }
        }

        const cueBallX = bounds.x + bounds.width * 0.25;
        const cueBallY = rackStartY;
        const cueBall = this.createBall(cueBallX, cueBallY);
        cueBall.setVelocity(25, 0);
    }

    createBall(x: number, y: number) {
        const ball = this.matter.add.image(x, y, "ball");

        ball.setCircle(BALL_RADIUS_PX);
        ball.setDisplaySize(BALL_RADIUS_PX * 2, BALL_RADIUS_PX * 2);

        ball.setBody(
            { type: "circle", radius: BALL_RADIUS_PX },
            {
                restitution: BALL_RESTITUTION,
                friction: BALL_FRICTION,
                frictionAir: CLOTH_ROLLING_RESISTANCE,
                mass: BALL_MASS_KG,
                label: "pool-ball",
            }
        );

        this.poolBalls.push(ball);
        return ball;
    }

    override update() {}
}

window.onload = () => {
    new Phaser.Game({
        type: Phaser.AUTO,
        parent: "game-container",
        width: 1024,
        height: 768,
        physics: {
            default: "matter",
            matter: {
                gravity: { x: 0, y: 0 },
                debug: true,
                enableSleeping: false,
            },
        },
        scene: [PoolScene],
    });
};
