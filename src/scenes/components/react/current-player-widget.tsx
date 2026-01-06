import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { MultiplayerService } from "../../../services/multiplayer-service";
import { Button } from "./ui/button";

export function PlayerInfoWidget({ service }: { service: MultiplayerService }) {
    const me = service.me();
    const { name, photo } = me ?? {};

    const currentXP = 46;
    const xpToNextLevel = 100;
    const progress = (currentXP / xpToNextLevel) * 100;
    const level = 1;

    const roomId = service.getRoomId();

    console.log("me", me);

    return (
        <div className="fixed top-4 left-4 z-50">
            <div className="bg-black/40 p-4 backdrop-blur-md rounded-xl p-3 border-2 border-accent shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <img src={`${photo}`} className="w-20 h-20 rounded-full border-2 border-emerald-400/50 shadow-lg" />
                        <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-black/50 shadow-lg">
                            {level}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-emerald-300 font-bold text-sm truncate">{name}</h3>

                        <div className="mt-1">
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                                <span>Level {level}</span>
                                <span>
                                    {currentXP} / {xpToNextLevel} XP
                                </span>
                            </div>
                            <div className="relative w-full h-2 bg-black/50 rounded-full overflow-hidden border border-emerald-600/20">
                                <div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-lg"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {roomId && (
                <Link to={`/lobby?room=${roomId}`}>
                    <Button className="text-xs h-8 mt-2 w-full flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Room
                    </Button>
                </Link>
            )}
        </div>
    );
}
