import { useState } from "react";
import { CUE_DATA, type CueId, type CueInfo } from "../../../../common/pool-constants";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { Drawer } from "../ui/drawer";
import { CueCard } from "./cue-card";

export function CuesDrawer({
    isOpen,
    onClose,
    cues = Object.values(CUE_DATA),
    service,
}: {
    isOpen: boolean;
    onClose: () => void;
    cues?: CueInfo[];
    service: MultiplayerService;
}) {
    const [activeTab, setActiveTab] = useState<"standard" | "won" | "owned">("standard");

    const tabs = [
        { id: "standard" as const, label: "Standard" },
        { id: "won" as const, label: "Won" },
        { id: "owned" as const, label: "Owned" },
    ];

    const filteredCues = cues.filter((cue) => cue.category === activeTab);
    const settings = service.getSettings();

    const me = service.me();
    const [selectedCue, setSelectedCue] = useState<CueId | null>(settings.selectedCue ?? "basic");
    const handleCueSelect = (cue: CueInfo) => {
        setSelectedCue(cue.id);
        service.setSettings({
            selectedCue: cue.id,
        });
    };

    return (
        <Drawer title="Cues" isOpen={isOpen} onClose={onClose}>
            <div className="grid grid-cols-3 gap-4 mb-6">
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

            <div className="space-y-4">
                {filteredCues.length > 0 ? (
                    filteredCues.map((cue) => (
                        <CueCard
                            key={cue.id}
                            cue={cue}
                            owned={me.ownedCues.includes(cue.id)}
                            onSelect={handleCueSelect}
                            isSelected={selectedCue === cue.id}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 text-white/40">No cues in this category</div>
                )}
            </div>
        </Drawer>
    );
}
