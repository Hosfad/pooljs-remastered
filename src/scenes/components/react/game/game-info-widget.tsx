"use client";

import { useEffect, useState } from "react";
import { type PoolState } from "../../../../common/server-types";
import type { Player, Room } from "../../../../server";
import type { MultiplayerService } from "../../../../services/multiplayer-service";
import { useUI } from "../provider";

const ROUND_TIME = 30;
const SCALED_BALL_SIZE = 22;

export function GameInfoWidget({ room, service }: { room: Room; service: MultiplayerService }) {
    const [state, setState] = useState<PoolState | null>(service.getState());
    const [timeLeft, setTimeLeft] = useState(ROUND_TIME);

    useEffect(() => {
        if (!room) return;
        setTimeLeft(ROUND_TIME);
        const interval = setInterval(() => setTimeLeft(service.timerLeft()), 200);
        return () => clearInterval(interval);
    }, [room, service]);

    if (!room?.isGameStarted || !room.players[0] || !room.players[1]) return null;

    const players = room.players;
    const imHost = room.hostId === service.me()?.id;
    const turn = +service.isMyTurn();

    const player1 = players[0];
    const player2 = players[1];
    if (!player1 || !player2) return null;

    const currentPlayerId = imHost ? [player2.id, player1.id][turn] : [player1.id, player2.id][turn];
    const progress = (timeLeft / ROUND_TIME) * 100;

    return (
        <div className="fixed top-2 left-0 right-0 flex justify-center items-start px-8 pointer-events-none">
            <style>{`
                @keyframes ballDropHorizontal {
                    0% { transform: scale(1.5) translateY(-20px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .ball-drop { animation: ballDropHorizontal 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .bg-dark { background-color: #1a1a1a; }
            `}</style>

            <div className="flex items-center gap-12 bg-black/20 backdrop-blur-sm p-4 rounded-3xl border border-white/5 shadow-2xl pointer-events-auto">
                <PlayerHUD player={player1} isActive={currentPlayerId === player1.id} progress={progress} />

                {/* Center Timer Section */}
                <div className="flex flex-col items-center min-w-[100px]">
                    <div className="text-white/50 text-[10px] uppercase tracking-widest mb-1 font-bold">Time Left</div>
                    <div className="text-3xl font-mono font-bold text-white tabular-nums drop-shadow-md">
                        {Math.ceil(timeLeft)}s
                    </div>
                </div>

                <PlayerHUD player={player2} isActive={currentPlayerId === player2.id} progress={progress} reverse />
            </div>
        </div>
    );
}

function PlayerHUD({
    player,
    isActive,
    progress,
    reverse,
}: {
    player: Player;
    isActive: boolean;
    progress: number;
    reverse?: boolean;
}) {
    const getPlayerBalls = (player: Player) => {
        const ballType = player.state.ballType;
        if (!ballType) return [];
        return ballType === "solid"
            ? Array.from({ length: 7 }, (_, i) => i + 1)
            : Array.from({ length: 7 }, (_, i) => i + 9);
    };

    const playerBalls = getPlayerBalls(player);
    const { pocketedBalls } = useUI();

    return (
        <div className={`flex items-center gap-4 ${reverse ? "flex-row-reverse" : "flex-row"}`}>
            <PlayerAvatar player={player} isActive={isActive} progress={progress} />

            <div className={`flex flex-col ${reverse ? "items-end" : "items-start"}`}>
                <span className={`text-sm font-bold mb-2 ${isActive ? "text-white" : "text-white/40"}`}>{player.name}</span>

                <div className="relative h-10 px-3 flex items-center bg-dark rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] border border-white/5 min-w-[80%]">
                    <div className="absolute inset-x-4 h-[2px] bg-white/5 top-1/2 -translate-y-1/2 rounded-full" />

                    <div className={`flex gap-1 relative ${reverse ? "flex-row-reverse" : "flex-row"}`}>
                        {playerBalls.map((ballNumber: number) => {
                            const isScored = pocketedBalls.findIndex((b) => b.number === ballNumber) !== -1;

                            return (
                                <img
                                    key={ballNumber}
                                    src={`/assets/game/balls/${ballNumber}.svg`}
                                    className={`
                                        ball-drop shadow-lg transition-all duration-500
                                        ${isScored ? "opacity-90 mix-blend-multiply" : "opacity-100"}
                                    `}
                                    style={{ width: SCALED_BALL_SIZE, height: SCALED_BALL_SIZE }}
                                    alt={`Ball ${ballNumber}`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlayerAvatar({ player, isActive, progress }: any) {
    const size = 64;
    const strokeWidth = 2;
    const cornerRadius = 16;
    const perimeter = 4 * size - 8 * cornerRadius + 2 * Math.PI * cornerRadius;
    const dashOffset = perimeter * (1 - progress / 100);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            {/* Animated Progress Border */}
            <svg
                width={size + strokeWidth * 2}
                height={size + strokeWidth * 2}
                className="absolute"
                style={{ top: -strokeWidth, left: -strokeWidth, transform: "rotate(-90deg)" }}
            >
                {isActive && (
                    <rect
                        x={strokeWidth}
                        y={strokeWidth}
                        width={size}
                        height={size}
                        rx={cornerRadius}
                        fill="none"
                        stroke="#FFD700"
                        strokeWidth={strokeWidth}
                        strokeDasharray={perimeter}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        className="transition-all duration-200 linear"
                    />
                )}
            </svg>

            {/* Avatar Content */}
            <div
                className={`w-full h-full rounded-2xl overflow-hidden flex items-center justify-center text-xl font-bold transition-all duration-500
                    ${isActive ? " shadow-[0_0_15px_rgba(255,215,0,0.3)] " : "border-white/10 opacity-60"}`}
                style={{
                    backgroundColor: "#222",
                    backgroundImage: player.photo ? `url(${player.photo})` : "none",
                    backgroundSize: "cover",
                }}
            >
                {!player.photo && player.name[0]?.toUpperCase()}
            </div>
        </div>
    );
}
