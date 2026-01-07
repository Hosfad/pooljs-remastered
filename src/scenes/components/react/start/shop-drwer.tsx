import { useState } from "react";
import { CASH_PACKS, COIN_PACKS, CUE_DATA } from "../../../../common/pool-constants";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { Drawer } from "../ui/drawer";
import { CueCard } from "./cue-card";
import { ShopPackCard } from "./shop-pack-card";

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
        { id: "cues" as const, label: "🎱 Cues" },
        { id: "coins" as const, label: "🪙 Coins" },
        { id: "cash" as const, label: "💵 Cash" },
    ];

    const me = service.me();
    const cues = Object.values(CUE_DATA).filter((cue) => !me.ownedCues.includes(cue.id));
    const [selectedCue, setSelectedCue] = useState<string | null>(me.selectedCue);

    const renderContent = () => {
        switch (activeTab) {
            case "cues":
                return (
                    <div className="space-y-4">
                        {cues.length > 0 ? (
                            cues.map((cue) => (
                                <CueCard
                                    key={cue.id}
                                    cue={cue}
                                    owned={me.ownedCues.includes(cue.id)}
                                    onSelect={() => console.log("Selected cue")}
                                    isSelected={selectedCue === cue.id}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12 text-white/40">No cues found</div>
                        )}
                    </div>
                );
            case "coins":
                return (
                    <div className="space-y-4 mt-20 flex flex-col w-fit mx-auto">
                        {COIN_PACKS.map((pack) => (
                            <ShopPackCard key={pack.id} pack={pack} icon="coin" />
                        ))}
                    </div>
                );
            case "cash":
                return (
                    <div className="space-y-4 mt-20 flex flex-col w-fit mx-auto">
                        {CASH_PACKS.map((pack) => (
                            <ShopPackCard key={pack.id} pack={pack} icon="cash" />
                        ))}
                    </div>
                );
        }
    };
    return (
        <Drawer title="Shop" isOpen={isOpen} onClose={onClose} me={me} className="min-h-[100vh]">
            <div className="grid grid-cols-3  mb-6 ">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        disabled={tab.id !== "cues"}
                        className={`py-3 px-6 rounded-lg font-semibold text-lg rounded-none transition-all ${
                            activeTab === tab.id
                                ? "bg-accent/20 text-accent border-2 border-accent"
                                : "bg-white/5 text-white/60 border-2 border-white/10 hover:bg-accent/10 hover:text-accent/80"
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
