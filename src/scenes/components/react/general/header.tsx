import { Users } from "lucide-react";
import React from "react";
import { Experience } from "../../../../common";
import { Events } from "../../../../common/server-types";
import type { Room } from "../../../../server";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { CurrencyBadge } from "../currency-badge";
import { CuesDrawer } from "./cue-drawer";
import { ProfileDrawer } from "./profile-drawer";
import { SettingsDrawer } from "./settings-drawer";
import { ShopDrawer } from "./shop-drwer";
import { RewardWheelDrawer } from "./spin-the-wheel";

export function GeneralHeader({ service }: { service: MultiplayerService }) {
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

    const {
        progress: { percent: expPercentage },
    } = Experience.getUserLevelInfo(me.exp);

    if (room?.isGameStarted) return null;

    return (
        <>
            <SettingsDrawer isOpen={isDrawerOpen && activeDrawer === "settings"} onClose={closeDrawer} service={service} />
            <CuesDrawer isOpen={isDrawerOpen && activeDrawer === "cues"} onClose={closeDrawer} service={service} />
            <ShopDrawer isOpen={isDrawerOpen && activeDrawer === "shop"} onClose={closeDrawer} service={service} />
            <ProfileDrawer isOpen={isDrawerOpen && activeDrawer === "profile"} onClose={closeDrawer} service={service} />
            <RewardWheelDrawer isOpen={isDrawerOpen && activeDrawer === "spin"} onClose={closeDrawer} service={service} />

            {/** Main Navigation Container */}
            <div className="absolute top-0 right-0 w-full flex flex-col">
                <div className="bg-black/40 backdrop-blur-2xl shadow-lg px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => openDrawer("profile")}>
                            <img src={photo} alt="Player Avatar" className="w-16 h-16 rounded-lg shadow-md" />
                            <div className="absolute -top-1 -right-1 bg-accent/50 rounded-full p-1 px-2">
                                <p className="text-sm text-white">{me.level}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-start justify-center">
                            <h2 className="text-white font-bold text-lg truncate">{name}</h2>
                            <div className="w-24 h-2 bg-accent/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-accent to-accent/80"
                                    style={{ width: `${expPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => openDrawer("cues")}
                            className="flex items-center gap-3 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 transition-all shadow-xl"
                        >
                            <span className="text-xl">🎱</span>
                            <span className="text-white text-sm font-bold uppercase tracking-wider">Cues</span>
                        </button>
                        <button
                            onClick={() => openDrawer("settings")}
                            className="flex items-center gap-3 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 transition-all shadow-xl"
                        >
                            <span className="text-xl">⚙️</span>
                            <span className="text-white text-sm font-bold uppercase tracking-wider">Settings</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div onClick={() => openDrawer("shop")}>
                            <CurrencyBadge icon="💵" amount={me.cash} color="text-green-400" />
                        </div>
                        <div onClick={() => openDrawer("shop")}>
                            <CurrencyBadge icon="🪙" amount={me.coins} color="text-yellow-400" />
                        </div>
                    </div>
                </div>

                {/* Sub-Header */}
                <div className="flex gap-2 p-2 justify-center md:justify-start">
                    <button
                        onClick={() => openDrawer("settings")}
                        className="flex items-center gap-3 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 transition-all shadow-xl"
                    >
                        <span className="text-xl text-white">
                            <Users />
                        </span>
                    </button>
                    <button
                        onClick={() => openDrawer("spin")}
                        className="flex items-center gap-3 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 transition-all shadow-xl"
                    >
                        <span className="text-xl">🎁</span>
                    </button>
                </div>
            </div>
        </>
    );
}
