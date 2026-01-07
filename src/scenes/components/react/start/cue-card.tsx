import type { CueInfo } from "../../../../common/pool-constants";

export function StatBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
    return (
        <div className="flex items-center gap-6">
            <span className="text-white/80 text-sm font-medium w-12">{label}</span>
            <div className="flex gap-1">
                {Array.from({ length: max }).map((_, i) => (
                    <div key={i} className={`w-3 h-5 rounded-sm ${i < value ? "bg-accent" : "bg-white/10"}`} />
                ))}
            </div>
        </div>
    );
}
export function CueCard({
    cue,
    onSelect,
    owned,
    isSelected,
}: {
    cue: CueInfo;
    onSelect: (cue: CueInfo) => void;
    owned: boolean;
    isSelected: boolean;
}) {
    return (
        <div
            className={`border-2 rounded-lg p-4   ${
                isSelected ? "border-accent bg-accent/10" : "border-white/20 bg-white/5 hover:border-accent/40"
            }`}
        >
            <div
                className="flex items-center gap-4 mb-4"
                style={{
                    backgroundImage: `url(${cue.sprite})`,
                    backgroundSize: "70% 90%", // Shrink the image slightly                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            >
                <div className="flex-1 space-y-2">
                    <h3 className="text-white font-semibold text-lg mb-3">{cue.id.toUpperCase()}</h3>
                    <StatBar label="Power" value={cue.power / 10} />
                    <StatBar label="Accuracy" value={cue.accuracy / 10} />
                    <StatBar label="Spin" value={cue.spin / 10} />
                </div>

                <div className="flex-shrink-0">
                    <button
                        onClick={() => {
                            onSelect(cue);
                        }}
                        className="bg-accent/20 hover:cursor-pointer hover:bg-accent/30 text-accent px-6 py-3 rounded-lg font-semibold border-2 border-accent/40 hover:border-accent/60 transition-all"
                    >
                        {owned
                            ? isSelected
                                ? "Equipped"
                                : "Equip"
                            : `${cue.price.cash ? `💵 ${cue.price.cash}` : `🪙 ${cue.price.coins}`}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
