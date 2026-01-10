import * as Phaser from "phaser";
import { DEBUG_GRAPHICS } from "./common/pool-constants";
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

    physics: {
        default: "matter",
        matter: {
            gravity: { x: 0, y: 0 },
            debug: DEBUG_GRAPHICS,
            autoUpdate: false,
            restingThresh: 0.001,
        },
    },
    antialias: false,

    scene: [PoolPreLoadScene, PoolGameScene],
};

window.onload = () => {
    const game = new Phaser.Game(gameConfig);
};
