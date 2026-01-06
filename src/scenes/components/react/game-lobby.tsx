import { ShareIcon } from "lucide-react";
import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { INIT_DISCORD_SDK } from "../../../common/pool-constants";
import { Events } from "../../../common/server-types";
import type { Room } from "../../../server";
import type { MultiplayerService } from "../../../services/multiplayer-service";
import { Button } from "./ui/button";

export function Lobby({ service }: { service: MultiplayerService }) {
    const [room, setRoom] = React.useState<Room | null>(service.getCurrentRoom());

    useEffect(() => {
        const me = service.me();
        service.call(Events.JOIN_ROOM, { ...me, userId: me.id, roomId: service.getRoomId()! });

        service.subscribe(Events.UPDATE_ROOM, (data) => {
            setRoom(data);
            setVisible(true);
        });

        service.subscribe(Events.INIT, (data) => {
            setVisible(false);
        });
    }, []);
    const lobbyState = room?.isMatchMaking ? "matchmaking" : "lobby";
    const [visible, setVisible] = React.useState(!room?.isGameStarted);

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

    const players = room?.players ?? [];
    const me = service.me();
    const currentPlayer = me;

    const handleStartMatchmaking = () => {
        if (!room) return;
        if (currentPlayer?.id !== room.hostId) return alert("Only the host can start matchmaking");

        if (players.length >= 2) return;
        service.call(Events.MATCH_MAKE_START, { userId: currentPlayer.id, roomId: room.id });
    };

    const handleCancelMatchmaking = () => {
        if (!room || !currentPlayer) return;
        service.call(Events.MATCH_MAKE_CANCEL, { userId: currentPlayer.id, roomId: room.id });
    };
    const handleInvite = () => {
        if (INIT_DISCORD_SDK) {
            console.log("Opening invite dialog");
            service.discordSdk?.commands.openInviteDialog();
            return;
        }
        navigator.clipboard.writeText(window.location.href);
        service.showErrorModal({
            title: "Invite link copied to clipboard!",
            closeAfter: 1500,
        });
    };
    const currentPlayerIsHost = currentPlayer?.id === room?.hostId;
    const otherPlayer = players.find((p) => p.id !== currentPlayer?.id);

    const maxPlayers = 2;
    const emptySlots = maxPlayers - players.length;

    const handleStart = () => {
        if (!room) return;
        if (currentPlayer?.id !== room.hostId) return alert("Only the host can start the game");
        if (players.length < 2) return alert("At least 2 players are required");

        service.call(Events.START_GAME, { userId: currentPlayer.id, roomId: room.id });
    };
    const handleKickPlayer = (id: string) => {
        if (!currentPlayerIsHost || !currentPlayer || !room) return;
        service.call(Events.KICK_PLAYER, { userId: currentPlayer.id, roomId: room.id, kickTargetId: id });
    };
    const path = useLocation().pathname;
    return (
        visible && (
            <div className="relative flex flex-col gap-4 w-screen h-[100vh] bg-primary items-center justify-center p-2 md:p-4">
                {/* Main content */}
                <div className=" w-full  flex flex-col gap-4 ">
                    <div className="md:min-h-[25vh] min-h-[40vh]">
                        {lobbyState === "matchmaking" ? (
                            <MatchmakingAnimation />
                        ) : (
                            <div className="md:mt-20 flex-1 flex flex-col md:flex-row landscape:flex-row gap-3 md:gap-6 landscape:gap-4  items-center justify-center ">
                                <div className="flex-1 flex flex-col items-center justify-center gap-2 md:gap-4 landscape:gap-2 bg-black/20 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 md:p-8 landscape:p-3 border-2 border-emerald-600/30 shadow-xl max-w-xs w-full">
                                    <div className="relative">
                                        <img
                                            src={currentPlayer?.photo}
                                            className={`relative w-16 h-16 md:w-32 md:h-32 landscape:w-20 landscape:h-20 rounded-full shadow-lg border-2 md:border-4 landscape:border-3  border-emerald-400/50`}
                                            alt="Player 1"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <h2
                                            className={`text-base md:text-2xl landscape:text-lg font-bold  text-emerald-300`}
                                        >
                                            {currentPlayer?.name}
                                        </h2>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center flex-shrink-0">
                                    <div className="w-12 h-12 md:w-20 md:h-20 landscape:w-14 landscape:h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl border-2 md:border-4 landscape:border-3 border-amber-300">
                                        <span className="text-lg md:text-3xl landscape:text-xl font-bold text-amber-950">
                                            VS
                                        </span>
                                    </div>
                                </div>

                                <div className="relative flex-1 flex flex-col items-center justify-center gap-2 md:gap-4 landscape:gap-2 bg-black/20 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 md:p-8 landscape:p-3 border-2 border-emerald-600/30 shadow-xl max-w-xs w-full">
                                    {currentPlayerIsHost && otherPlayer && (
                                        <Button
                                            onClick={() => handleKickPlayer(otherPlayer?.id!)}
                                            variant="dark"
                                            className="absolute top-2 right-2 px-2! w-8! h-8!"
                                        >
                                            x
                                        </Button>
                                    )}

                                    <div className="relative">
                                        {otherPlayer ? (
                                            <img
                                                src={otherPlayer?.photo}
                                                className={`relative w-16 h-16 md:w-32 md:h-32 landscape:w-20 landscape:h-20 rounded-full shadow-lg border-2 md:border-4 landscape:border-3  border-emerald-400/50`}
                                                alt="Player 1"
                                            />
                                        ) : (
                                            <div className="relative w-16 h-16 md:w-32 md:h-32 landscape:w-20 landscape:h-20 rounded-full border-2 md:border-4 landscape:border-3 border-dashed border-emerald-400/50 shadow-lg flex items-center justify-center bg-emerald-950/50">
                                                <span className="text-2xl md:text-4xl landscape:text-3xl opacity-50">?</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <h2
                                            className={`text-base md:text-2xl landscape:text-lg font-bold text-emerald-300 
                                            `}
                                        >
                                            {otherPlayer?.name ?? "Waiting ..."}
                                        </h2>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className={`w-full flex items-center justify-center gap-2 md:gap-4   `}>
                        <Button
                            variant="secondary"
                            disabled={!currentPlayerIsHost || players.length >= 2}
                            onClick={() =>
                                lobbyState === "matchmaking" ? handleCancelMatchmaking() : handleStartMatchmaking()
                            }
                            className="landscape:w-full md:w-[16%]!"
                        >
                            {lobbyState === "matchmaking" ? "Cancel Matchmaking" : "Find Online Match"}
                        </Button>
                        <Button
                            disabled={!currentPlayerIsHost || players.length < 2}
                            onClick={handleStart}
                            variant="dark"
                            className="landscape:w-full md:w-[16%]!"
                        >
                            {currentPlayerIsHost ? "Start Game" : "Waiting for host to start..."}
                        </Button>
                        <Button
                            onClick={handleInvite}
                            variant="secondary"
                            className="landscape:w-auto md:w-auto! px-3 md:px-4!"
                        >
                            <ShareIcon />
                        </Button>
                    </div>
                </div>

                <Link to={path === "/lobby" ? "/" : `/lobby?room=${service.getRoomId()}`}>
                    <Button variant="dark" className="absolute bottom-4 min-w-[20vw] right-4">
                        {path === "/lobby" ? "Go Back" : "Start Game"}
                    </Button>
                </Link>
                <br />
                <br />
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
