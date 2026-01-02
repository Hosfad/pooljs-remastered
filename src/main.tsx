import * as Phaser from "phaser";
import { PoolGameScene } from "./scenes/pool-game-scene";
import { PoolPreLoadScene } from "./scenes/pool-preload-scene";

import React from "react";
import { createRoot } from "react-dom/client";
import { PoolLobby } from "./scenes/components/react/test";
import { MultiplayerService } from "./services/multiplayer-service";
import { PoolService } from "./services/pool-service";

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

window.onload = () => {
    const service = new MultiplayerService(new PoolService([], [], []));
    service.connect();
    // const game = new Phaser.Game(gameConfig);
    const reactRoot = document.getElementById("react-root");
    if (reactRoot) {
        console.log("Rendering React");
        const root = createRoot(reactRoot);
        root.render(
            <React.StrictMode>
                <PoolLobby service={service} />
            </React.StrictMode>
        );
    }
};
