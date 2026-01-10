import { Experience } from "../../../../common";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { Drawer } from "../ui/drawer";

export function ProfileDrawer({
    isOpen,
    onClose,
    service,
}: {
    isOpen: boolean;
    onClose: () => void;
    service: MultiplayerService;
}) {
    const me = service.me();
    if (!me) return null;

    const {
        progress: { exp: expProgress, percent: expPercentage, totalExp: totalExp, remaining: remainingExp },
    } = Experience.getUserLevelInfo(me.exp);

    const trophiesPercentage = (1 / 8) * 100;

    const StatRow = ({ label, value, label2, value2 }: any) => (
        <div className="flex justify-between items-center text-sm italic font-semibold">
            <div className="flex-1 flex justify-between pr-8 border-r border-white/10">
                <span className="text-white">{label} :</span>
                <span className="text-yellow-400">{value}</span>
            </div>
            <div className="flex-1 flex justify-between pl-8">
                <span className="text-white">{label2} :</span>
                <span className="text-yellow-400">{value2}</span>
            </div>
        </div>
    );

    return (
        <Drawer title="Player Profile" isOpen={isOpen} onClose={onClose} me={me}>
            <div className="flex flex-col gap-4  p-4 rounded-lg  shadow-2xl">
                <div className="grid grid-cols-12 gap-4">
                    {/* Left Section: Avatar & Name */}
                    <div className="h-full col-span-4 flex flex-col items-center justify-center rounded-lg p-4 border bg-accent/10 border-white/10">
                        <div className="relative p-1  rounded-xl">
                            <img src={me.photo} alt="avatar" className="w-32 h-32 object-cover rounded-xl" />
                        </div>
                        <h2 className="text-2xl font-bold italic text-white mt-4">{me.name}</h2>
                    </div>

                    <div className="col-span-8  space-y-4">
                        <div className="h-fit flex gap-4">
                            <div className="flex-1  p-4 rounded-md bg-accent/10 border border-white/10">
                                <p className="text-xs italic text-white mb-1">Level progress:</p>
                                <div className="relative h-7 bg-accent/20 rounded-sm overflow-hidden ">
                                    <div className="absolute inset-0 flex items-center justify-center z-10 text-xs italic font-bold text-white">
                                        {expProgress}/{totalExp}
                                    </div>

                                    <div className="absolute right-2 top-1 text-orange-500 text-sm">⭐</div>

                                    <div
                                        className="h-full bg-gradient-to-r from-lime-400 to-green-600"
                                        style={{ width: `${expPercentage}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex-1  p-4 rounded-md bg-accent/10 border border-white/10">
                                <p className="text-xs italic text-white mb-1">Trophies:</p>
                                <div className="relative h-7 bg-accent/20 rounded-sm overflow-hidden ">
                                    <div className="absolute inset-0 flex items-center justify-center z-10 text-xs italic font-bold text-white">
                                        1/8
                                    </div>

                                    <div className="absolute right-2  top-1 text-orange-500 text-sm">🏆</div>

                                    <div
                                        className="h-full bg-gradient-to-r from-lime-400 to-green-600"
                                        style={{ width: `${trophiesPercentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-auto p-3 rounded-md border bg-accent/10 border-white/10 space-y-3">
                            <p className="text-xs italic text-white">Player Stats:</p>
                            <StatRow label="Total Winnings" value={me.coins} label2="Coins Wallet" value2="0" />
                            <StatRow label="Game Won" value="1/1" label2="Win Streak" value2="0" />
                            <StatRow label="Championship Won" value="0/0" label2="Win Percentage" value2="0" />
                        </div>
                    </div>
                </div>

                <div className=" p-4 rounded-md border bg-accent/10 border-white/10">
                    <p className="text-xs italic text-white mb-4">Achievements:</p>
                    <div className="flex justify-around ">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-20 h-20  rounded-full  flex items-center justify-center text-3xl">
                                💍
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-[10px] italic text-accent mt-2">UserID: {me.id}</p>
            </div>
        </Drawer>
    );
}
