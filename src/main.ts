import * as Phaser from "phaser";
import { PoolGameScene } from "./scenes/pool-game-scene";
import { PoolPreLoadScene } from "./scenes/pool-preload-scene";

const BASE_WIDTH = 1500;
const BASE_HEIGHT = 960;

const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.CANVAS,
    pixelArt: true,
    parent: "game-container",
    backgroundColor: "#1a472a",

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
    },

    scene: [PoolPreLoadScene, PoolGameScene],
};

window.onload = () => {
    const game = new Phaser.Game(gameConfig);

    // Optional: handle dynamic resize
    window.addEventListener("resize", () => {
        game.scale.resize(BASE_WIDTH, BASE_HEIGHT);
    });
};
