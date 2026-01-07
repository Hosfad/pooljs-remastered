import React from "react";
import { Link, useLocation } from "react-router-dom";
import type { MultiplayerService } from "../../../../services/multiplayer-service";

function MainScreen({ service }: { service: MultiplayerService }) {
    const [_] = React.useState();
    const path = useLocation().pathname;

    return (
        <div
            className="relative w-screen h-[100vh] bg-primary flex flex-col"
            style={{
                backgroundImage: `url(/assets/game/play-background.png)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
        >
            <div className="flex-1 flex items-center justify-center gap-8 px-8">
                <Link to={path === "/lobby" ? "/" : `/lobby`}>
                    <button className="group relative bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-blue-500/50 w-64 h-64 flex flex-col items-center justify-center gap-4">
                        <div className="text-7xl group-hover:scale-110 transition-transform">🎱</div>
                        <div className="text-white text-3xl font-bold">1v1 Match</div>
                        <div className="text-blue-100 text-sm">Play against a friend</div>
                    </button>
                </Link>

                <button className="group relative bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-yellow-500/50 w-64 h-64 flex flex-col items-center justify-center gap-4">
                    <div className="text-7xl group-hover:scale-110 transition-transform">🏆</div>
                    <div className="text-white text-3xl font-bold">Tournament</div>
                    <div className="text-yellow-100 text-sm">Compete for prizes</div>
                </button>

                <button className="group relative bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-400 hover:to-emerald-600 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-green-500/50 w-64 h-64 flex flex-col items-center justify-center gap-4">
                    <div className="text-7xl group-hover:scale-110 transition-transform">🎱</div>
                    <div className="text-white text-3xl font-bold">Practice</div>
                    <div className="text-green-100 text-sm">Improve your skills</div>
                </button>
            </div>
        </div>
    );
}

export default MainScreen;
