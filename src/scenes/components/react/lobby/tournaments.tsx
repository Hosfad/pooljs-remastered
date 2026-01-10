const Matchup = ({ player1, player2, className = "" }: any) => (
    <div className={`flex flex-col items-center gap-1 group relative z-10 ${className}`}>
        <div className="flex items-center bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-2 gap-3 transition-all group-hover:border-yellow-400/50 group-hover:scale-105">
            {/* Player 1 */}
            <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-800 rounded-full overflow-hidden">
                    <img src={player1?.photo ?? "/assets/avatars/2.png"} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-white/70 truncate w-12 text-center">{player1?.name || "TBD"}</span>
            </div>

            <div className="text-yellow-500 font-black italic text-sm">VS</div>

            {/* Player 2 */}
            <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-800 rounded-full overflow-hidden">
                    <img src={player2?.photo ?? "/assets/avatars/1.png"} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-white/70 truncate w-12 text-center">{player2?.name || "TBD"}</span>
            </div>
        </div>
    </div>
);

export function TournamentLobby() {
    return (
        <div
            style={{
                backgroundImage: `url(/assets/game/play-background.png)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
            }}
            className="w-full min-h-screen  text-white p-4 flex flex-col items-center justify-center"
        >
            <h1 className="text-4xl font-black italic tracking-tighter mb-16 uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                Tournament Bracket
            </h1>

            <div className="flex w-full  items-center justify-center">
                <div className="flex items-center">
                    <div className="flex flex-col gap-20 relative">
                        <div className="absolute top-1/2 -right-6 w-6 h-[calc(100%-3.5rem)] border-y border-r border-dark -translate-y-1/2 rounded-r-xl" />
                        <Matchup />
                        <Matchup />
                    </div>

                    <div className="w-12 h-px bg-dark" />

                    {/* Semi Final Left */}
                    <div className="relative">
                        <Matchup />
                    </div>
                </div>
                <div className="flex flex-col items-center px-12 relative">
                    <div className="absolute -top-20 text-5xl drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">🏆</div>
                    <p className="text-yellow-500 font-bold tracking-[0.3em] uppercase text-[10px] mb-6">Grand Final</p>
                    <div className="scale-150">
                        <Matchup />
                    </div>
                </div>

                <div className="flex items-center">
                    <div className="relative">
                        <Matchup />
                    </div>

                    <div className="w-12 h-px bg-dark" />

                    <div className="flex flex-col gap-20 relative">
                        <div className="absolute top-1/2 -left-6 w-6 h-[calc(100%-3.5rem)] border-y border-l border-dark -translate-y-1/2 rounded-l-xl" />
                        <Matchup />
                        <Matchup />
                    </div>
                </div>
            </div>

            <div className="mt-20 flex flex-col items-center gap-2">
                <span className="text-white/30 uppercase text-xs tracking-widest font-bold">Total Prize Pool</span>
                <h1 className="text-3xl font-black italic tracking-tighter uppercase">
                    🪙 <span className="text-yellow-500">50,000</span>
                </h1>
            </div>
        </div>
    );
}
