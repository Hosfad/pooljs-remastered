"use client";

import React from "react";
import { Events } from "../../../common/server-types";
import type { Room } from "../../../server";
import type { MultiplayerService } from "../../../services/multiplayer-service.tsx";
import { Button } from "./button.tsx";

export function PoolLobby({ service }: { service: MultiplayerService }) {
    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());
    const [visible, setVisible] = React.useState(true);
    const [lobbyState, setLobbyState] = React.useState<"lobby" | "matchmaking">("lobby");

    React.useEffect(() => {
        const lockOrientation = async () => {
            if (window.screen.orientation && "lock" in window.screen.orientation) {
                try {
                    // @ts-ignore
                    await window.screen.orientation.lock("landscape");
                } catch (err) {
                    console.log("Orientation lock not supported or failed:", err);
                }
            }
        };

        if (window.innerWidth < 768) {
            lockOrientation();
        }
    }, []);

    React.useEffect(() => {
        service.listen(Events.JOIN_ROOM_RESPONSE, (input) => {
            setVisible(true);
            const { type } = input;
            const roomIdFromUrl = service.getRoomId();

            if (type === "error") {
                const { code: errCode, message: errMessage } = input;
                setVisible(false);
                return console.error("Error joining room", errCode, errMessage);
            }

            const room = input.data;
            service.instanciateRoom(room);
            setRoom(room);

            if (roomIdFromUrl !== room.id) {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set("room", room.id);
                window.history.replaceState({}, "", newUrl.toString());
            }
        });

        service.listen(Events.MATCH_MAKE_START_RESPONSE, (input) => {
            const { type } = input;
            if (type === "error") {
                return console.error("Error starting matchmaking", input);
            }
            setLobbyState("matchmaking");
        });

        service.listen(Events.MATCH_MAKE_CANCEL_RESPONSE, (input) => {
            const { type } = input;
            if (type === "error") {
                return console.error("Error cancelling matchmaking", input);
            }
            setLobbyState("lobby");
        });

        service.listen(Events.INIT, (input) => {
            setVisible(false);
        });
    }, [service]);

    const handleInvite = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Invite link copied to clipboard!");
    };
    const players = room?.players ?? [];
    const currentPlayer = service.me();

    const handleStartMatchmaking = () => {
        if (!room) return;
        if (currentPlayer?.userId !== room.hostId) return alert("Only the host can start matchmaking");

        if (players.length >= 2) return;
        service.call(Events.MATCH_MAKE_START, { userId: currentPlayer.userId, roomId: room.id });
    };

    const handleCancelMatchmaking = () => {
        if (!room || !currentPlayer) return;
        service.call(Events.MATCH_MAKE_CANCEL, { userId: currentPlayer.userId, roomId: room.id });
    };

    const currentPlayerIsHost = currentPlayer?.userId === room?.hostId;

    const maxPlayers = 2;
    const emptySlots = maxPlayers - players.length;

    const handleStart = () => {
        if (!room) return;
        if (currentPlayer?.userId !== room.hostId) return alert("Only the host can start the game");
        if (players.length < 2) return alert("At least 2 players are required");

        service.call(Events.START_GAME, { userId: currentPlayer.userId, roomId: room.id });
    };

    return (
        visible && (
            <div className="w-full h-screen flex items-center justify-center p-1 bg-primary overflow-hidden">
                <div className="w-full max-w-4xl h-full flex flex-col justify-center">
                    <div className="flex flex-col md:justify-between bg-primary rounded-xl md:p-8 p-2 md:border-12 md:border-dark md:shadow-2xl relative md:-mt-0 -mt-10  h-[75vh] md:h-[40vh] ">
                        <div className="mb-1.5 sm:mb-2  ">
                            <div className="text-start mb-2">
                                <h1 className="text-3xl  font-bold mb-0.5 text-text truncate">Pool Game Lobby</h1>
                                <p className="text-lg text-accent truncate">Set up your game and invite players</p>
                            </div>
                            {lobbyState === "matchmaking" ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    <MatchmakingAnimation />
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col landscape:flex-row gap-2 md:min-h-[10vh] min-h-[20vh]">
                                        <div className="flex-1 rounded-lg bg-dark/30 border border-dark landscape:flex landscape:flex-col landscape:justify-center">
                                            <div className="p-2 flex items-center flex-col justify-center">
                                                <div className="flex-shrink-0 mb-2">
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold bg-dark text-accent">
                                                        {currentPlayer?.name.charAt(0).toUpperCase() || "H"}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-center min-w-0 gap-2">
                                                    <input
                                                        id="host-name"
                                                        type="text"
                                                        placeholder="Enter your name"
                                                        defaultValue={currentPlayer?.name}
                                                        className=" px-1 py-0.5 sm:px-1.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium outline-none bg-dark text-text border border-dark"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 ">
                                            <div className="grid grid-cols-2 gap-1 h-full ">
                                                {players.map((player) => (
                                                    <div
                                                        key={player.id}
                                                        className="flex flex-col h-full items-center justify-center gap-0.5 p-1 rounded-lg bg-dark/40 border border-dark"
                                                    >
                                                        <div className="w-10 h-10   rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-bold bg-dark text-pri">
                                                            {player.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-[8px] sm:text-[9px] font-medium text-center text-text/90 truncate w-full">
                                                            {player.name}
                                                        </span>
                                                    </div>
                                                ))}

                                                {Array.from({ length: emptySlots }).map((_, index) => (
                                                    <div
                                                        key={`empty-${index}`}
                                                        className="flex flex-col items-center justify-center gap-0.5 p-1 rounded-lg border border-dashed border-dark/50"
                                                    >
                                                        <div className="w-10 h-10  rounded-full flex items-center justify-center bg-dark/60 border border-dashed border-dark/60">
                                                            <span className="text-xs sm:text-sm text-text/60">?</span>
                                                        </div>
                                                        <span className="text-[8px] sm:text-[9px] text-text/60">
                                                            Waiting...
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                disabled={lobbyState === "matchmaking"}
                                onClick={handleInvite}
                                variant="primary"
                                className="flex-1 min-w-0 text-[10px] sm:text-xs py-1 px-0.5"
                            >
                                Copy Invite
                            </Button>

                            <Button
                                onClick={handleStart}
                                disabled={!currentPlayerIsHost || players.length < 2 || lobbyState === "matchmaking"}
                                variant="dark"
                                className="flex-1 min-w-0 text-[10px] sm:text-xs py-1 px-0.5"
                            >
                                {currentPlayerIsHost ? "Start Game" : "Waiting for host to start"}
                            </Button>

                            <Button
                                disabled={!currentPlayerIsHost || players.length >= 2}
                                variant="dark"
                                onClick={lobbyState === "matchmaking" ? handleCancelMatchmaking : handleStartMatchmaking}
                                className="col-span-2 text-[10px] sm:text-xs py-1"
                            >
                                {lobbyState === "matchmaking" ? "Cancel Matchmaking" : "Find Online"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    );
}

export function MatchmakingAnimation() {
    const [dots, setDots] = React.useState("");

    React.useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => {
                if (prev.length >= 3) return "";
                return prev + ".";
            });
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col my-auto items-center justify-center gap-2 sm:gap-3 w-full h-full">
            <div className="relative w-[120px] sm:w-[150px] h-[40px] sm:h-[50px] flex items-center justify-center">
                <img
                    src="/assets/game/balls/white.svg"
                    alt="Bouncing ball 1"
                    className="absolute w-[25px] sm:w-[30px] h-[25px] sm:h-[30px] object-contain rounded-full animate-bounce-left"
                    style={{
                        transform: "translateX(-35px) translateY(0)",
                    }}
                />

                <img
                    src="/assets/game/balls/1.svg"
                    alt="Bouncing ball 2"
                    className="absolute w-[25px] sm:w-[30px] h-[25px] sm:h-[30px] object-contain rounded-full animate-bounce-center"
                    style={{
                        transform: "translateX(0) translateY(0)",
                    }}
                />

                <img
                    src="/assets/game/balls/black.svg"
                    alt="Bouncing ball 3"
                    className="absolute w-[25px] sm:w-[30px] h-[25px] sm:h-[30px] object-contain rounded-full animate-bounce-right"
                    style={{
                        transform: "translateX(35px) translateY(0)",
                    }}
                />
            </div>

            <div className="text-center">
                <h2 className="text-sm sm:text-base font-bold text-text mb-0.5">Finding Opponent{dots}</h2>
                <p className="text-[10px] sm:text-xs text-gray-300">Searching for players...</p>
            </div>

            <style>{`
                @keyframes bounce-left {
                    0%,
                    100% {
                        transform: translateX(-35px) translateY(0);
                    }
                    50% {
                        transform: translateX(-35px) translateY(-20px);
                    }
                }
                @keyframes bounce-center {
                    0%,
                    100% {
                        transform: translateX(0) translateY(0);
                    }
                    50% {
                        transform: translateX(0) translateY(-30px);
                    }
                }
                @keyframes bounce-right {
                    0%,
                    100% {
                        transform: translateX(35px) translateY(0);
                    }
                    50% {
                        transform: translateX(35px) translateY(-20px);
                    }
                }
                .animate-bounce-left {
                    animation: bounce-left 1.5s ease-in-out infinite;
                }
                .animate-bounce-center {
                    animation: bounce-center 1.5s ease-in-out infinite 0.25s;
                }
                .animate-bounce-right {
                    animation: bounce-right 1.5s ease-in-out infinite 0.5s;
                }
            `}</style>
        </div>
    );
}
