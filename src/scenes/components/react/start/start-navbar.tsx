import { Cog, ShoppingBag } from "lucide-react";
import React from "react";
import { getEXPForLevel } from "../../../../common";
import { Events } from "../../../../common/server-types";
import type { Room } from "../../../../server";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { CuesDrawer } from "./cue-drawer";
import { SettingsDrawer } from "./settings-drawer";

export function PlayerInfoWidget({ service }: { service: MultiplayerService }) {
    const me = service.me();
    const { name, photo } = me ?? {};

    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());
    React.useEffect(() => {
        service.subscribe(Events.INIT, (data) => {
            setRoom(data);
        });
        service.subscribe(Events.UPDATE_ROOM, (data) => setRoom(data));
    }, []);

    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
    const [activeDrawer, setActiveDrawer] = React.useState<string | null>(null);

    const openDrawer = (drawer: string) => {
        setActiveDrawer(drawer);
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setActiveDrawer(null);
    };

    const width = (me.exp / getEXPForLevel(me.level)) * 100;

    if (room?.isGameStarted) return null;

    return (
        <div className="absolute top-0 right-0 w-full bg-black/60 bg-blur-2xl shadow-lg">
            <SettingsDrawer isOpen={isDrawerOpen && activeDrawer === "settings"} onClose={closeDrawer} service={service} />
            <CuesDrawer isOpen={isDrawerOpen && activeDrawer === "cues"} onClose={closeDrawer} service={service} />

            <div className="flex items-center justify-between px-4 py-3 gap-4">
                {/* Player Info Section */}
                <div className="flex items-center gap-4 min-w-0">
                    <div className="relative flex-shrink-0">
                        <img
                            src={photo}
                            alt="Player Avatar"
                            className="w-16 h-16 rounded-lg border-2 border-yellow-500 shadow-md"
                        />
                        <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 px-2">
                            <p className="text-sm">{me.level}</p>
                        </div>
                    </div>
                    <div className="min-w-0 ">
                        <h2 className="text-white font-bold text-lg truncate">{name}</h2>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={() => openDrawer("cues")}
                        className="flex flex-col items-center justify-center bg-accent/10 hover:bg-accent/20 rounded-lg px-6 py-2 transition-colors w-24"
                    >
                        <div className="text-2xl mb-1">🎱</div>
                        <span className="text-white text-sm font-semibold">Cues</span>
                    </button>

                    <button
                        onClick={() => openDrawer("shop")}
                        className="flex flex-col items-center justify-center bg-accent/10 hover:bg-accent/20 rounded-lg px-6 py-2 transition-colors w-24"
                    >
                        <ShoppingBag className="w-6 h-6 text-green-400 mb-1" />
                        <span className="text-white text-sm font-semibold">Shop</span>
                    </button>

                    <button
                        onClick={() => openDrawer("settings")}
                        className="flex flex-col items-center justify-center bg-accent/10 hover:bg-accent/20 rounded-lg px-6 py-2 transition-colors w-24"
                    >
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
                                    className="h-full bg-gradient-to-r from-accent to-accent/80"
                                    style={{ width: `${width}%` }}
                                />
                            </div>
                            <span className="text-white text-xs font-bold ml-1">{me.level}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
                        <div className="text-2xl">💵</div>
                        <span className="text-green-400 font-bold">{me.cash}</span>
                    </div>
                    {/* Coins */}
                    <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
                        <div className="text-2xl">🪙</div>
                        <span className="text-yellow-400 font-bold">{me.coins}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
