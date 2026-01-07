import { useState } from "react";
import { CUE_DATA } from "../../../../common/pool-constants";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { Drawer } from "../ui/drawer";
import { CueCard } from "./cue-card";

export function ShopDrawer({
    isOpen,
    onClose,
    service,
}: {
    isOpen: boolean;
    onClose: () => void;
    service: MultiplayerService;
}) {
    const [activeTab, setActiveTab] = useState<"cues" | "coins" | "cash">("cues");

    const tabs = [
        { id: "cues" as const, label: "Cues" },
        { id: "coins" as const, label: "Coins" },
        { id: "cash" as const, label: "Cash" },
    ];

    const me = service.me();
    const cues = Object.values(CUE_DATA);
    const [selectedCue, setSelectedCue] = useState<string | null>(me.selectedCue);

    const renderContent = () => {
        switch (activeTab) {
            case "cues":
                return (
                    <div className="space-y-4">
                        {cues
                            .filter((c) => !me.ownedCues.includes(c.id))
                            .map((cue) => (
                                <CueCard
                                    key={cue.id}
                                    cue={cue}
                                    owned={me.ownedCues.includes(cue.id)}
                                    onSelect={() => console.log("Selected cue")}
                                    isSelected={selectedCue === cue.id}
                                />
                            ))}
                    </div>
                );
            case "coins":
                return (
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            "Energy Pack",
                            "Coin Bag",
                            "VIP Pass",
                            "Power Boost",
                            "Lucky Charm",
                            "Time Freeze",
                            "Double XP",
                            "Mega Bundle",
                        ].map((item, idx) => (
                            <div
                                key={item}
                                className="bg-gradient-to-br from-green-500/20 to-emerald-700/20 border border-green-500/30 rounded-lg p-4 hover:border-green-400 transition-colors cursor-pointer"
                            >
                                <div className="text-5xl mb-2">{["⚡", "💰", "👑", "🚀", "🍀", "⏰", "✨", "🎁"][idx]}</div>
                                <h3 className="text-white font-bold text-sm">{item}</h3>
                                <div className="mt-2">
                                    <span className="text-green-400 font-bold text-sm">💵 ${(idx + 1) * 5}</span>
                                </div>
                                <button className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded transition-colors text-sm">
                                    Buy
                                </button>
                            </div>
                        ))}
                    </div>
                );
            case "cash":
                return (
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            "Energy Pack",
                            "Coin Bag",
                            "VIP Pass",
                            "Power Boost",
                            "Lucky Charm",
                            "Time Freeze",
                            "Double XP",
                            "Mega Bundle",
                        ].map((item, idx) => (
                            <div
                                key={item}
                                className="bg-gradient-to-br from-green-500/20 to-emerald-700/20 border border-green-500/30 rounded-lg p-4 hover:border-green-400 transition-colors cursor-pointer"
                            >
                                <div className="text-5xl mb-2">{["⚡", "💰", "👑", "🚀", "🍀", "⏰", "✨", "🎁"][idx]}</div>
                                <h3 className="text-white font-bold text-sm">{item}</h3>
                                <div className="mt-2">
                                    <span className="text-green-400 font-bold text-sm">💵 ${(idx + 1) * 5}</span>
                                </div>
                                <button className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded transition-colors text-sm">
                                    Buy
                                </button>
                            </div>
                        ))}
                    </div>
                );
        }
    };
    return (
        <Drawer title="Shop" isOpen={isOpen} onClose={onClose} me={me} className="min-h-[100vh]">
            <div className="grid grid-cols-3 gap-4 mb-6 ">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-3 px-6 rounded-lg font-semibold text-lg transition-all ${
                            activeTab === tab.id
                                ? "bg-accent/20 text-accent border-2 border-accent"
                                : "bg-white/5 text-white/60 border-2 border-white/10 hover:bg-white/10 hover:text-white/80"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {renderContent()}
        </Drawer>
    );
}
