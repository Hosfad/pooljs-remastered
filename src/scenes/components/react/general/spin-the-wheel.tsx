import { useState } from "react";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { Button } from "../ui/button";
import { Drawer, type Tab } from "../ui/drawer";

export interface Reward {
    id: string;
    label: string;
    color: string;
    value: number;
    type: "coins" | "cash" | "cue_skin" | "xp";
}

const REWARDS: Reward[] = [
    { id: "1", label: "100 🪙", color: "#eab308", value: 100, type: "coins" },
    { id: "2", label: "5 💵", color: "#ec4899", value: 5, type: "cash" },
    { id: "3", label: "500 🪙", color: "#eab308", value: 500, type: "coins" },
    { id: "4", label: "XP ⚡︎", color: "#3b82f6", value: 2, type: "xp" },
    { id: "5", label: "1000 🪙", color: "#eab308", value: 1000, type: "coins" },
    { id: "6", label: "Rare Cue 🎱", color: "#a855f7", value: 1, type: "cue_skin" },
];

export function RewardWheelDrawer({
    isOpen,
    onClose,
    service,
}: {
    isOpen: boolean;
    onClose: () => void;
    service: MultiplayerService;
}) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [wonReward, setWonReward] = useState<Reward | null>(null);

    const [availableSpins, setAvailableSpins] = useState(10);

    const spinWheel = () => {
        if (isSpinning) return;

        setIsSpinning(true);
        setWonReward(null);

        const extraDegree = Math.floor(Math.random() * 360);
        const totalSpins = 1800 + extraDegree;
        const newRotation = rotation + totalSpins;

        setRotation(newRotation);

        setTimeout(() => {
            setIsSpinning(false);
            const actualDegree = newRotation % 360;
            const sliceSize = 360 / REWARDS.length;
            const index = Math.floor(((360 - (actualDegree % 360)) % 360) / sliceSize);

            const reward = REWARDS[index];
            setWonReward(reward!);
        }, 3500);
    };

    const tabs: Tab[] = [
        {
            id: "wheel",
            label: "🎠 Wheel",
            content: (
                <div className="grid  grid-cols-1 md:grid-cols-2 gap-8 px-6 items-center max-w-4xl mx-auto">
                    <div className="flex justify-center relative py-4">
                        <div
                            className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-0 h-0 
                        border-l-[12px] border-l-transparent 
                        border-r-[12px] border-r-transparent 
                        border-t-[24px] border-t-accent drop-shadow-md"
                        />

                        <div
                            className="w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden transition-transform duration-[3500ms] cubic-bezier(0.15, 0, 0.15, 1)"
                            style={{ transform: `rotate(${rotation}deg)` }}
                        >
                            {REWARDS.map((reward, i) => {
                                const angle = 360 / REWARDS.length;
                                return (
                                    <div
                                        key={reward.id}
                                        className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left border-l border-white/10"
                                        style={{
                                            transform: `rotate(${i * angle}deg) skewY(${angle - 90}deg)`,
                                            backgroundColor: reward.color,
                                        }}
                                    >
                                        <div
                                            className="absolute bottom-6 left-6 font-bold text-black text-[10px] md:text-xs uppercase tracking-tighter"
                                            style={{
                                                transform: `rotate(45deg) skewY(${90 - angle}deg)`,
                                                width: "60px",
                                            }}
                                        >
                                            {reward.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-inner z-10 border-4 border-gray-800" />
                    </div>

                    <div className="flex flex-col space-y-6 text-center md:text-left">
                        <div>
                            <h2 className="text-3xl font-black text-white italic tracking-wider">LUCKY WHEEL</h2>
                            <p className="text-white/60 text-sm">
                                Spins available: <span className="text-accent font-bold">{availableSpins}</span>
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 min-h-[120px] flex flex-col justify-center">
                            {wonReward ? (
                                <div className="animate-in zoom-in duration-300">
                                    <p className="text-accent uppercase text-xs font-bold tracking-widest">You Won</p>
                                    <h3 className="text-white text-3xl font-black uppercase">{wonReward.label}</h3>
                                </div>
                            ) : availableSpins > 0 ? (
                                <p className="text-white/80">
                                    Try your luck! You could win <span className="text-yellow-400">Rare Cues</span> or{" "}
                                    <span className="text-green-400">1000 Coins</span>.
                                </p>
                            ) : (
                                <p className="text-white/40 italic">You've used your spin for today. Come back tomorrow!</p>
                            )}
                        </div>

                        <Button
                            onClick={spinWheel}
                            variant={"dark"}
                            className="w-full py-8 text-xl font-black shadow-lg uppercase"
                            disabled={isSpinning || availableSpins <= 0}
                        >
                            {isSpinning ? "Spinning..." : availableSpins > 0 ? "Spin Now" : "Locked"}
                        </Button>

                        {!isSpinning && availableSpins === 0 && (
                            <p className="text-[10px] text-center text-white/30 uppercase tracking-widest">
                                Resets at Midnight
                            </p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: "rewards",
            label: "🎁 Rewards",
            content: <></>,
        },
    ];
    return (
        <Drawer
            tabs={tabs}
            title="Daily Rewards"
            isOpen={isOpen}
            onClose={onClose}
            me={service.me()}
            className="min-h-[70vh]"
        ></Drawer>
    );
}
