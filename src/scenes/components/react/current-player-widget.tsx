import { Cog, ShoppingBag, Star, Trophy } from "lucide-react";
import type { MultiplayerService } from "../../../services/multiplayer-service";

export function PlayerInfoWidget({ service }: { service: MultiplayerService }) {
    const me = service.me();
    const { name, photo } = me ?? {};

    const playerData = {
        score: 0,
        maxScore: 100,
        energy: 100,
        cash: 100,
        coins: 100,
        level: 1,
    };

    const handleButtonClick = (button: string) => {};

    const room = service.getCurrentRoom();
    return (
        <div className="absolute top-0 right-0 w-full bg-black/40 bg-blur-2xl shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 gap-4">
                {/* Player Info Section */}
                <div className="flex items-center gap-4 min-w-0">
                    <div className="relative flex-shrink-0">
                        <img
                            src={photo}
                            alt="Player Avatar"
                            className="w-16 h-16 rounded-lg border-2 border-yellow-500 shadow-md"
                        />
                        <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                            <Star className="w-3 h-3 text-gray-900 fill-gray-900" />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-white font-bold text-lg truncate">{name}</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-500 text-sm font-semibold">
                                {playerData.score}/{playerData.maxScore}
                            </span>
                            <Trophy className="w-4 h-4 text-yellow-500" />
                        </div>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={() => handleButtonClick("cues")}
                        className="flex flex-col items-center justify-center bg-accent/10 hover:bg-accent/20 rounded-lg px-6 py-2 transition-colors min-w-[70px]"
                    >
                        <div className="text-2xl mb-1">🎱</div>
                        <span className="text-white text-sm font-semibold">Cues</span>
                    </button>

                    <button
                        onClick={() => handleButtonClick("shop")}
                        className="flex flex-col items-center justify-center bg-accent/10 hover:bg-accent/20 rounded-lg px-6 py-2 transition-colors min-w-[70px]"
                    >
                        <ShoppingBag className="w-6 h-6 text-green-400 mb-1" />
                        <span className="text-white text-sm font-semibold">Shop</span>
                    </button>

                    <button className="flex flex-col items-center justify-center bg-accent/10 hover:bg-accent/20 rounded-lg px-6 py-2 transition-colors min-w-[70px]">
                        <Cog className="w-6 h-6 text-yellow-400 mb-1" />
                        <span className="text-white text-sm font-semibold">Settings</span>
                    </button>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
                        <div className="text-2xl">⚡</div>
                        <div className="flex items-center gap-1">
                            <div className="w-24 h-2 bg-accent/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                                    style={{ width: `${playerData.energy}%` }}
                                />
                            </div>
                            <span className="text-white text-xs font-bold ml-1">{playerData.energy}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
                        <div className="text-2xl">💵</div>
                        <span className="text-green-400 font-bold">{playerData.cash}</span>
                    </div>
                    {/* Coins */}
                    <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
                        <div className="text-2xl">🪙</div>
                        <span className="text-yellow-400 font-bold">{playerData.coins}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
