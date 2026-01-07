import type { ShopPack } from "../../../../common/pool-constants";

type PackCardProps = {
    pack: ShopPack;
    icon: "coin" | "cash";
};

export function ShopPackCard({ pack, icon }: PackCardProps) {
    return (
        <div className="relative flex justify-between items-center rounded-lg border-4 shadow-2xl p-3 gap-3 border-accent">
            {/* Tag */}
            {pack.tag && (
                <div
                    className={`absolute -left-2 -top-2 px-4 py-1 text-white font-bold text-sm italic uppercase shadow-lg transform -rotate-3 ${
                        pack.tag === "popular"
                            ? "bg-gradient-to-r from-red-600 to-red-500"
                            : "bg-gradient-to-r from-purple-600 to-purple-500"
                    }`}
                    style={{ clipPath: "polygon(0 0, 100% 0, 95% 100%, 5% 100%)" }}
                >
                    {pack.tag}
                </div>
            )}

            <div className=" min-w-24 text-end">
                <span className="text-white font-bold text-2xl drop-shadow-lg">{pack.base.toLocaleString()}</span>
            </div>
            <div className=" min-w-20 text-end">
                <span className="text-white font-bold text-2xl drop-shadow-lg">+</span>
            </div>
            <div className=" min-w-20 text-end">
                <span className="text-white font-bold text-2xl drop-shadow-lg"> {pack.bonusPercent}%</span>
            </div>
            <div className=" min-w-20 text-end">
                <span className="text-white font-bold text-2xl drop-shadow-lg">=</span>
            </div>
            <div className=" min-w-24 text-end">
                <span className="text-white font-bold text-2xl drop-shadow-lg">{pack.total.toLocaleString()}</span>
            </div>

            {/* Icon */}
            <div className="ml-2">{icon === "coin" ? "🪙" : "💵"}</div>

            {/* Price Display */}
            <div
                className="border-2 rounded px-3 py-2 min-w-24 text-center"
                style={{ background: "linear-gradient(to bottom, #1a1a1a, #0d0d0d)" }}
            >
                <span className="font-bold text-xl" style={{ color: "#10b981" }}>
                    {pack.price}
                </span>
            </div>

            {/* Buy Button */}
            <button
                className="text-white font-black text-xl px-8 py-3 rounded-lg border-4 shadow-lg transform transition-transform hover:scale-105 active:scale-95 italic"
                style={{
                    background: "linear-gradient(to bottom, #10b981, #059669)",
                    borderColor: "#047857",
                }}
            >
                Buy
            </button>
        </div>
    );
}
