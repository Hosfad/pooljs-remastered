"use client";

import React from "react";
import { Events } from "../../../../common/server-types";
import type { Player, Room } from "../../../../server";
import type { LocalService } from "../../../../services/local-service";
import type { MultiplayerService } from "../../../../services/multiplayer-service";

const COLORS = {
    primary: "#2C5530",
    dark: "#1A1A1A",
    accent: "#ffffff",
    text: "#ffffff",
};

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
                    justifyContent: "space-between",
                    padding: "1.5rem 20rem",
                }}
            >
                {/* Player 1 */}
                <PlayerAvatar
                    player={player1}
                    isActive={currentPlayerId === player1.id}
                    progress={progress}
                    ballType={player1Ball}
                />

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
                <PlayerAvatar
                    player={player2}
                    isActive={currentPlayerId === player2.id}
                    progress={progress}
                    ballType={player2Ball}
                />
            </div>
        )
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
    const size = 79;
    const strokeWidth = 4;
    const center = size / 2;
    const radius = center;
    const circumference = 2 * Math.PI * radius;

    const ballImage = ballType === "striped" ? `/assets/game/balls/12.svg` : `/assets/game/balls/1.svg`;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ position: "relative", width: `${size}px`, height: `${size}px` }}>
                {/* Animated Border */}
                {isActive && (
                    <svg
                        style={{
                            position: "absolute",
                            top: `-${strokeWidth / 2}px`,
                            left: `-${strokeWidth / 2}px`,
                            width: `${size + strokeWidth}px`,
                            height: `${size + strokeWidth}px`,
                            transform: "rotate(-90deg)",
                            pointerEvents: "none",
                        }}
                    >
                        <circle
                            cx={center + strokeWidth / 2}
                            cy={center + strokeWidth / 2}
                            r={radius}
                            fill="none"
                            stroke={`${COLORS.primary}40`}
                            strokeWidth={strokeWidth}
                        />
                        <circle
                            cx={center + strokeWidth / 2}
                            cy={center + strokeWidth / 2}
                            r={radius}
                            fill="none"
                            stroke="#FFD700"
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - progress / 100)}
                            strokeLinecap="round"
                            style={{ transition: "stroke-dashoffset 0.1s linear" }}
                        />
                    </svg>
                )}

                {/* Avatar */}
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        fontWeight: "bold",
                        backgroundColor: isActive ? COLORS.primary : `${COLORS.primary}80`,
                        color: COLORS.text,
                        backgroundImage: player.photo ? `url(${player.photo})` : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        zIndex: 1,
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {!player.photo && player.name.charAt(0).toUpperCase()}
                </div>
            </div>

            {/* Name Label with Ball Type */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                }}
            >
                <div
                    style={{
                        fontSize: "0.875rem",
                        fontWeight: isActive ? "600" : "500",
                        color: isActive ? COLORS.text : `${COLORS.text}cc`,
                    }}
                >
                    {player.name}
                </div>
                <div
                    style={{
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        fontWeight: "500",
                        letterSpacing: "0.5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                    }}
                >
                    <img
                        src={ballImage}
                        alt={ballType}
                        style={{
                            width: "16px",
                            height: "16px",
                            objectFit: "contain",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
