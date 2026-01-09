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
    const settings = service.getSettings();
    const me = service.me();
    const [selectedCue, setSelectedCue] = useState<CueId | null>(settings.selectedCue ?? "basic");

    const handleCueSelect = (cue: CueInfo) => {
        if (!me.ownedCues.includes(cue.id)) return;
        setSelectedCue(cue.id);
        service.setSettings({ selectedCue: cue.id });
    };

    const renderCueList = (category: string) => {
        const filtered = cues.filter((cue) => cue.category === category);
        if (filtered.length === 0) {
            return <div className="text-center py-12 text-white/40">No cues in this category</div>;
        }
        return (
            <div className="space-y-4">
                {filtered.map((cue) => (
                    <CueCard
                        key={cue.id}
                        cue={cue}
                        owned={me.ownedCues.includes(cue.id)}
                        onSelect={handleCueSelect}
                        isSelected={selectedCue === cue.id}
                    />
                ))}
            </div>
        );
    };

    const tabData = [
        { id: "standard", label: "Standard", content: renderCueList("standard") },
        { id: "won", label: "Won", content: renderCueList("won") },
        { id: "owned", label: "Owned", content: renderCueList("owned") },
    ];

    return <Drawer title="Cues" isOpen={isOpen} onClose={onClose} me={me} tabs={tabData} />;
}
