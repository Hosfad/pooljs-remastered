"use client";

import React from "react";
import { COLORS } from "../../../../common/pool-constants";
import { Events } from "../../../../common/server-types";
import type { Player, Room } from "../../../../server";
import type { LocalService } from "../../../../services/local-service";
import type { MultiplayerService } from "../../../../services/multiplayer-service";

const ROUND_TIME = 30;

export function GameInfoWidget({ service }: { service: MultiplayerService | LocalService }) {
    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());

    React.useEffect(() => {
        service.subscribe(Events.INIT, (data) => {
            setRoom(data);
        });
        service.subscribe(Events.UPDATE_ROOM, (data) => setRoom(data));
    }, []);

    const [timeLeft, setTimeLeft] = React.useState(ROUND_TIME);

    React.useEffect(() => {
        if (!room) return;
        setTimeLeft(ROUND_TIME);
        const interval = setInterval(() => setTimeLeft(service.timerLeft()), 200);
        return () => clearInterval(interval);
    }, [room]);

    const progress = (timeLeft / ROUND_TIME) * 100;
    const players = room?.players ?? [];

    const player1 = players[0];
    const player2 = players[1];

    if (!player1 || !player2) return null;

    const imHost = room?.hostId === service.me()?.id;
    const whenHost = [player2.id, player1.id];
    const whenGuest = [player1.id, player2.id];

    const turn = +service.isMyTurn();
    const currentPlayerId = imHost ? whenHost[turn] : whenGuest[turn];

    const player1Ball = player1.state.ballType;
    const player2Ball = player2.state.ballType;
    return (
        room?.isGameStarted && (
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    inset: 0,
                    maxHeight: "10%",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "1.5rem 20rem",
                }}
            >
                {/* Player 1 */}
                <PlayerHUD player={player1} isActive={currentPlayerId === player1.id} progress={progress} />

                {/* Center Info */}
                <div
                    style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "0 2rem",
                    }}
                >
                    <div
                        style={{
                            fontSize: "3rem",
                            fontWeight: "bold",
                            color: COLORS.text,
                            fontFamily: "monospace",
                            marginBottom: "0.25rem",
                        }}
                    >
                        {String(timeLeft).padStart(2, "0")}s
                    </div>
                    <div
                        style={{
                            fontSize: "0.875rem",
                            color: `${COLORS.accent}cc`,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                        }}
                    >
                        {currentPlayerId === player1.id ? player1.name : player2.name}'s Turn
                    </div>
                </div>

                {/* Player 2 */}
                <PlayerHUD player={player2} isActive={currentPlayerId === player2.id} progress={progress} reverse={true} />
            </div>
        )
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
    const scoredBalls = [1, 2, 3, 4, 5, 6];

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", direction: reverse ? "rtl" : "ltr" }}>
            <PlayerAvatar player={player} isActive={isActive} progress={progress} ballType={player.state.ballType} />

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span
                    style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: isActive ? COLORS.text : `${COLORS.text}aa`,
                    }}
                >
                    {player.name}
                </span>

                {/* Scored balls */}
                <div style={{ display: "flex", gap: "4px" }}>
                    {scoredBalls.map((ball) => (
                        <img
                            key={ball}
                            src={`/assets/game/balls/${ball}.svg`}
                            alt={`Ball ${ball}`}
                            style={{
                                width: 18,
                                height: 18,
                                opacity: isActive ? 1 : 0.6,
                                filter: "drop-shadow(0 0 2px rgba(0,0,0,0.8))",
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function PlayerAvatar({
    player,
    isActive,
    progress,
    ballType,
}: {
    player: Player;
    isActive: boolean;
    progress: number;
    ballType: string;
}) {
    const size = 78;
    const strokeWidth = 4;
    const cornerRadius = 12;

    const perimeter = 4 * size - 8 * cornerRadius + 2 * Math.PI * cornerRadius;
    const dashOffset = perimeter * (1 - progress / 100);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ position: "relative", width: size, height: size }}>
                {/* Animated Border */}
                {isActive && (
                    <svg
                        width={size + strokeWidth}
                        height={size + strokeWidth}
                        style={{
                            position: "absolute",
                            top: -strokeWidth / 2,
                            left: -strokeWidth / 2,
                            pointerEvents: "none",
                        }}
                    >
                        {/* Background border */}
                        <rect
                            x={strokeWidth / 2}
                            y={strokeWidth / 2}
                            width={size}
                            height={size}
                            rx={cornerRadius}
                            fill="none"
                            stroke={`${COLORS.primary}40`}
                            strokeWidth={strokeWidth}
                        />

                        {/* Animated progress */}
                        <rect
                            x={strokeWidth / 2}
                            y={strokeWidth / 2}
                            width={size}
                            height={size}
                            rx={cornerRadius}
                            fill="none"
                            stroke="#FFD700"
                            strokeWidth={strokeWidth}
                            strokeDasharray={perimeter}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            style={{
                                transition: "stroke-dashoffset 0.15s linear",
                            }}
                        />
                    </svg>
                )}

                {/* Avatar */}
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: cornerRadius,
                        backgroundColor: isActive ? COLORS.primary : `${COLORS.primary}70`,
                        backgroundImage: player.photo ? `url(${player.photo})` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        fontWeight: 700,
                        color: COLORS.text,
                        position: "relative",
                        zIndex: 1,
                        boxShadow: isActive ? "0 0 12px rgba(255,215,0,0.45)" : "none",
                    }}
                >
                    {!player.photo && player.name[0]!.toUpperCase()}
                </div>
            </div>
        </div>
    );
}
