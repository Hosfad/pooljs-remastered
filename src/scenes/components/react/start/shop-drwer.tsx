import { useState } from "react";
import { CASH_PACKS, COIN_PACKS, CUE_DATA } from "../../../../common/pool-constants";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { Drawer, type Tab } from "../ui/drawer";
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
    const me = service.me();
    const cues = Object.values(CUE_DATA).filter((cue) => !me.ownedCues.includes(cue.id));
    const [selectedCue, setSelectedCue] = useState<string | null>(me.selectedCue);

    const shopTabs: Tab[] = [
        {
            id: "cues",
            label: "🎱 Cues",
            content: (
                <div className="space-y-4">
                    {cues.length > 0 ? (
                        cues.map((cue) => (
                            <CueCard
                                key={cue.id}
                                cue={cue}
                                owned={false}
                                onSelect={() => console.log("Selected cue for purchase")}
                                isSelected={selectedCue === cue.id}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 text-white/40">No cues found</div>
                    )}
                </div>
            ),
        },
        {
            id: "coins",
            label: "🪙 Coins",
            disabled: true,
            content: (
                <div className="space-y-4 mt-12 flex flex-col w-fit mx-auto">
                    {COIN_PACKS.map((pack) => (
                        <ShopPackCard key={pack.id} pack={pack} icon="coin" />
                    ))}
                </div>
            ),
        },
        {
            id: "cash",
            label: "💵 Cash",
            disabled: true,
            content: (
                <div className="space-y-4 mt-12 flex flex-col w-fit mx-auto">
                    {CASH_PACKS.map((pack) => (
                        <ShopPackCard key={pack.id} pack={pack} icon="cash" />
                    ))}
                </div>
            ),
        },
    ];

    return <Drawer title="Shop" isOpen={isOpen} onClose={onClose} me={me} tabs={shopTabs} className="min-h-[100vh]" />;
}
