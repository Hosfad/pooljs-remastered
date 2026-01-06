import React from "react";
import { Link, useLocation } from "react-router-dom";
import type { MultiplayerService } from "../../../services/multiplayer-service";
import { PlayerInfoWidget } from "./current-player-widget";
import { Button } from "./ui/button";

function MainScreen({ service }: { service: MultiplayerService }) {
    const [_] = React.useState();
    const path = useLocation().pathname;
    return (
        <div
            className="relative w-screen h-[100vh] bg-primary"
            // style={{
            //     backgroundImage: `url(/assets/game/play-background.png)`,
            //     backgroundSize: "cover",
            //     backgroundPosition: "center",
            //     backgroundRepeat: "no-repeat",
            // }}
        >
            <PlayerInfoWidget service={service} />

            <Link to={path === "/lobby" ? "/" : `/lobby?room=${service.getRoomId()}`}>
                <Button variant="dark" className="absolute bottom-4 min-w-[20vw] right-4">
                    {path === "/lobby" ? "Go Back" : "Start Game"}
                </Button>
            </Link>
        </div>
    );
}

export default MainScreen;
